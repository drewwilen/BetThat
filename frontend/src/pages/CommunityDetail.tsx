import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { store } from '../store/authStore';

interface Community {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  invite_code: string;
  admin_id: number;
  created_at: string;
  image_url?: string | null;
}

interface Market {
  id: number;
  title: string;
  description: string | null;
  status: string;
  resolution_deadline: string;
  created_at: string;
  image_url?: string | null;
}

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [marketTitle, setMarketTitle] = useState('');
  const [marketDescription, setMarketDescription] = useState('');
  const [resolutionDeadline, setResolutionDeadline] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [marketImageUrl, setMarketImageUrl] = useState('');
  const [outcomeImages, setOutcomeImages] = useState<Record<string, string>>({});

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
      // Initialize edit form with current values
      setEditName(response.data.name);
      setEditDescription(response.data.description || '');
      setEditImageUrl(response.data.image_url || '');
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: any = {};
      if (editName !== community?.name) updateData.name = editName;
      if (editDescription !== (community?.description || '')) updateData.description = editDescription;
      if (editImageUrl !== (community?.image_url || '')) updateData.image_url = editImageUrl || null;
      
      await api.put(`/communities/${id}`, updateData);
      setShowEdit(false);
      fetchCommunity();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update community');
    }
  };

  const handleDelete = async () => {
    if (!community) return;
    
    const confirmMessage = `Are you sure you want to delete "${community.name}"? This action cannot be undone and will delete all markets in this community.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      await api.delete(`/communities/${id}`);
      // Redirect to communities list after deletion
      navigate('/communities');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete community');
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
        image_url: marketImageUrl || undefined,
        outcome_images: Object.keys(outcomeImages).length > 0 ? outcomeImages : undefined,
      });
      setShowCreate(false);
      setMarketTitle('');
      setMarketDescription('');
      setResolutionDeadline('');
      setOutcomes(['']);
      setMarketImageUrl('');
      setOutcomeImages({});
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

  const updateOutcomeImage = (outcomeName: string, imageUrl: string) => {
    setOutcomeImages(prev => ({
      ...prev,
      [outcomeName]: imageUrl
    }));
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
          &larr; Back to Communities
        </Link>
        <div className="flex items-start gap-4">
          {community.image_url && (
            <img 
              src={community.image_url} 
              alt={community.name}
              className="w-24 h-24 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{community.name}</h1>
              {store.getState().user?.id === community.admin_id && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Edit
                </button>
              )}
            </div>
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

      {showEdit && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Edit Community</h2>
          <form onSubmit={handleEdit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Community name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Community description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add or update the community logo/image
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    // Reset form to current values
                    if (community) {
                      setEditName(community.name);
                      setEditDescription(community.description || '');
                      setEditImageUrl(community.image_url || '');
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </form>
          <div className="border-t pt-4 mt-4 px-4 pb-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete Community
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will permanently delete the community and all its markets
            </p>
          </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Market Image URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={marketImageUrl}
                  onChange={(e) => setMarketImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add a thumbnail image for this market
                </p>
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
                  <div key={index} className="mb-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
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
                    {outcome.trim() && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Image URL for "{outcome}" (Optional)
                        </label>
                        <input
                          type="url"
                          className="input-field text-sm"
                          value={outcomeImages[outcome] || ''}
                          onChange={(e) => updateOutcomeImage(outcome, e.target.value)}
                          placeholder="https://example.com/team-a-logo.png"
                        />
                      </div>
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
            {market.image_url && (
              <div className="mb-3">
                <img 
                  src={market.image_url} 
                  alt={market.title}
                  className="w-full h-40 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
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

