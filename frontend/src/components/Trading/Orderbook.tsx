interface OrderBookEntry {
  price: number | string;
  quantity: number | string;
  order_id?: number | null;
  user_id?: number | null;
}

interface OrderbookProps {
  buys: OrderBookEntry[];
  sells: OrderBookEntry[];
  outcome: string;
  currentUserId?: number | null;
  onOrderCancel?: (orderId: number) => void;
}

export default function Orderbook({ buys, sells, outcome, currentUserId, onOrderCancel }: OrderbookProps) {
  // In buy-only model, we only show orders for the selected outcome
  // The opposite outcome orders are for matching but don't need to be displayed
  // Calculate implied price for the opposite side (for reference)
  const bestBuyPrice = buys.length > 0 
    ? (typeof buys[0].price === 'number' ? buys[0].price : parseFloat(buys[0].price || '0'))
    : null;
  const impliedOppositePrice = bestBuyPrice !== null ? (1 - bestBuyPrice) : null;
  
  return (
    <div className="card">
      <h3 className={`text-lg font-bold mb-3 ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
        Buy {outcome.toUpperCase()}
      </h3>
      
      {/* Show current market price if available */}
      {bestBuyPrice !== null && (
        <div className={`mb-3 p-2 rounded-lg border ${outcome === 'yes' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs text-gray-600 mb-1">Best Price</div>
          <div className={`text-xl font-bold ${outcome === 'yes' ? 'text-green-700' : 'text-red-700'}`}>
            {(bestBuyPrice * 100).toFixed(2)}%
          </div>
        </div>
      )}
      
      {/* Show only Buy orders for the selected outcome */}
      <div>
        <div className="text-xs text-gray-500 mb-2">
          Buy {outcome.toUpperCase()} Orders
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {buys.length > 0 ? (
            buys.slice(0, 20).map((entry, idx) => {
              const price = typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0');
              const quantity = typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0');
              const isMyOrder = currentUserId && entry.user_id === currentUserId;
              const impliedOpposite = 1 - price;
              return (
                <div
                  key={entry.order_id || idx}
                  className={`flex items-center justify-between text-sm p-2 rounded border ${
                    isMyOrder 
                      ? 'bg-green-100 border-2 border-green-500 font-semibold' 
                      : 'bg-white border-gray-200'
                  }`}
                  title={isMyOrder ? 'Your order' : undefined}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <span className={`font-medium text-sm ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
                      {(price * 100).toFixed(2)}%
                    </span>
                    <span className="text-gray-600 text-sm">{quantity.toFixed(2)}</span>
                  </div>
                  {isMyOrder && entry.order_id && onOrderCancel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (entry.order_id) {
                          onOrderCancel(entry.order_id);
                        }
                      }}
                      className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      title="Cancel order"
                    >
                      ✕ Cancel
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">No buy orders for {outcome.toUpperCase()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

