import { useState, useEffect } from 'react';
import {
  getUSDCBalance,
  getRELIEFBalance,
  checkUSDCApproval,
  approveUSDC,
  buyReliefTokens
} from '../services/donationService';

const BuyReliefModal = ({ isOpen, onClose, provider, onPurchaseComplete }) => {
  const [usdcAmount, setUsdcAmount] = useState('');
  const [reliefAmount, setReliefAmount] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [reliefBalance, setReliefBalance] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  // Fetch balances when modal opens
  useEffect(() => {
    if (isOpen && provider) {
      fetchBalances();
    }
  }, [isOpen, provider]);

  // Update RELIEF amount (1:1 ratio with USDC)
  useEffect(() => {
    if (usdcAmount && parseFloat(usdcAmount) > 0) {
      setReliefAmount(usdcAmount);
    } else {
      setReliefAmount('0');
    }
  }, [usdcAmount]);

  const fetchBalances = async () => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const usdc = await getUSDCBalance(provider, address);
      const relief = await getRELIEFBalance(provider, address);
      
      setUsdcBalance(usdc.toFixed(2));
      setReliefBalance(relief.toFixed(2));
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const handlePurchase = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError('Please enter a valid USDC amount');
      return;
    }

    if (parseFloat(usdcAmount) > parseFloat(usdcBalance)) {
      setError('Insufficient USDC balance');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Step 1: Check approval
      setCurrentStep('Checking USDC approval...');
      const isApproved = await checkUSDCApproval(provider, address, usdcAmount);

      if (!isApproved) {
        // Step 2: Approve USDC
        setCurrentStep('Approve USDC spending (sign transaction)...');
        const approvalResult = await approveUSDC(provider, usdcAmount);
        
        if (!approvalResult.success) {
          throw new Error(approvalResult.error || 'Approval failed');
        }
      }

      // Step 3: Buy RELIEF tokens
      setCurrentStep('Purchasing RELIEF tokens (sign transaction)...');
      const purchaseResult = await buyReliefTokens(provider, usdcAmount);

      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      setCurrentStep('Purchase complete!');
      
      // Notify parent component
      onPurchaseComplete?.({
        usdcAmount: parseFloat(usdcAmount),
        reliefAmount: parseFloat(reliefAmount),
        txHash: purchaseResult.txHash
      });

      // Reset form
      setUsdcAmount('');
      setReliefAmount('0');
      
      // Refresh balances after a delay
      setTimeout(() => {
        fetchBalances();
      }, 2000);

    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed');
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  const handleMaxClick = () => {
    setUsdcAmount(usdcBalance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Buy RELIEF Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Exchange Rate:</span> 1 USDC = 1 RELIEF Token
          </p>
        </div>

        {/* Balances */}
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>USDC Balance:</span>
            <span className="font-semibold">{usdcBalance} USDC</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>RELIEF Balance:</span>
            <span className="font-semibold">{reliefBalance} RELIEF</span>
          </div>
        </div>

        {/* Input: USDC Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            USDC Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              step="0.01"
              min="0"
              disabled={isProcessing}
            />
            <button
              onClick={handleMaxClick}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-800 font-semibold text-sm"
              disabled={isProcessing}
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

        {/* Output: RELIEF Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            You'll Receive
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="text-lg font-semibold">{reliefAmount} RELIEF</span>
          </div>
        </div>

        {/* Current Step Indicator */}
        {currentStep && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-700">{currentStep}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Info Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-xs text-gray-600">
            ℹ️ You'll need to approve two transactions: one to approve USDC spending, and another to complete the purchase.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isProcessing || !usdcAmount || parseFloat(usdcAmount) <= 0}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Buy RELIEF'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyReliefModal;
