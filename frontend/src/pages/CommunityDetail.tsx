import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

interface Community {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  invite_code: string;
  admin_id: number;
  created_at: string;
}

interface Market {
  id: number;
  title: string;
  description: string | null;
  status: string;
  resolution_deadline: string;
  created_at: string;
}

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [marketTitle, setMarketTitle] = useState('');
  const [marketDescription, setMarketDescription] = useState('');
  const [resolutionDeadline, setResolutionDeadline] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>(['']);

  useEffect(() => {
    if (id) {
      fetchCommunity();
      fetchMarkets();
    }
  }, [id]);

  const fetchCommunity = async () => {
    try {
      const response = await api.get(`/communities/${id}`);
      setCommunity(response.data);
    } catch (error) {
      console.error('Failed to fetch community:', error);
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await api.get('/markets/', {
        params: { community_id: id },
      });
      setMarkets(response.data);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/communities/join', { invite_code: inviteCode });
      setShowJoin(false);
      fetchCommunity();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to join community');
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty outcomes
      const validOutcomes = outcomes.filter(outcome => outcome.trim() !== '');
      
      // If no outcomes specified, use default yes/no
      const marketOutcomes = validOutcomes.length > 0 ? validOutcomes : undefined;

      await api.post('/markets/', {
        community_id: id,
        title: marketTitle,
        description: marketDescription,
        resolution_deadline: resolutionDeadline,
        outcomes: marketOutcomes,
      });
      setShowCreate(false);
      setMarketTitle('');
      setMarketDescription('');
      setResolutionDeadline('');
      setOutcomes(['']);
      fetchMarkets();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create market');
    }
  };

  const addOutcomeField = () => {
    setOutcomes([...outcomes, '']);
  };

  const removeOutcomeField = (index: number) => {
    if (outcomes.length > 1) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!community) {
    return <div className="text-center py-12">Community not found</div>;
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-6">
        <Link to="/communities" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Communities
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{community.name}</h1>
        {community.description && (
          <p className="text-gray-600 mb-4">{community.description}</p>
        )}
        <div className="flex items-center space-x-4">
          <span
            className={`px-3 py-1 rounded text-sm ${
              community.is_public
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {community.is_public ? 'Public' : 'Private'}
          </span>
          {!community.is_public && (
            <div className="text-sm text-gray-600">
              Invite Code: <span className="font-mono font-bold">{community.invite_code}</span>
            </div>
          )}
        </div>
      </div>

      {showJoin && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Join Community</h2>
          <form onSubmit={handleJoin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                />
              </div>
              <button type="submit" className="btn-primary">
                Join
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Markets</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary"
        >
          {showCreate ? 'Cancel' : 'Create Market'}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Create Market</h2>
          <form onSubmit={handleCreateMarket}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={marketTitle}
                  onChange={(e) => setMarketTitle(e.target.value)}
                  placeholder="e.g., Will John be on time for class?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={marketDescription}
                  onChange={(e) => setMarketDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Deadline
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={resolutionDeadline}
                  onChange={(e) => setResolutionDeadline(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outcomes (Optional - leave blank for default yes/no market)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Specify multiple outcomes for this market (e.g., "Team A", "Team B", "Team C"). 
                  If left empty, the market will use default yes/no.
                </p>
                {outcomes.map((outcome, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      value={outcome}
                      onChange={(e) => updateOutcome(index, e.target.value)}
                      placeholder={`Outcome ${index + 1} (e.g., Team A, Player B)`}
                    />
                    {outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutcomeField(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOutcomeField}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Add Outcome
                </button>
              </div>
              <button type="submit" className="btn-primary">
                Create Market
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/markets/${market.id}`}
            className="card hover:shadow-lg transition-shadow block"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">{market.title}</h3>
            {market.description && (
              <p className="text-gray-600 mb-4">{market.description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span
                className={`px-2 py-1 rounded ${
                  market.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : market.status === 'resolved'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {market.status}
              </span>
              <span className="text-gray-500">
                Resolves: {new Date(market.resolution_deadline).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {markets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No markets in this community yet. Create one to get started!
        </div>
      )}
    </div>
  );
}

