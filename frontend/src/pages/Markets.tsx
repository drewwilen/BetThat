import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Market {
  id: number;
  title: string;
  description: string | null;
  status: string;
  resolution_deadline: string;
  created_at: string;
  community_id: number;
  community_name?: string | null;
}

export default function Markets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await api.get('/markets/');
      setMarkets(response.data);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">All Markets</h1>

      <div className="space-y-4">
        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/markets/${market.id}`}
            className="card hover:shadow-lg transition-shadow block"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900 flex-1">{market.title}</h2>
              {market.community_name && (
                <Link
                  to={`/communities/${market.community_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium hover:bg-primary-200 transition-colors"
                >
                  {market.community_name}
                </Link>
              )}
            </div>
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
          No markets found. Join a community to see markets!
        </div>
      )}
    </div>
  );
}

