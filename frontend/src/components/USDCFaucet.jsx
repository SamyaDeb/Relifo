import { useState } from 'react';
import { ethers } from 'ethers';
import { getUSDCFromFaucet, getUSDCBalance } from '../utils/usdcFaucet';

/**
 * USDC Faucet Component
 * Allows users to get testnet USDC easily
 */
export default function USDCFaucet({ provider, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('100');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState('0');

  const checkBalance = async () => {
    if (!provider) return;
    try {
      const bal = await getUSDCBalance(provider);
      setBalance(bal);
    } catch (err) {
      console.error('Error checking balance:', err);
    }
  };

  const handleGetUSDC = async () => {
    if (!provider) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await getUSDCFromFaucet(provider, amount);
      
      setSuccess(`✅ Successfully received ${result.received} USDC!`);
      
      // Update balance
      await checkBalance();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to get USDC');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Check balance on mount
  useState(() => {
    if (provider) {
      checkBalance();
    }
  }, [provider]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">Get Testnet USDC</h3>
        <span className="text-sm text-gray-600">
          Balance: {parseFloat(balance).toFixed(2)} USDC
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Get free testnet USDC to buy RELIEF tokens and make donations.
        You can request up to 1000 USDC at a time.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="1"
            max="1000"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum: 1000 USDC per request
          </p>
        </div>

        <button
          onClick={handleGetUSDC}
          disabled={loading || !provider || !amount}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            loading || !provider
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Getting USDC...
            </span>
          ) : (
            'Get USDC from Faucet'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-xs">
            💡 <strong>Tip:</strong> This is testnet USDC for Polygon Amoy.
            Use it to buy RELIEF tokens and test donations!
          </p>
        </div>
      </div>
    </div>
  );
}
