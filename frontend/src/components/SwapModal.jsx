import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { swapPOLtoUSDC, getEstimatedSwapAmount } from '../services/swapService';
import { getExchangeRateDisplay, subscribeToPriceUpdates } from '../services/priceOracle';

const SwapModal = ({ isOpen, onClose, provider, onSwapComplete }) => {
  const [polAmount, setPolAmount] = useState('');
  const [estimatedUSDC, setEstimatedUSDC] = useState('0');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState('');
  const [polBalance, setPolBalance] = useState('0');

  // Fetch POL balance and exchange rate
  useEffect(() => {
    if (isOpen && provider) {
      fetchPOLBalance();
      fetchExchangeRate();
      
      // Subscribe to price updates every 30 seconds
      const unsubscribe = subscribeToPriceUpdates((prices) => {
        getExchangeRateDisplay().then(setExchangeRate);
      }, 30000);
      
      return unsubscribe;
    }
  }, [isOpen, provider]);

  // Update estimated USDC when POL amount changes
  useEffect(() => {
    if (polAmount && provider) {
      updateEstimate();
    } else {
      setEstimatedUSDC('0');
    }
  }, [polAmount, provider]);

  const fetchPOLBalance = async () => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      setPolBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching POL balance:', err);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const rate = await getExchangeRateDisplay();
      setExchangeRate(rate);
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }
  };

  const updateEstimate = async () => {
    try {
      const estimate = await getEstimatedSwapAmount(provider, polAmount);
      setEstimatedUSDC(estimate.toFixed(6));
    } catch (err) {
      console.error('Error estimating swap:', err);
      setEstimatedUSDC('0');
    }
  };

  const handleSwap = async () => {
    if (!polAmount || parseFloat(polAmount) <= 0) {
      setError('Please enter a valid POL amount');
      return;
    }

    if (parseFloat(polAmount) > parseFloat(polBalance)) {
      setError('Insufficient POL balance');
      return;
    }

    setIsSwapping(true);
    setError('');

    try {
      const result = await swapPOLtoUSDC(provider, polAmount);
      
      if (result.success) {
        onSwapComplete?.(result);
        setPolAmount('');
        setEstimatedUSDC('0');
        setTimeout(() => {
          fetchPOLBalance();
        }, 2000);
      } else {
        setError(result.error || 'Swap failed');
      }
    } catch (err) {
      setError(err.message || 'Error during swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleMaxClick = () => {
    // Leave small amount for gas
    const maxSwap = Math.max(0, parseFloat(polBalance) - 0.1);
    setPolAmount(maxSwap.toFixed(6));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Swap POL to USDC</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Current Rate:</span> {exchangeRate.polToUsdc}
              </p>
              <p className="text-xs text-gray-500">{exchangeRate.lastUpdate}</p>
            </div>
          </div>
        )}

        {/* POL Balance */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Available POL Balance</span>
            <span className="font-semibold">{parseFloat(polBalance).toFixed(4)} POL</span>
          </div>
        </div>

        {/* Input: POL Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            POL Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={polAmount}
              onChange={(e) => setPolAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              step="0.000001"
              min="0"
              disabled={isSwapping}
            />
            <button
              onClick={handleMaxClick}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
              disabled={isSwapping}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center my-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Output: Estimated USDC */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            You'll Receive (Estimated)
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="text-lg font-semibold">{estimatedUSDC} USDC</span>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-xs text-gray-600">
            ⚠️ Actual received amount may differ slightly due to price movement and slippage. A small amount of POL will be used for gas fees.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            disabled={isSwapping}
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isSwapping || !polAmount || parseFloat(polAmount) <= 0}
          >
            {isSwapping ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Swapping...
              </span>
            ) : (
              'Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapModal;
