import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Trade {
  id: number;
  market_id: number;
  side: 'buy' | 'sell';
  outcome: string;
  price: number | string; // Can be string from API (Decimal serialization)
  quantity: number | string; // Can be string from API (Decimal serialization)
  executed_at: string;
  profit?: number | null;
  payout?: number | null;
  market_resolved?: boolean;
  resolution_outcome?: string | null;
}

interface TradeHistoryProps {
  marketId: number;
  outcomeName?: string;
}

export default function TradeHistory({ marketId, outcomeName = 'default' }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
    // Refresh every 5 seconds
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [marketId, outcomeName]); // Remove outcome dependency - show all trades

  const fetchTrades = async () => {
    try {
      const params: any = {};
      // Only filter by outcome_name, not by outcome - show all user's trades
      if (outcomeName) params.outcome_name = outcomeName;
      // Use my-trades endpoint to get user's trades with side and profit info
      const response = await api.get(`/trading/markets/${marketId}/my-trades`, { params });
      // Convert Decimal strings to numbers
      const trades = response.data.map((trade: any) => ({
        ...trade,
        price: typeof trade.price === 'number' ? trade.price : parseFloat(trade.price || '0'),
        quantity: typeof trade.quantity === 'number' ? trade.quantity : parseFloat(trade.quantity || '0'),
        profit: trade.profit !== null && trade.profit !== undefined 
          ? (typeof trade.profit === 'number' ? trade.profit : parseFloat(trade.profit || '0'))
          : null,
        payout: trade.payout !== null && trade.payout !== undefined
          ? (typeof trade.payout === 'number' ? trade.payout : parseFloat(trade.payout || '0'))
          : null,
      }));
      setTrades(trades);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && trades.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Trade History</h3>
        <div className="text-center py-4 text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Trade History</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {trades.length > 0 ? (
          trades.map((trade) => {
            const price = typeof trade.price === 'number' ? trade.price : parseFloat(trade.price || '0');
            const quantity = typeof trade.quantity === 'number' ? trade.quantity : parseFloat(trade.quantity || '0');
            const profit = trade.profit !== null && trade.profit !== undefined ? trade.profit : null;
            const payout = trade.payout !== null && trade.payout !== undefined ? trade.payout : null;
            
            return (
              <div
                key={trade.id}
                className={`flex justify-between items-center p-2 rounded text-sm ${
                  trade.outcome === 'yes' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold px-2 py-1 rounded text-xs ${
                      trade.outcome === 'yes' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      BUY {trade.outcome.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(trade.executed_at).toLocaleTimeString()}
                  </div>
                  {trade.market_resolved && (
                    <div className="text-xs mt-1">
                      {payout !== null && (
                        <span className="text-gray-600">Payout: ${payout.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">{(price * 100).toFixed(2)}%</div>
                  <div className="text-gray-500 text-xs">{quantity.toFixed(2)} contracts</div>
                  {profit !== null && (
                    <div className={`text-xs font-semibold mt-1 ${
                      profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-gray-500">No trades yet</div>
        )}
      </div>
    </div>
  );
}
