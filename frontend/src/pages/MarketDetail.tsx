import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { WebSocketClient } from '../services/websocket';
import { store } from '../store/authStore';
import Orderbook from '../components/Trading/Orderbook';
import OrderForm from '../components/Trading/OrderForm';
import TradeHistory from '../components/Trading/TradeHistory';

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
  resolution_outcome: string | null;
  community_id: number;
  created_at: string;
  is_admin?: boolean;
  community_name?: string | null;
  outcomes?: string[]; // List of outcome names (e.g., ["Team A", "Team B"] or ["yes", "no"])
  outcomes_detailed?: MarketOutcome[]; // Full outcome details
}

interface OrderBookEntry {
  price: number | string;
  quantity: number | string;
  order_id?: number | null;
  user_id?: number | null;
}

interface OrderBook {
  buys: OrderBookEntry[];
  sells: OrderBookEntry[];
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const user = store((state) => state.user);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutcomeName, setSelectedOutcomeName] = useState<string>('default');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  // Store orderbooks by outcome_name and outcome (yes/no)
  const [orderbooks, setOrderbooks] = useState<Record<string, { yes: OrderBook; no: OrderBook }>>({});
  // Store both YES and NO orderbooks for the selected outcome_name
  const [yesOrderbook, setYesOrderbook] = useState<OrderBook>({ buys: [], sells: [] });
  const [noOrderbook, setNoOrderbook] = useState<OrderBook>({ buys: [], sells: [] });
  const wsClientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (id) {
      fetchMarket();
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedOutcomeName) {
      fetchOrderbooks();
      fetchBothOrderbooks(); // Fetch both YES and NO orderbooks
    }
  }, [id, selectedOutcomeName]);

  const fetchBothOrderbooks = async () => {
    if (!id || !selectedOutcomeName) return;
    
    try {
      // Fetch YES orderbook
      const yesResponse = await api.get(`/trading/markets/${id}/orderbook`, {
        params: { outcome_name: selectedOutcomeName, outcome: 'yes' }
      });
      
      // Fetch NO orderbook
      const noResponse = await api.get(`/trading/markets/${id}/orderbook`, {
        params: { outcome_name: selectedOutcomeName, outcome: 'no' }
      });
      
      // Convert Decimal strings to numbers and preserve order_id/user_id
      const convertEntries = (entries: any[]) => {
        return entries.map(entry => ({
          price: typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0'),
          quantity: typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0'),
          order_id: entry.order_id || null,
          user_id: entry.user_id || null,
        }));
      };
      
      setYesOrderbook({
        buys: convertEntries(yesResponse.data.buys || []),
        sells: convertEntries(yesResponse.data.sells || [])
      });
      
      setNoOrderbook({
        buys: convertEntries(noResponse.data.buys || []),
        sells: convertEntries(noResponse.data.sells || [])
      });
    } catch (error) {
      console.error('Failed to fetch orderbooks:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (id && token) {
      // Clean up previous connection
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
      
      const client = new WebSocketClient(parseInt(id));
      client.connect(
        (data) => {
          if (data.type === 'orderbook_update') {
            // Convert Decimal strings to numbers and preserve order_id/user_id
            const convertEntries = (entries: any[]) => {
              return entries.map(entry => ({
                price: typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0'),
                quantity: typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0'),
                order_id: entry.order_id || null,
                user_id: entry.user_id || null,
              }));
            };
            
            // Handle orderbook updates for specific outcome_name and outcome
            const outcomeName = data.outcome_name || 'default';
            const outcome = data.outcome;
            
            if (outcome === 'yes' || outcome === 'no') {
              const convertedData = {
                buys: convertEntries(data.buys || []),
                sells: convertEntries(data.sells || [])
              };
              
              // Update the orderbooks state
              setOrderbooks(prev => ({
                ...prev,
                [outcomeName]: {
                  ...prev[outcomeName],
                  [outcome]: convertedData
                }
              }));
              
              // Update the separate YES/NO orderbooks if this is the selected outcome_name
              // Always update regardless of which outcome_name (for simplicity)
              if (outcomeName === selectedOutcomeName) {
                if (outcome === 'yes') {
                  setYesOrderbook(convertedData);
                } else if (outcome === 'no') {
                  setNoOrderbook(convertedData);
                }
              }
            }
          }
        },
        (error) => {
          // Only log if it's not a normal closure
          if (error.target?.readyState !== WebSocket.CLOSED) {
            console.error('WebSocket error:', error);
          }
        }
      );
      wsClientRef.current = client;
      return () => {
        if (wsClientRef.current) {
          wsClientRef.current.disconnect();
          wsClientRef.current = null;
        }
      };
    }
  }, [id]);

  const fetchMarket = async () => {
    try {
      const response = await api.get(`/markets/${id}`);
      const marketData = response.data;
      setMarket(marketData);
      
      // Set initial selected outcome based on available outcomes
      if (marketData.outcomes && marketData.outcomes.length > 0) {
        // Use first outcome if available
        const firstOutcome = marketData.outcomes[0];
        if (firstOutcome !== 'default') {
          setSelectedOutcomeName(firstOutcome);
        } else {
          setSelectedOutcomeName('default');
        }
      }
    } catch (error) {
      console.error('Failed to fetch market:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderbooks = async () => {
    if (!id || !selectedOutcomeName) return;
    try {
      const [yesResponse, noResponse] = await Promise.all([
        api.get(`/trading/markets/${id}/orderbook`, {
          params: { outcome_name: selectedOutcomeName, outcome: 'yes' }
        }),
        api.get(`/trading/markets/${id}/orderbook`, {
          params: { outcome_name: selectedOutcomeName, outcome: 'no' }
        }),
      ]);
      
      // Convert Decimal strings to numbers and preserve order_id/user_id
      const convertEntries = (entries: any[]) => {
        return entries.map(entry => ({
          price: typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0'),
          quantity: typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0'),
          order_id: entry.order_id || null,
          user_id: entry.user_id || null,
        }));
      };
      
      // Update orderbooks state for this outcome_name
      setOrderbooks(prev => ({
        ...prev,
        [selectedOutcomeName]: {
          yes: {
            buys: convertEntries(yesResponse.data.buys || []),
            sells: convertEntries(yesResponse.data.sells || [])
          },
          no: {
            buys: convertEntries(noResponse.data.buys || []),
            sells: convertEntries(noResponse.data.sells || [])
          }
        }
      }));
    } catch (error) {
      console.error('Failed to fetch orderbooks:', error);
    }
  };

  const handleOrderPlaced = () => {
    fetchOrderbooks();
    fetchBothOrderbooks(); // Also refresh both orderbooks
  };

  const handleOrderCancel = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    
    try {
      await api.post(`/trading/orders/${orderId}/cancel`);
      fetchOrderbooks(); // Refresh orderbook
      fetchBothOrderbooks(); // Refresh both YES and NO orderbooks
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const handleResolve = async (outcome: 'yes' | 'no') => {
    const outcomeName = selectedOutcomeName || 'default';
    if (!confirm(`Are you sure you want to resolve "${outcomeName}" as ${outcome.toUpperCase()}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Use per-outcome resolution endpoint for new markets, legacy endpoint for old markets
      if (availableOutcomes.length > 1 || availableOutcomes[0] !== 'default') {
        await api.post(`/markets/${id}/outcomes/${outcomeName}/resolve`, { outcome });
      } else {
        await api.post(`/markets/${id}/resolve`, { outcome });
      }
      fetchMarket(); // Refresh to show resolved status
      alert(`"${outcomeName}" resolved as ${outcome.toUpperCase()}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to resolve market');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!market) {
    return <div className="text-center py-12">Market not found</div>;
  }

  // Get current orderbook based on selected outcome_name and outcome
  const currentOrderbook = orderbooks[selectedOutcomeName]?.[selectedOutcome] || { buys: [], sells: [] };
  
  // Get available outcome names (or default to ["default"])
  const availableOutcomes = market?.outcomes && market.outcomes.length > 0 
    ? market.outcomes 
    : ['default'];

  return (
    <div className="px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{market.title}</h1>
          {market.community_name && (
            <Link
              to={`/communities/${market.community_id}`}
              className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              {market.community_name}
            </Link>
          )}
        </div>
        {market.description && (
          <p className="text-gray-600 mb-4">{market.description}</p>
        )}
        <div className="flex items-center space-x-4">
          <span
            className={`px-3 py-1 rounded text-sm ${
              market.status === 'active'
                ? 'bg-green-100 text-green-800'
                : market.status === 'resolved'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {market.status}
          </span>
          {market.resolution_outcome && (
            <span className="text-sm font-medium text-gray-700">
              Outcome: {market.resolution_outcome.toUpperCase()}
            </span>
          )}
          <span className="text-sm text-gray-500">
            Resolves: {new Date(market.resolution_deadline).toLocaleString()}
          </span>
        </div>
        {market.status === 'active' && market.is_admin && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Admin Actions</h3>
            <p className="text-sm text-yellow-700 mb-2">
              Resolve <strong>{selectedOutcomeName}</strong>:
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleResolve('yes')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Resolve as YES
              </button>
              <button
                onClick={() => handleResolve('no')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                Resolve as NO
              </button>
            </div>
            {availableOutcomes.length > 1 && (
              <p className="text-xs text-yellow-600 mt-2">
                Note: You can resolve each outcome separately. Select a different outcome above to resolve it.
              </p>
            )}
          </div>
        )}
      </div>

      {market.status === 'active' && (
        <div className="mb-6 space-y-4">
          {/* Outcome name tabs (e.g., Team A, Team B, etc.) */}
          {availableOutcomes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Outcome:
              </label>
              <div className="flex flex-wrap gap-2">
                {availableOutcomes.map((outcomeName) => (
                  <button
                    key={outcomeName}
                    onClick={() => setSelectedOutcomeName(outcomeName)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      selectedOutcomeName === outcomeName
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {outcomeName}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Outcome selection buttons - removed, now handled in OrderForm */}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Show both YES and NO orderbooks side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Orderbook
              buys={yesOrderbook.buys}
              sells={[]}
              outcome="yes"
              currentUserId={user?.id}
              onOrderCancel={handleOrderCancel}
            />
            <Orderbook
              buys={noOrderbook.buys}
              sells={[]}
              outcome="no"
              currentUserId={user?.id}
              onOrderCancel={handleOrderCancel}
            />
          </div>
          <TradeHistory 
            marketId={market.id} 
            outcomeName={selectedOutcomeName}
          />
        </div>
        <div>
          {market.status === 'active' && (
            <OrderForm
              marketId={market.id}
              outcome={selectedOutcome}
              outcomeName={selectedOutcomeName}
              onOrderPlaced={handleOrderPlaced}
              onOutcomeChange={(outcome) => setSelectedOutcome(outcome)}
              yesOrderbook={yesOrderbook}
              noOrderbook={noOrderbook}
            />
          )}
        </div>
      </div>
    </div>
  );
}

