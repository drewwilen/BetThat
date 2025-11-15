interface TradeConfirmationProps {
  orderType: 'limit' | 'market';
  outcome: 'yes' | 'no';
  quantity: number;
  price: number | null;
  totalCost: number | null;
  potentialPayout: number;
  currentPosition: {
    quantity: number;
    average_price: number;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TradeConfirmation({
  orderType,
  outcome,
  quantity,
  price,
  totalCost,
  potentialPayout,
  currentPosition,
  onConfirm,
  onCancel,
}: TradeConfirmationProps) {
  const newPosition = currentPosition
    ? {
        quantity: currentPosition.quantity + quantity,
        average_price: currentPosition.average_price, // Will be recalculated by backend
      }
    : { quantity, average_price: price || 0 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-bold mb-4">Confirm Trade</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-semibold">{orderType === 'market' ? 'Market Order' : 'Limit Order'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Buy:</span>
            <span className={`font-semibold ${outcome === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
              {quantity} {outcome.toUpperCase()}
            </span>
          </div>
          
          {orderType === 'limit' && price !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold">{(price * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-semibold">${(quantity * price).toFixed(2)}</span>
              </div>
            </>
          )}
          
          {orderType === 'market' && (
            <>
              {price !== null ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Price:</span>
                    <span className="font-semibold">{(price * 100).toFixed(2)}%</span>
                  </div>
                  {totalCost !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Cost:</span>
                      <span className="font-semibold">${totalCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 italic">
                    * Actual price may vary based on orderbook depth
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold text-gray-500">Market Price</span>
                </div>
              )}
            </>
          )}
          
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">If {outcome.toUpperCase()} wins:</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  +${potentialPayout.toFixed(2)} profit
                </div>
                {orderType === 'limit' && price !== null && (
                  <div className="text-xs text-gray-500 mt-1">
                    (${(quantity * 1.0).toFixed(2)} payout - ${(quantity * price).toFixed(2)} cost)
                  </div>
                )}
                {orderType === 'market' && price !== null && (
                  <div className="text-xs text-gray-500 mt-1">
                    (${(quantity * 1.0).toFixed(2)} payout - ${(totalCost || 0).toFixed(2)} estimated cost)
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {currentPosition && (
            <div className="border-t pt-3 mt-3">
              <div className="text-sm text-gray-600 mb-2">Your Current Position:</div>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">You own:</span>
                  <span className="font-semibold">{Math.abs(currentPosition.quantity)} {outcome.toUpperCase()} contracts</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">You paid:</span>
                  <span className="font-semibold">${(Math.abs(currentPosition.quantity) * currentPosition.average_price).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                After Trade: {newPosition.quantity} {outcome.toUpperCase()} contracts
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-white transition-colors ${
              outcome === 'yes'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
