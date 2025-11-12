import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/communities/');
      setCommunities(response.data);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/communities/', {
        name,
        description,
        is_public: isPublic,
        image_url: imageUrl || undefined,
      });
      setCommunities([response.data, ...communities]);
      setShowCreate(false);
      setName('');
      setDescription('');
      setImageUrl('');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create community');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/communities/join', { invite_code: inviteCode });
      setShowJoin(false);
      setInviteCode('');
      fetchCommunities(); // Refresh list to show joined community
      alert('Successfully joined community!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to join community');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Communities</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setShowJoin(!showJoin);
              setShowCreate(false);
            }}
            className="btn-secondary"
          >
            {showJoin ? 'Cancel' : 'Join with Code'}
          </button>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setShowJoin(false);
            }}
            className="btn-primary"
          >
            {showCreate ? 'Cancel' : 'Create Community'}
          </button>
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

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Create Community</h2>
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Public community
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add a logo or image for this community
                </p>
              </div>
              <button type="submit" className="btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((community) => (
          <Link
            key={community.id}
            to={`/communities/${community.id}`}
            className="card hover:shadow-lg transition-shadow"
          >
            {community.image_url && (
              <div className="mb-3">
                <img 
                  src={community.image_url} 
                  alt={community.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {community.name}
            </h2>
            {community.description && (
              <p className="text-gray-600 mb-4">{community.description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span
                className={`px-2 py-1 rounded ${
                  community.is_public
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {community.is_public ? 'Public' : 'Private'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {communities.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No communities found. Create one to get started!
        </div>
      )}
    </div>
  );
}

