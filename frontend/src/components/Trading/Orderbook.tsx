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
  lastTradedPrice?: number | null; // Last traded price as a percentage (0-1)
  oppositeBuys?: OrderBookEntry[]; // Buy orders from opposite outcome (for displaying asks)
}

export default function Orderbook({ buys, sells, outcome, currentUserId, onOrderCancel, lastTradedPrice, oppositeBuys = [] }: OrderbookProps) {
  // Convert opposite outcome's buy orders to "asks" (sell orders) for this outcome
  // If NO is buying at price p, that means YES can be sold at price (1-p)
  const asks = oppositeBuys.map(entry => {
    const oppositePrice = typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0');
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0');
    return {
      price: 1 - oppositePrice, // Invert the price
      quantity: quantity,
      order_id: entry.order_id,
      user_id: entry.user_id
    };
  }).sort((a, b) => b.price - a.price); // Sort asks descending (highest first)

  // Bids are the buy orders for this outcome, sorted descending (highest first)
  const bids = [...buys].sort((a, b) => {
    const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price || '0');
    const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price || '0');
    return priceB - priceA;
  });

  const formatPrice = (price: number) => {
    return (price * 100).toFixed(0); // Show as cents (whole numbers)
  };

  const formatTotal = (price: number, quantity: number) => {
    return (price * quantity).toFixed(2);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-bold ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
          Trade {outcome.toUpperCase()}
        </h3>
        {lastTradedPrice !== null && lastTradedPrice !== undefined && (
          <div className={`text-sm font-semibold ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            Last {formatPrice(lastTradedPrice)}¢
          </div>
        )}
      </div>
      
      {/* Asks (Sell Orders) - from opposite outcome, inverted */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-red-600 mb-2">Asks</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {asks.length > 0 ? (
            asks.slice(0, 10).map((entry, idx) => {
              const price = entry.price;
              const quantity = entry.quantity;
              const total = price * quantity;
              const isMyOrder = currentUserId && entry.user_id === currentUserId;
              const maxAskQuantity = asks.length > 0 ? Math.max(...asks.map(a => a.quantity)) : 1;
              const barWidth = Math.min((quantity / maxAskQuantity) * 100, 100);
              
              return (
                <div
                  key={entry.order_id || `ask-${idx}`}
                  className={`flex items-center text-sm py-1 px-2 rounded relative ${
                    isMyOrder ? 'bg-red-100 border-2 border-red-500' : ''
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 bg-red-100 opacity-30 rounded" style={{ width: `${barWidth}%` }} />
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="text-red-600 font-medium text-sm w-12">{formatPrice(price)}¢</span>
                      <span className="text-gray-700 text-sm w-20">{Math.floor(quantity)}</span>
                      <span className="text-gray-600 text-xs">${formatTotal(price, quantity)}</span>
                    </div>
                    {isMyOrder && entry.order_id && onOrderCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (entry.order_id) {
                            onOrderCancel(entry.order_id);
                          }
                        }}
                        className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        title="Cancel order"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-400 text-center py-2">No asks</div>
          )}
        </div>
      </div>

      {/* Last Traded Price Separator */}
      {lastTradedPrice !== null && lastTradedPrice !== undefined && (
        <div className={`text-center py-2 border-y ${outcome === 'yes' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <span className={`text-xs font-semibold ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            Trade {outcome.toUpperCase()} Last {formatPrice(lastTradedPrice)}¢
          </span>
        </div>
      )}

      {/* Bids (Buy Orders) */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-green-600 mb-2">Bids</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {bids.length > 0 ? (
            bids.slice(0, 10).map((entry, idx) => {
              const price = typeof entry.price === 'number' ? entry.price : parseFloat(entry.price || '0');
              const quantity = typeof entry.quantity === 'number' ? entry.quantity : parseFloat(entry.quantity || '0');
              const total = price * quantity;
              const isMyOrder = currentUserId && entry.user_id === currentUserId;
              const maxBidQuantity = bids.length > 0 
                ? Math.max(...bids.map(b => typeof b.quantity === 'number' ? b.quantity : parseFloat(b.quantity || '0')))
                : 1;
              const barWidth = Math.min((quantity / maxBidQuantity) * 100, 100);
              
              return (
                <div
                  key={entry.order_id || `bid-${idx}`}
                  className={`flex items-center text-sm py-1 px-2 rounded relative ${
                    isMyOrder ? 'bg-green-100 border-2 border-green-500' : ''
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 bg-green-100 opacity-30 rounded" style={{ width: `${barWidth}%` }} />
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="text-green-600 font-medium text-sm w-12">{formatPrice(price)}¢</span>
                      <span className="text-gray-700 text-sm w-20">{Math.floor(quantity)}</span>
                      <span className="text-gray-600 text-xs">${formatTotal(price, quantity)}</span>
                    </div>
                    {isMyOrder && entry.order_id && onOrderCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (entry.order_id) {
                            onOrderCancel(entry.order_id);
                          }
                        }}
                        className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        title="Cancel order"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-400 text-center py-2">No bids</div>
          )}
        </div>
      </div>
    </div>
  );
}

