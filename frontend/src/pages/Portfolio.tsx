import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

interface Position {
  id: number;
  market_id: number;
  outcome_name: string;
  outcome: string;
  quantity: number | string;
  average_price: number | string;
  total_cost: number | string;
  current_value?: number | string;
  profit_loss?: number | string;
  payout?: number | string;
  payout_if_right?: number | string;
  last_traded_price?: number | string;
  last_traded?: string;
  updated_at: string;
  market?: {
    id: number;
    title: string;
    status: string;
    resolution_outcome?: string | null;
  };
}

interface PortfolioSummary {
  total_positions: number;
  total_current_value: number | string;
  total_profit_loss: number | string;
  total_invested: number | string;
  available_cash: number | string;
  locked_in_bets: number | string;
  total_value: number | string;
}

// Color palette for different outcome names
const outcomeColors = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300' },
];

// Get color for outcome name
const getOutcomeColor = (outcomeName: string): typeof outcomeColors[0] => {
  if (!outcomeName || outcomeName === 'default') {
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }
  // Simple hash to consistently assign colors
  let hash = 0;
  for (let i = 0; i < outcomeName.length; i++) {
    hash = outcomeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return outcomeColors[Math.abs(hash) % outcomeColors.length];
};

export default function Portfolio() {
  const { marketId } = useParams<{ marketId?: string }>();
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcomeName, setFilterOutcomeName] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last_traded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (marketId) {
      fetchMarketPositions(parseInt(marketId));
    } else {
      fetchAllPositions();
      fetchSummary();
    }
  }, [marketId]);

  const fetchAllPositions = async () => {
    try {
      const response = await api.get('/portfolio/positions');
      const converted = response.data.map((pos: any) => ({
        ...pos,
        quantity: typeof pos.quantity === 'number' ? pos.quantity : parseFloat(pos.quantity || '0'),
        average_price: typeof pos.average_price === 'number' ? pos.average_price : parseFloat(pos.average_price || '0'),
        total_cost: typeof pos.total_cost === 'number' ? pos.total_cost : parseFloat(pos.total_cost || '0'),
        current_value: pos.current_value ? (typeof pos.current_value === 'number' ? pos.current_value : parseFloat(pos.current_value || '0')) : null,
        profit_loss: pos.profit_loss !== null && pos.profit_loss !== undefined 
          ? (typeof pos.profit_loss === 'number' ? pos.profit_loss : parseFloat(pos.profit_loss || '0'))
          : null,
        payout: pos.payout !== null && pos.payout !== undefined
          ? (typeof pos.payout === 'number' ? pos.payout : parseFloat(pos.payout || '0'))
          : null,
        payout_if_right: pos.payout_if_right !== null && pos.payout_if_right !== undefined
          ? (typeof pos.payout_if_right === 'number' ? pos.payout_if_right : parseFloat(pos.payout_if_right || '0'))
          : null,
        last_traded_price: pos.last_traded_price !== null && pos.last_traded_price !== undefined
          ? (typeof pos.last_traded_price === 'number' ? pos.last_traded_price : parseFloat(pos.last_traded_price || '0'))
          : null,
        market: pos.market || null,
      }));
      setPositions(converted);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPositions = async (id: number) => {
    try {
      const response = await api.get(`/portfolio/positions/${id}`);
      const converted = response.data.map((pos: any) => ({
        ...pos,
        quantity: typeof pos.quantity === 'number' ? pos.quantity : parseFloat(pos.quantity || '0'),
        average_price: typeof pos.average_price === 'number' ? pos.average_price : parseFloat(pos.average_price || '0'),
        total_cost: typeof pos.total_cost === 'number' ? pos.total_cost : parseFloat(pos.total_cost || '0'),
        current_value: pos.current_value ? (typeof pos.current_value === 'number' ? pos.current_value : parseFloat(pos.current_value || '0')) : null,
        profit_loss: pos.profit_loss !== null && pos.profit_loss !== undefined 
          ? (typeof pos.profit_loss === 'number' ? pos.profit_loss : parseFloat(pos.profit_loss || '0'))
          : null,
        payout: pos.payout !== null && pos.payout !== undefined
          ? (typeof pos.payout === 'number' ? pos.payout : parseFloat(pos.payout || '0'))
          : null,
        payout_if_right: pos.payout_if_right !== null && pos.payout_if_right !== undefined
          ? (typeof pos.payout_if_right === 'number' ? pos.payout_if_right : parseFloat(pos.payout_if_right || '0'))
          : null,
        last_traded_price: pos.last_traded_price !== null && pos.last_traded_price !== undefined
          ? (typeof pos.last_traded_price === 'number' ? pos.last_traded_price : parseFloat(pos.last_traded_price || '0'))
          : null,
        market: pos.market || null,
      }));
      setPositions(converted);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/portfolio/summary');
      const data = response.data;
      setSummary({
        total_positions: data.total_positions,
        total_current_value: typeof data.total_current_value === 'number' 
          ? data.total_current_value 
          : parseFloat(data.total_current_value || '0'),
        total_profit_loss: typeof data.total_profit_loss === 'number'
          ? data.total_profit_loss
          : parseFloat(data.total_profit_loss || '0'),
        total_invested: typeof data.total_invested === 'number'
          ? data.total_invested
          : parseFloat(data.total_invested || '0'),
        available_cash: typeof data.available_cash === 'number'
          ? data.available_cash
          : parseFloat(data.available_cash || '0'),
        locked_in_bets: typeof data.locked_in_bets === 'number'
          ? data.locked_in_bets
          : parseFloat(data.locked_in_bets || '0'),
        total_value: typeof data.total_value === 'number'
          ? data.total_value
          : parseFloat(data.total_value || '0'),
      });
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  // Get unique outcome names for filter
  const uniqueOutcomeNames = useMemo(() => {
    const names = new Set<string>();
    positions.forEach(pos => {
      if (pos.outcome_name && pos.outcome_name !== 'default') {
        names.add(pos.outcome_name);
      }
    });
    return Array.from(names).sort();
  }, [positions]);

  // Filter and sort positions
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = [...positions];

    // Search by market name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pos => 
        pos.market?.title?.toLowerCase().includes(query)
      );
    }

    // Filter by outcome name
    if (filterOutcomeName !== 'all') {
      filtered = filtered.filter(pos => pos.outcome_name === filterOutcomeName);
    }

    // Filter by side (Yes/No)
    if (filterSide !== 'all') {
      filtered = filtered.filter(pos => pos.outcome === filterSide);
    }

    // Filter by status (Active/Resolved)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(pos => {
        if (filterStatus === 'active') {
          return pos.market?.status === 'active';
        } else if (filterStatus === 'resolved') {
          return pos.market?.status === 'resolved';
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'market':
          aVal = a.market?.title || '';
          bVal = b.market?.title || '';
          break;
        case 'last_traded':
          aVal = a.last_traded ? new Date(a.last_traded).getTime() : 0;
          bVal = b.last_traded ? new Date(b.last_traded).getTime() : 0;
          break;
        case 'total_return':
          aVal = a.profit_loss !== null && a.profit_loss !== undefined 
            ? (typeof a.profit_loss === 'number' ? a.profit_loss : parseFloat(a.profit_loss || '0'))
            : 0;
          bVal = b.profit_loss !== null && b.profit_loss !== undefined
            ? (typeof b.profit_loss === 'number' ? b.profit_loss : parseFloat(b.profit_loss || '0'))
            : 0;
          break;
        case 'cost':
          aVal = typeof a.total_cost === 'number' ? a.total_cost : parseFloat(a.total_cost || '0');
          bVal = typeof b.total_cost === 'number' ? b.total_cost : parseFloat(b.total_cost || '0');
          break;
        case 'market_value':
          aVal = a.current_value 
            ? (typeof a.current_value === 'number' ? a.current_value : parseFloat(a.current_value || '0'))
            : 0;
          bVal = b.current_value
            ? (typeof b.current_value === 'number' ? b.current_value : parseFloat(b.current_value || '0'))
            : 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [positions, searchQuery, filterOutcomeName, filterSide, filterStatus, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {marketId ? 'Market Portfolio' : 'My Portfolio'}
      </h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-600">Cash</div>
            <div className="text-2xl font-bold text-green-600">
              {typeof summary.available_cash === 'number' 
                ? summary.available_cash.toFixed(2) 
                : parseFloat(summary.available_cash || '0').toFixed(2)} tokens
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Open Position Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {typeof summary.locked_in_bets === 'number'
                ? summary.locked_in_bets.toFixed(2)
                : parseFloat(summary.locked_in_bets || '0').toFixed(2)} tokens
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Total Equity</div>
            <div className="text-2xl font-bold">
              {typeof summary.total_value === 'number'
                ? summary.total_value.toFixed(2)
                : parseFloat(summary.total_value || '0').toFixed(2)} tokens
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cash + Open Position Value
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold">Positions</h2>
          
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            
            {/* Outcome Name Filter */}
            {uniqueOutcomeNames.length > 0 && (
              <select
                value={filterOutcomeName}
                onChange={(e) => setFilterOutcomeName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Outcomes</option>
                {uniqueOutcomeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            
            {/* Side Filter */}
            <select
              value={filterSide}
              onChange={(e) => setFilterSide(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Sides</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
            
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="last_traded-desc">Last Traded (Newest)</option>
              <option value="last_traded-asc">Last Traded (Oldest)</option>
              <option value="total_return-desc">Total Return (High to Low)</option>
              <option value="total_return-asc">Total Return (Low to High)</option>
              <option value="market-asc">Market (A-Z)</option>
              <option value="market-desc">Market (Z-A)</option>
              <option value="cost-desc">Cost (High to Low)</option>
              <option value="cost-asc">Cost (Low to High)</option>
              <option value="market_value-desc">Market Value (High to Low)</option>
              <option value="market_value-asc">Market Value (Low to High)</option>
            </select>
            
            {/* Clear Filters */}
            {(searchQuery || filterOutcomeName !== 'all' || filterSide !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterOutcomeName('all');
                  setFilterSide('all');
                  setFilterStatus('all');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No positions yet</div>
        ) : filteredAndSortedPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No positions match your filters. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="mb-2 text-sm text-gray-600">
            Showing {filteredAndSortedPositions.length} of {positions.length} positions
          </div>
        )}
        
        {filteredAndSortedPositions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Market</th>
                  <th className="text-left py-3 px-2">Last traded</th>
                  <th className="text-left py-3 px-2">Outcome</th>
                  <th className="text-right py-3 px-2">Contracts</th>
                  <th className="text-right py-3 px-2">Avg price</th>
                  <th className="text-right py-3 px-2">Cost</th>
                  <th className="text-right py-3 px-2">Payout if right</th>
                  <th className="text-right py-3 px-2">Market value</th>
                  <th className="text-right py-3 px-2">Total return</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPositions.map((position) => {
                  const quantity = typeof position.quantity === 'number' ? position.quantity : parseFloat(position.quantity || '0');
                  const avgPrice = typeof position.average_price === 'number' ? position.average_price : parseFloat(position.average_price || '0');
                  const rawCostBasis = typeof position.total_cost === 'number' ? position.total_cost : parseFloat(position.total_cost || '0');
                  const rawCurrentValue = position.current_value 
                    ? (typeof position.current_value === 'number' ? position.current_value : parseFloat(position.current_value || '0'))
                    : null;
                  const rawProfitLoss = position.profit_loss !== null && position.profit_loss !== undefined
                    ? (typeof position.profit_loss === 'number' ? position.profit_loss : parseFloat(position.profit_loss || '0'))
                    : null;
                  const payoutIfRight = position.payout_if_right !== null && position.payout_if_right !== undefined
                    ? (typeof position.payout_if_right === 'number' ? position.payout_if_right : parseFloat(position.payout_if_right || '0'))
                    : null;
                  
                  // Display logic: BUY (long) vs SELL (short)
                  const isLong = quantity > 0;
                  
                  // For BUY (long): cost is negative (spent), value is positive
                  // For SELL (short): cost is positive (received), value is negative (liability)
                  const displayCost = isLong ? -Math.abs(rawCostBasis) : Math.abs(rawCostBasis);
                  const displayValue = rawCurrentValue !== null ? rawCurrentValue : null;
                  const displayProfitLoss = rawProfitLoss !== null ? rawProfitLoss : null;
                  
                  const outcomeColor = getOutcomeColor(position.outcome_name);

                  return (
                    <tr key={position.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        {position.market ? (
                          <Link 
                            to={`/markets/${position.market_id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {position.market.title}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Market {position.market_id}</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {position.last_traded_price !== null && position.last_traded_price !== undefined ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">
                              {((typeof position.last_traded_price === 'number' 
                                ? position.last_traded_price 
                                : parseFloat(position.last_traded_price || '0')) * 100).toFixed(2)}%
                            </span>
                            {(() => {
                              const lastPrice = typeof position.last_traded_price === 'number' 
                                ? position.last_traded_price 
                                : parseFloat(position.last_traded_price || '0');
                              const avgPrice = typeof position.average_price === 'number' 
                                ? position.average_price 
                                : parseFloat(position.average_price || '0');
                              const diff = lastPrice - avgPrice;
                              const isLong = quantity > 0;
                              // For long positions: green if price went up, red if down
                              // For short positions: opposite (green if price went down, red if up)
                              const isGood = isLong ? diff > 0 : diff < 0;
                              
                              return (
                                <span className={`text-xs ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                                  {isGood ? '↑' : '↓'} {Math.abs(diff * 100).toFixed(2)}%
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {position.outcome_name && position.outcome_name !== 'default' && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${outcomeColor.bg} ${outcomeColor.text} border ${outcomeColor.border}`}>
                              {position.outcome_name}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            position.outcome === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {position.outcome.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {Math.abs(quantity).toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {(avgPrice * 100).toFixed(2)}%
                      </td>
                      <td className={`text-right py-3 px-2 font-medium ${
                        displayCost < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {displayCost.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {payoutIfRight !== null && payoutIfRight !== undefined
                          ? payoutIfRight.toFixed(2)
                          : 'N/A'}
                      </td>
                      <td className={`text-right py-3 px-2 font-medium ${
                        displayValue !== null && displayValue < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {displayValue !== null 
                          ? displayValue.toFixed(2)
                          : '—'}
                      </td>
                      <td className={`text-right py-3 px-2 font-semibold ${
                        displayProfitLoss !== null && displayProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {displayProfitLoss !== null 
                          ? (displayProfitLoss >= 0 ? '+' : '') + displayProfitLoss.toFixed(2)
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
