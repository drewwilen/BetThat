import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { store } from '../store/authStore';

interface MarketOutcome {
  id: number;
  market_id: number;
  name: string;
  status: string;
  resolution_outcome: string | null;
  image_url: string | null;
}

interface Market {
  id: number;
  title: string;
  description: string | null;
  status: string;
  resolution_deadline: string;
  created_at: string;
  community_id: number;
  community_name?: string | null;
  community_image_url?: string | null;
  image_url?: string | null;
  upvotes?: number;
  downvotes?: number;
  outcomes?: string[];
  outcomes_detailed?: MarketOutcome[];
  last_traded_prices?: {
    yes?: number | null;
    no?: number | null;
  };
}

export default function Feed() {
  const user = store((state) => state.user);
  const [activeTab, setActiveTab] = useState<'discover' | 'holding'>('discover');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteStates, setVoteStates] = useState<Record<number, { upvotes: number; downvotes: number; userVote: string | null }>>({});
  const [outcomePrices, setOutcomePrices] = useState<Record<string, { yes: number | null; no: number | null }>>({});

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchMarkets();
    } else {
      fetchHoldingMarkets();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch vote states and outcome prices for all markets
    markets.forEach(market => {
      fetchVoteState(market.id);
      
      // Fetch prices for each outcome
      if (market.outcomes_detailed && market.outcomes_detailed.length > 0) {
        market.outcomes_detailed.forEach((outcome: MarketOutcome) => {
          fetchOutcomePrice(market.id, outcome.name);
        });
      } else if (market.outcomes && market.outcomes.length > 0) {
        market.outcomes.forEach(outcomeName => {
          fetchOutcomePrice(market.id, outcomeName);
        });
      } else {
        // Default outcome
        fetchOutcomePrice(market.id, 'default');
      }
    });
  }, [markets]);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/markets/');
      const marketsData = response.data;
      
      // Fetch detailed market data for each market to get outcomes_detailed
      const detailedMarkets = await Promise.all(
        marketsData.map(async (market: Market) => {
          try {
            const detailResponse = await api.get(`/markets/${market.id}`);
            return detailResponse.data;
          } catch (error) {
            console.error(`Failed to fetch details for market ${market.id}:`, error);
            return market;
          }
        })
      );
      
      setMarkets(detailedMarkets);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHoldingMarkets = async () => {
    if (!user) {
      setLoading(false);
      setMarkets([]);
      return;
    }

    try {
      setLoading(true);
      // Fetch user's positions
      const positionsResponse = await api.get('/portfolio/positions');
      const positions = positionsResponse.data || [];
      
      // Get unique market IDs from positions
      const marketIds = [...new Set(positions.map((p: any) => p.market_id))];
      
      if (marketIds.length === 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }
      
      // Fetch detailed market data for each market
      const detailedMarkets = await Promise.all(
        marketIds.map(async (marketId: number) => {
          try {
            const detailResponse = await api.get(`/markets/${marketId}`);
            return detailResponse.data;
          } catch (error) {
            console.error(`Failed to fetch details for market ${marketId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out nulls and sort by most recent activity
      const validMarkets = detailedMarkets.filter((m): m is Market => m !== null);
      setMarkets(validMarkets);
    } catch (error) {
      console.error('Failed to fetch holding markets:', error);
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutcomePrice = async (marketId: number, outcomeName: string) => {
    try {
      // Fetch YES orderbook to get best price
      const yesResponse = await api.get(`/trading/markets/${marketId}/orderbook`, {
        params: { outcome_name: outcomeName, outcome: 'yes' }
      });
      
      const yesBuys = yesResponse.data.buys || [];
      const yesPrice = yesBuys.length > 0 
        ? (typeof yesBuys[0].price === 'number' ? yesBuys[0].price : parseFloat(yesBuys[0].price || '0'))
        : null;
      
      const noPrice = yesPrice !== null ? (1 - yesPrice) : null;
      
      const priceKey = `${marketId}-${outcomeName}`;
      setOutcomePrices(prev => ({
        ...prev,
        [priceKey]: {
          yes: yesPrice,
          no: noPrice
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch price for ${outcomeName}:`, error);
    }
  };

  const fetchVoteState = async (marketId: number) => {
    try {
      const response = await api.get(`/markets/${marketId}/votes`);
      setVoteStates(prev => ({
        ...prev,
        [marketId]: {
          upvotes: response.data.upvotes,
          downvotes: response.data.downvotes,
          userVote: response.data.user_vote
        }
      }));
    } catch (error) {
      console.error('Failed to fetch vote state:', error);
    }
  };

  const handleVote = async (marketId: number, voteType: 'upvote' | 'downvote') => {
    try {
      await api.post(`/markets/${marketId}/vote`, { vote_type: voteType });
      // Refresh vote state only - no need to reload all markets
      await fetchVoteState(marketId);
    } catch (error: any) {
      if (error.response?.status === 200) {
        // Vote was removed (toggled off) - refresh vote state
        await fetchVoteState(marketId);
      } else {
        console.error('Failed to vote:', error);
      }
    }
  };

  const getPriceDisplay = (market: Market, outcomeName: string = 'default') => {
    // First check if we have a cached price for this specific outcome
    const priceKey = `${market.id}-${outcomeName}`;
    const cachedPrice = outcomePrices[priceKey];
    
    if (cachedPrice && cachedPrice.yes !== null) {
      const yesPrice = cachedPrice.yes;
      const noPrice = cachedPrice.no || (1 - yesPrice);
      return {
        yes: {
          cents: (yesPrice * 100).toFixed(0),
          decimalOdds: (1 / yesPrice).toFixed(2),
          percentage: (yesPrice * 100).toFixed(1),
          price: yesPrice
        },
        no: {
          cents: (noPrice * 100).toFixed(0),
          decimalOdds: (1 / noPrice).toFixed(2),
          percentage: (noPrice * 100).toFixed(1),
          price: noPrice
        }
      };
    }
    
    // Fallback to last_traded_prices for default outcome
    if (outcomeName === 'default' && market.last_traded_prices?.yes !== null && market.last_traded_prices?.yes !== undefined) {
      const yesPrice = market.last_traded_prices.yes;
      const noPrice = 1 - yesPrice;
      return {
        yes: {
          cents: (yesPrice * 100).toFixed(0),
          decimalOdds: (1 / yesPrice).toFixed(2),
          percentage: (yesPrice * 100).toFixed(1),
          price: yesPrice
        },
        no: {
          cents: (noPrice * 100).toFixed(0),
          decimalOdds: (1 / noPrice).toFixed(2),
          percentage: (noPrice * 100).toFixed(1),
          price: noPrice
        }
      };
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Feed</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-3 font-bold text-lg transition-all ${
              activeTab === 'discover'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('holding')}
            className={`px-6 py-3 font-bold text-lg transition-all ${
              activeTab === 'holding'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Currently Holding
          </button>
        </div>
        
        <p className="text-lg text-gray-700 font-medium">
          {activeTab === 'discover' 
            ? 'Discover markets from your communities' 
            : 'Markets you have positions in'}
        </p>
      </div>

      <div className="space-y-4">
        {markets.map((market) => {
          const displayImageUrl = market.image_url || market.community_image_url || null;
          const voteState = voteStates[market.id] || {
            upvotes: market.upvotes || 0,
            downvotes: market.downvotes || 0,
            userVote: null
          };
          
          // Get available outcomes (use outcomes_detailed if available, otherwise use outcomes list)
          const availableOutcomes = market.outcomes_detailed && market.outcomes_detailed.length > 0
            ? market.outcomes_detailed
            : (market.outcomes && market.outcomes.length > 0
                ? market.outcomes.map(name => ({ name, image_url: null }))
                : [{ name: 'default', image_url: null }]);
          
          return (
            <div
              key={market.id}
              className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all overflow-hidden"
            >
              {/* Market Image */}
              {displayImageUrl && (
                <div className="w-full h-32 overflow-hidden bg-gray-100">
                  <img 
                    src={displayImageUrl} 
                    alt={market.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="p-5">
                {/* Community Badge */}
                {market.community_name && (
                  <Link
                    to={`/communities/${market.community_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    {market.community_image_url && (
                      <img 
                        src={market.community_image_url} 
                        alt={market.community_name || ''}
                        className="w-4 h-4 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>{market.community_name}</span>
                  </Link>
                )}

                {/* Market Title */}
                <Link to={`/markets/${market.id}`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                    {market.title}
                  </h2>
                </Link>

                {/* Description */}
                {market.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{market.description}</p>
                )}

                {/* Outcomes Display - Side by Side */}
                <div className="mb-4">
                  {availableOutcomes.length > 1 ? (
                    // Multiple outcomes - show side by side (scrollable if more than 2)
                    <div className={availableOutcomes.length > 2 
                      ? "flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      : "grid grid-cols-2 gap-3"
                    }>
                      {availableOutcomes.map((outcome) => {
                        const outcomeName = typeof outcome === 'string' ? outcome : outcome.name;
                        const outcomeImage = typeof outcome === 'object' ? outcome.image_url : null;
                        const prices = getPriceDisplay(market, outcomeName);
                        
                        return (
                          <div
                            key={outcomeName}
                            className={`flex flex-col gap-2 ${
                              availableOutcomes.length > 2 ? 'min-w-[240px] flex-shrink-0' : ''
                            }`}
                          >
                            {/* Outcome Name and Image */}
                            <div className="text-center mb-1">
                              {outcomeImage && (
                                <div className="w-full aspect-square max-w-[80px] mx-auto mb-2 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-200 flex items-center justify-center">
                                  <img 
                                    src={outcomeImage} 
                                    alt={outcomeName}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div className="text-sm text-gray-800 font-bold uppercase tracking-wide">
                                {outcomeName}
                              </div>
                            </div>
                            
                            {/* YES/NO Cards */}
                            {prices ? (
                              <div className="flex gap-2">
                                <Link 
                                  to={`/markets/${market.id}`}
                                  className="flex-1 bg-gradient-to-br from-green-50 via-green-100 to-green-50 rounded-xl p-3 border-2 border-green-300 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs text-green-800 font-bold uppercase tracking-wide">YES</div>
                                    <div className="text-xs text-green-700 font-bold bg-green-200 px-2 py-0.5 rounded-full">{prices.yes.percentage}%</div>
                                  </div>
                                  <div className="text-2xl font-extrabold text-green-700 mb-1">
                                    {prices.yes.cents}¢
                                  </div>
                                  <div className="text-xs text-green-700 font-semibold">
                                    {prices.yes.decimalOdds}x odds
                                  </div>
                                </Link>
                                <Link 
                                  to={`/markets/${market.id}`}
                                  className="flex-1 bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-xl p-3 border-2 border-red-300 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs text-red-800 font-bold uppercase tracking-wide">NO</div>
                                    <div className="text-xs text-red-700 font-bold bg-red-200 px-2 py-0.5 rounded-full">{prices.no.percentage}%</div>
                                  </div>
                                  <div className="text-2xl font-extrabold text-red-700 mb-1">
                                    {prices.no.cents}¢
                                  </div>
                                  <div className="text-xs text-red-700 font-semibold">
                                    {prices.no.decimalOdds}x odds
                                  </div>
                                </Link>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <div className="flex-1 bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">YES</div>
                                  <div className="text-sm font-bold text-gray-400">No trades yet</div>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">NO</div>
                                  <div className="text-sm font-bold text-gray-400">No trades yet</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Single outcome (default YES/NO) - show traditional layout
                    (() => {
                      const prices = getPriceDisplay(market, 'default');
                      return prices ? (
                        <div className="flex gap-3 mb-4">
                          <Link 
                            to={`/markets/${market.id}`}
                            className="flex-1 bg-gradient-to-br from-green-50 via-green-100 to-green-50 rounded-xl p-4 border-2 border-green-300 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-green-800 font-bold uppercase tracking-wide">YES</div>
                              <div className="text-xs text-green-700 font-bold bg-green-200 px-2 py-0.5 rounded-full">{prices.yes.percentage}%</div>
                            </div>
                            <div className="flex items-baseline gap-2 mb-1">
                              <div className="text-4xl font-extrabold text-green-700">{prices.yes.cents}¢</div>
                            </div>
                            <div className="text-xs text-green-700 font-semibold">
                              {prices.yes.decimalOdds}x odds
                            </div>
                          </Link>
                          <Link 
                            to={`/markets/${market.id}`}
                            className="flex-1 bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-xl p-4 border-2 border-red-300 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-red-800 font-bold uppercase tracking-wide">NO</div>
                              <div className="text-xs text-red-700 font-bold bg-red-200 px-2 py-0.5 rounded-full">{prices.no.percentage}%</div>
                            </div>
                            <div className="flex items-baseline gap-2 mb-1">
                              <div className="text-4xl font-extrabold text-red-700">{prices.no.cents}¢</div>
                            </div>
                            <div className="text-xs text-red-700 font-semibold">
                              {prices.no.decimalOdds}x odds
                            </div>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex gap-3 mb-4">
                          <div className="flex-1 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">YES</div>
                            <div className="text-lg font-bold text-gray-400">No trades yet</div>
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">NO</div>
                            <div className="text-lg font-bold text-gray-400">No trades yet</div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Status and Deadline */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                    Resolves {new Date(market.resolution_deadline).toLocaleDateString()}
                  </span>
                </div>

                {/* Voting Section */}
                <div className="flex items-center gap-4 pt-4 border-t-2 border-gray-200">
                  <button
                    onClick={() => handleVote(market.id, 'upvote')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold ${
                      voteState.userVote === 'upvote'
                        ? 'bg-green-500 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-bold">{voteState.upvotes}</span>
                  </button>
                  
                  <button
                    onClick={() => handleVote(market.id, 'downvote')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold ${
                      voteState.userVote === 'downvote'
                        ? 'bg-red-500 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-bold">{voteState.downvotes}</span>
                  </button>

                  <Link
                    to={`/markets/${market.id}`}
                    className="ml-auto px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Trade →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {markets.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">
            {activeTab === 'discover' 
              ? 'No markets found' 
              : 'No positions yet'}
          </p>
          <p className="text-sm">
            {activeTab === 'discover' 
              ? 'Join a community to see markets in your feed!' 
              : 'Start trading to see your positions here!'}
          </p>
        </div>
      )}
      
      {activeTab === 'holding' && !user && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Please log in</p>
          <p className="text-sm">Log in to see your positions</p>
        </div>
      )}
    </div>
  );
}

