import { useState, useEffect } from 'react';
import api from '../../services/api';
import { store } from '../../store/authStore';
import TradeConfirmation from './TradeConfirmation';

interface OrderFormProps {
  marketId: number;
  outcome: string;
  outcomeName?: string;
  onOrderPlaced: () => void;
  onOutcomeChange?: (outcome: 'yes' | 'no') => void;
  yesOrderbook?: { buys: any[]; sells: any[] };
  noOrderbook?: { buys: any[]; sells: any[] };
}

interface Position {
  quantity: number;
  average_price: number;
  total_cost: number;
  current_value?: number;
  profit_loss?: number;
  outcome: string;
  outcome_name: string;
}

interface MarketOutcome {
  id: number;
  name: string;
  status: string;
  resolution_outcome: string | null;
}

interface Market {
  outcomes_detailed?: MarketOutcome[];
  last_traded_prices?: {
    yes?: number | null;
    no?: number | null;
  };
}

export default function OrderForm({ marketId, outcome, outcomeName = 'default', onOrderPlaced, onOutcomeChange, yesOrderbook, noOrderbook }: OrderFormProps) {
  const user = store((state) => state.user);
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>(outcome as 'yes' | 'no');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market'); // Default to market order
  const [inputMode, setInputMode] = useState<'contracts' | 'dollars'>('dollars'); // Default to dollars
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(''); // Can be contracts or dollars depending on inputMode
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  // Fetch user positions for this market
  useEffect(() => {
    if (user?.id && marketId) {
      fetchPositions();
    }
  }, [user?.id, marketId, outcomeName]);

  // Fetch market to check resolution status
  useEffect(() => {
    if (marketId) {
      fetchMarket();
    }
  }, [marketId]);

  const fetchPositions = async () => {
    try {
      const response = await api.get(`/portfolio/positions/${marketId}`);
      const marketPositions = response.data.filter((p: any) => p.outcome_name === outcomeName);
      setPositions(marketPositions);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchMarket = async () => {
    try {
      const response = await api.get(`/markets/${marketId}`);
      setMarket(response.data);
    } catch (err) {
      console.error('Failed to fetch market:', err);
    }
  };

  // Check if selected outcome is resolved
  const isOutcomeResolved = () => {
    if (!market?.outcomes_detailed) return false;
    const outcomeDetail = market.outcomes_detailed.find(
      (o: MarketOutcome) => o.name === outcomeName
    );
    return outcomeDetail?.status === 'resolved';
  };

  // Get positions for YES and NO (must be declared before use)
  const yesPosition = positions.find((p: any) => p.outcome === 'yes');
  const noPosition = positions.find((p: any) => p.outcome === 'no');
  
  // Get current position for selected outcome
  const currentPosition = positions.find((p: any) => p.outcome === selectedOutcome);
  const oppositePosition = positions.find((p: any) => {
    const opposite = selectedOutcome === 'yes' ? 'no' : 'yes';
    return p.outcome === opposite;
  });

  // Determine what actions are available
  const hasPosition = currentPosition && (currentPosition.quantity as number) > 0;
  const hasOppositePosition = oppositePosition && (oppositePosition.quantity as number) > 0;
  
  // Determine if we should show "Sell" buttons instead of YES/NO toggle
  const showSellButtons = (yesPosition && (yesPosition.quantity as number) > 0) || 
                          (noPosition && (noPosition.quantity as number) > 0);

  // Get best available prices from orderbooks
  const getBestPrice = (outcome: 'yes' | 'no') => {
    const orderbook = outcome === 'yes' ? yesOrderbook : noOrderbook;
    if (orderbook?.buys && orderbook.buys.length > 0) {
      const bestBuy = orderbook.buys[0];
      return typeof bestBuy.price === 'number' ? bestBuy.price : parseFloat(bestBuy.price || '0');
    }
    return null;
  };

  const bestYesPrice = getBestPrice('yes');
  const bestNoPrice = getBestPrice('no');
  const impliedYesPrice = bestNoPrice !== null ? (1 - bestNoPrice) : null;
  const impliedNoPrice = bestYesPrice !== null ? (1 - bestYesPrice) : null;
  
  // Get last traded prices from market data
  // Ensure they sum to 100% - if one exists, calculate the other
  const lastTradedYesRaw = market?.last_traded_prices?.yes;
  const lastTradedNoRaw = market?.last_traded_prices?.no;
  
  // Calculate last traded prices that sum to 100%
  let lastTradedYes: number | null = null;
  let lastTradedNo: number | null = null;
  
  if (lastTradedYesRaw !== null && lastTradedYesRaw !== undefined) {
    lastTradedYes = lastTradedYesRaw;
    lastTradedNo = 1 - lastTradedYesRaw;
  } else if (lastTradedNoRaw !== null && lastTradedNoRaw !== undefined) {
    lastTradedNo = lastTradedNoRaw;
    lastTradedYes = 1 - lastTradedNoRaw;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Convert quantity to contracts if input is dollars
    let quantityInContracts = parseFloat(quantity);
    if (inputMode === 'dollars') {
      const priceToUse = orderType === 'market' 
        ? (selectedOutcome === 'yes' ? impliedYesPrice : impliedNoPrice)
        : parseFloat(price);
      if (!priceToUse || priceToUse === 0) {
        setError('Cannot determine price for dollar conversion');
        return;
      }
      quantityInContracts = quantityInContracts / priceToUse;
    }
    
    // Ensure whole number of contracts
    quantityInContracts = Math.floor(quantityInContracts);
    if (quantityInContracts < 1) {
      setError('Must buy at least 1 contract');
      return;
    }

    const orderData: any = {
      market_id: marketId,
      side: 'buy',  // Always 'buy' in new model
      outcome_name: outcomeName,
      outcome: selectedOutcome,
      quantity: quantityInContracts,
      order_type: orderType,
    };

    if (orderType === 'limit') {
      const priceValue = parseFloat(price);
      if (priceValue < 0 || priceValue > 1) {
        setError('Price must be between 0 and 1');
        return;
      }
      orderData.price = priceValue;
    } else {
      // For market orders, get best available price from OPPOSITE outcome's orderbook
      // To buy YES, we need NO orders (and vice versa)
      const oppositeOrderbook = selectedOutcome === 'yes' ? noOrderbook : yesOrderbook;
      const bestOppositePrice = oppositeOrderbook?.buys && oppositeOrderbook.buys.length > 0
        ? (typeof oppositeOrderbook.buys[0].price === 'number' 
            ? oppositeOrderbook.buys[0].price 
            : parseFloat(oppositeOrderbook.buys[0].price || '0'))
        : null;
      
      if (!bestOppositePrice) {
        setError(`No matching orders available. Someone needs to place a ${selectedOutcome === 'yes' ? 'NO' : 'YES'} order first. Use a limit order instead.`);
        return;
      }
      
      // Calculate implied price for this outcome
      // If opposite (NO) is at price p, then this (YES) is at (1-p)
      const impliedPrice = 1 - bestOppositePrice;
      
      orderData.price = 0; // Will be set by backend
      orderData.estimatedPrice = impliedPrice; // For display
      setPendingOrder(orderData);
      setShowConfirmation(true);
      return;
    }

    // For limit orders, submit directly
    await submitOrder(orderData);
  };

  const submitOrder = async (orderData: any) => {
    setLoading(true);
    try {
      await api.post('/trading/orders', orderData);
      setPrice('');
      setQuantity('');
      setShowConfirmation(false);
      setPendingOrder(null);
      fetchPositions(); // Refresh positions
      onOrderPlaced();
    } catch (err: any) {
      let errorMessage = 'Failed to place order';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((e: any) => 
            `${e.loc?.join('.') || 'field'}: ${e.msg || 'validation error'}`
          ).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setShowConfirmation(false);
      setPendingOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (pendingOrder) {
      submitOrder(pendingOrder);
    }
  };

  // Check if outcome is resolved
  if (isOutcomeResolved()) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Place Order</h3>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          This outcome has been resolved. Trading is disabled.
        </div>
      </div>
    );
  }

  // Calculate estimated price for market orders
  const estimatedPrice = orderType === 'market' 
    ? (selectedOutcome === 'yes' ? impliedYesPrice : impliedNoPrice)
    : (price ? parseFloat(price) : null);

  // Convert between dollars and contracts based on input mode
  const getContractsFromDollars = (dollars: number, price: number | null) => {
    if (!price || price === 0) return 0;
    return dollars / price;
  };

  const getDollarsFromContracts = (contracts: number, price: number | null) => {
    if (!price) return 0;
    return contracts * price;
  };

  // Convert quantity based on input mode
  const quantityValue = quantity ? parseFloat(quantity) : 0;
  const contracts = inputMode === 'dollars' 
    ? getContractsFromDollars(quantityValue, estimatedPrice)
    : quantityValue;
  const dollarAmount = inputMode === 'contracts'
    ? getDollarsFromContracts(quantityValue, estimatedPrice)
    : quantityValue;

  // Calculate potential payout (net profit = payout - cost)
  const currentPrice = estimatedPrice || (price ? parseFloat(price) : null);
  const potentialPayout = contracts && currentPrice 
    ? contracts * (1 - currentPrice)  // Net profit
    : 0;
  const impliedOppositePrice = currentPrice ? (1 - currentPrice) : null;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Place Order</h3>
      
      {showConfirmation && pendingOrder && (
        <TradeConfirmation
          orderType={pendingOrder.order_type}
          outcome={pendingOrder.outcome}
          quantity={pendingOrder.quantity}
          price={pendingOrder.estimatedPrice || null} // Estimated price from orderbook
          totalCost={pendingOrder.estimatedPrice ? pendingOrder.quantity * pendingOrder.estimatedPrice : null}
          potentialPayout={pendingOrder.estimatedPrice 
            ? pendingOrder.quantity * (1 - pendingOrder.estimatedPrice)  // Net profit for market orders
            : potentialPayout}
          currentPosition={currentPosition}
          onConfirm={handleConfirm}
          onCancel={() => {
            setShowConfirmation(false);
            setPendingOrder(null);
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Position Summary - Above order form */}
        {(yesPosition && (yesPosition.quantity as number) > 0) || (noPosition && (noPosition.quantity as number) > 0) ? (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Your Position</div>
            <div className="space-y-2">
              {yesPosition && (yesPosition.quantity as number) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">YES:</span>
                  <div className="text-right">
                    <div className="font-semibold">
                      {Math.floor(yesPosition.quantity as number)} contracts @ {((yesPosition.average_price as number) * 100).toFixed(1)}%
                    </div>
                    {yesPosition.current_value !== undefined && yesPosition.current_value !== null && (
                      <div className={`text-xs ${parseFloat(String(yesPosition.profit_loss || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Value: ${parseFloat(String(yesPosition.current_value)).toFixed(2)} 
                        {yesPosition.profit_loss !== undefined && yesPosition.profit_loss !== null && yesPosition.total_cost && (
                          <span> ({(parseFloat(String(yesPosition.profit_loss)) / Math.abs(parseFloat(String(yesPosition.total_cost))) * 100).toFixed(1)}%)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {noPosition && (noPosition.quantity as number) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">NO:</span>
                  <div className="text-right">
                    <div className="font-semibold">
                      {Math.floor(noPosition.quantity as number)} contracts @ {((noPosition.average_price as number) * 100).toFixed(1)}%
                    </div>
                    {noPosition.current_value !== undefined && noPosition.current_value !== null && (
                      <div className={`text-xs ${parseFloat(String(noPosition.profit_loss || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Value: ${parseFloat(String(noPosition.current_value)).toFixed(2)} 
                        {noPosition.profit_loss !== undefined && noPosition.profit_loss !== null && noPosition.total_cost && (
                          <span> ({(parseFloat(String(noPosition.profit_loss)) / Math.abs(parseFloat(String(noPosition.total_cost))) * 100).toFixed(1)}%)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* YES/NO Toggle - Show SELL for opposite when you have a position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trade Outcome
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => {
                setSelectedOutcome('yes');
                onOutcomeChange?.('yes');
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                selectedOutcome === 'yes'
                  ? yesPosition && (yesPosition.quantity as number) > 0
                    ? 'bg-gray-600 text-white shadow-lg transform scale-105'
                    : 'bg-green-600 text-white shadow-lg transform scale-105'
                  : yesPosition && (yesPosition.quantity as number) > 0
                    ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                {noPosition && (noPosition.quantity as number) > 0 ? (
                  <span>SELL</span>
                ) : (
                  <>
                    <span>YES</span>
                    {yesPosition && (yesPosition.quantity as number) > 0 && (
                      <span className="text-xs text-gray-500">(You own {Math.floor(yesPosition.quantity as number)})</span>
                    )}
                  </>
                )}
                {lastTradedYes !== null && (
                  <span className="text-xs font-semibold">
                    {(lastTradedYes * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOutcome('no');
                onOutcomeChange?.('no');
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                selectedOutcome === 'no'
                  ? noPosition && (noPosition.quantity as number) > 0
                    ? 'bg-gray-600 text-white shadow-lg transform scale-105'
                    : 'bg-red-600 text-white shadow-lg transform scale-105'
                  : noPosition && (noPosition.quantity as number) > 0
                    ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                {yesPosition && (yesPosition.quantity as number) > 0 ? (
                  <span>SELL</span>
                ) : (
                  <>
                    <span>NO</span>
                    {noPosition && (noPosition.quantity as number) > 0 && (
                      <span className="text-xs text-gray-500">(You own {Math.floor(noPosition.quantity as number)})</span>
                    )}
                  </>
                )}
                {lastTradedNo !== null && (
                  <span className="text-xs font-semibold">
                    {(lastTradedNo * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </button>
          </div>
          {/* Show hint about buying more or selling */}
          {yesPosition && (yesPosition.quantity as number) > 0 && selectedOutcome === 'yes' && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              💡 Buying more YES will increase your position
            </div>
          )}
          {noPosition && (noPosition.quantity as number) > 0 && selectedOutcome === 'no' && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              💡 Buying more NO will increase your position
            </div>
          )}
          {yesPosition && (yesPosition.quantity as number) > 0 && selectedOutcome === 'no' && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              💡 Buying NO will reduce your YES position
            </div>
          )}
          {noPosition && (noPosition.quantity as number) > 0 && selectedOutcome === 'yes' && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              💡 Buying YES will reduce your NO position
            </div>
          )}
        </div>

        {/* Current Position Display - Enhanced */}
        {currentPosition && (currentPosition.quantity as number) > 0 && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-blue-900 mb-3">Your Position</div>
            
            {/* Show what they have */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You own:</span>
                <span className="text-lg font-bold text-blue-700">
                  {Math.abs(currentPosition.quantity as number).toFixed(2)} {selectedOutcome.toUpperCase()} contracts
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You paid:</span>
                <span className="text-sm font-semibold text-gray-700">
                  ${Math.abs(currentPosition.total_cost as number).toFixed(2)}
                </span>
              </div>
              
              {/* Show what happens if they win */}
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">If {selectedOutcome.toUpperCase()} wins:</span>
                  <span className="text-lg font-bold text-green-600">
                    +${(Math.abs(currentPosition.quantity as number) * 1.0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  You get ${Math.abs(currentPosition.quantity as number).toFixed(2)} back
                </div>
              </div>
              
              {/* Show what happens if they lose */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">If {(selectedOutcome === 'yes' ? 'NO' : 'YES')} wins:</span>
                <span className="text-sm font-semibold text-red-600">
                  $0.00
                </span>
              </div>
            </div>
            
            <div className="text-xs text-blue-600 mt-3 pt-2 border-t border-blue-200">
              💡 Tip: Buying {selectedOutcome === 'yes' ? 'NO' : 'YES'} will reduce this position
            </div>
          </div>
        )}

        {hasOppositePosition && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-amber-900">Opposite Position</div>
              <div className="text-sm font-bold text-amber-700">
                {(oppositePosition.quantity as number)} {(selectedOutcome === 'yes' ? 'NO' : 'YES')}
              </div>
            </div>
            <div className="text-xs text-amber-600">
              Buying {selectedOutcome.toUpperCase()} will reduce your opposite position by up to {Math.min(parseFloat(quantity) || 0, (oppositePosition.quantity as number))} contracts.
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Type
          </label>
          <select
            className="input-field"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as 'limit' | 'market')}
          >
            <option value="limit">Limit Order</option>
            <option value="market">Market Order</option>
          </select>
        </div>

        {orderType === 'limit' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (0-1)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                required={orderType === 'limit'}
                className="input-field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.5000"
              />
              {price && !isNaN(parseFloat(price)) && (
                <div className="text-xs text-gray-500 mt-1">
                  Price: {(parseFloat(price) * 100).toFixed(2)}% | 
                  Implied {(selectedOutcome === 'yes' ? 'NO' : 'YES')}: {((1 - parseFloat(price)) * 100).toFixed(2)}%
                </div>
              )}
            </div>
            
            {/* Show potential payout for limit orders */}
            {price && quantity && !isNaN(parseFloat(price)) && !isNaN(parseFloat(quantity)) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm font-medium text-green-900">If {selectedOutcome.toUpperCase()} wins:</div>
                <div className="text-lg font-bold text-green-700">
                  +${(parseFloat(quantity) * (1 - parseFloat(price))).toFixed(2)} profit
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Cost: ${(parseFloat(quantity) * parseFloat(price)).toFixed(2)} | 
                  Payout: ${(parseFloat(quantity) * 1.0).toFixed(2)} | 
                  Net Profit: ${(parseFloat(quantity) * (1 - parseFloat(price))).toFixed(2)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Market order price display */}
        {orderType === 'market' && estimatedPrice !== null && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Estimated Price:</span>
              <span className="text-2xl font-bold text-blue-700">
                {(estimatedPrice * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              ✓ Market order available - matching order found on opposite side
            </div>
          </div>
        )}
        
        {orderType === 'market' && estimatedPrice === null && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-900">⚠️ Market Order Unavailable</span>
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              No matching orders found on the {(selectedOutcome === 'yes' ? 'NO' : 'YES')} side. 
              Use a limit order instead, or wait for someone to place a {(selectedOutcome === 'yes' ? 'NO' : 'YES')} order.
            </div>
          </div>
        )}

        {/* Input mode toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {inputMode === 'dollars' ? 'Amount ($)' : 'Contracts'}
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  // Convert current quantity when switching modes
                  if (quantity && estimatedPrice && inputMode === 'contracts') {
                    const currentContracts = parseFloat(quantity);
                    setQuantity((currentContracts * estimatedPrice).toFixed(2));
                  }
                  setInputMode('dollars');
                }}
                className={`px-3 py-1 text-xs rounded ${
                  inputMode === 'dollars'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                $
              </button>
              <button
                type="button"
                onClick={() => {
                  // Convert current quantity when switching modes
                  if (quantity && estimatedPrice && inputMode === 'dollars') {
                    const currentDollars = parseFloat(quantity);
                    setQuantity((currentDollars / estimatedPrice).toFixed(2));
                  }
                  setInputMode('contracts');
                }}
                className={`px-3 py-1 text-xs rounded ${
                  inputMode === 'contracts'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Contracts
              </button>
            </div>
          </div>
          <input
            type="number"
            step={inputMode === 'dollars' ? '0.01' : '1'}
            min={inputMode === 'dollars' ? '0.01' : '1'}
            required
            className="input-field"
            value={quantity}
            onChange={(e) => {
              const value = e.target.value;
              // For contracts, only allow whole numbers
              if (inputMode === 'contracts') {
                const numValue = parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 1 && Number.isInteger(numValue))) {
                  setQuantity(value);
                }
              } else {
                setQuantity(value);
              }
            }}
            placeholder={inputMode === 'dollars' ? "10.00" : "1"}
          />
          {/* Show conversion */}
          {quantity && estimatedPrice && !isNaN(parseFloat(quantity)) && estimatedPrice > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {inputMode === 'dollars' ? (
                <>
                  ${parseFloat(quantity).toFixed(2)} = {Math.floor(contracts)} contracts @ {(estimatedPrice * 100).toFixed(2)}%
                </>
              ) : (
                <>
                  {Math.floor(parseFloat(quantity))} contracts = ${dollarAmount.toFixed(2)} @ {(estimatedPrice * 100).toFixed(2)}%
                </>
              )}
            </div>
          )}
          {orderType === 'market' && !estimatedPrice && (
            <div className="text-xs text-yellow-600 mt-1">
              No orders available. Enter contracts directly.
            </div>
          )}
        </div>

        {/* Show potential payout for market orders */}
        {orderType === 'market' && quantity && estimatedPrice && !isNaN(parseFloat(quantity)) && contracts > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-900 mb-2">If {selectedOutcome.toUpperCase()} wins:</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">You pay:</span>
                <span className="text-sm font-semibold text-gray-700">${(contracts * estimatedPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600">You get:</span>
                <span className="text-sm font-semibold text-green-700">${(contracts * 1.0).toFixed(2)}</span>
              </div>
              <div className="border-t border-green-300 pt-1 mt-1 flex justify-between items-center">
                <span className="text-sm font-medium text-green-900">Your profit:</span>
                <span className="text-lg font-bold text-green-700">
                  +${potentialPayout.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            selectedOutcome === 'yes'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Placing...' : (
            (() => {
              // If you have the same position, you're buying more
              if (hasPosition && (currentPosition.quantity as number) > 0) {
                return `Buy More ${selectedOutcome.toUpperCase()}`;
              }
              // If you have opposite position, you're selling/reducing it
              if (hasOppositePosition && (oppositePosition.quantity as number) > 0) {
                const oppositeOutcome = selectedOutcome === 'yes' ? 'NO' : 'YES';
                return `Sell ${oppositeOutcome} (Reduce Position)`;
              }
              // Otherwise, you're buying the selected outcome
              return `Buy ${selectedOutcome.toUpperCase()}`;
            })()
          )}
        </button>
      </form>
    </div>
  );
}
