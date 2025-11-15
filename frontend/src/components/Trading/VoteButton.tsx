import { useState, useEffect } from 'react';
import api from '../../services/api';

interface VoteButtonProps {
  marketId: number;
  initialUpvotes?: number;
  initialDownvotes?: number;
  compact?: boolean;
}

export default function VoteButton({ marketId, initialUpvotes = 0, initialDownvotes = 0, compact = false }: VoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVoteState();
  }, [marketId]);

  const fetchVoteState = async () => {
    try {
      const response = await api.get(`/markets/${marketId}/votes`);
      setUpvotes(response.data.upvotes);
      setDownvotes(response.data.downvotes);
      setUserVote(response.data.user_vote);
    } catch (error) {
      console.error('Failed to fetch vote state:', error);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (loading) return;
    setLoading(true);
    
    try {
      await api.post(`/markets/${marketId}/vote`, { vote_type: voteType });
      await fetchVoteState();
    } catch (error: any) {
      if (error.response?.status === 200) {
        // Vote was removed (toggled off)
        await fetchVoteState();
      } else {
        console.error('Failed to vote:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote('upvote')}
          disabled={loading}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            userVote === 'upvote'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">{upvotes}</span>
        </button>
        
        <button
          onClick={() => handleVote('downvote')}
          disabled={loading}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            userVote === 'downvote'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">{downvotes}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote('upvote')}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold shadow-md ${
          userVote === 'upvote'
            ? 'bg-green-500 text-white border-2 border-green-600 hover:shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300 hover:shadow-sm'
        }`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-extrabold">{upvotes}</span>
      </button>
      
      <button
        onClick={() => handleVote('downvote')}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold shadow-md ${
          userVote === 'downvote'
            ? 'bg-red-500 text-white border-2 border-red-600 hover:shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300 hover:shadow-sm'
        }`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-extrabold">{downvotes}</span>
      </button>
    </div>
  );
}
