import { useState, useEffect } from 'react';
import { completeDonationFlow } from '../services/donationService';
import { convertUSDCtoPOL, getExchangeRateDisplay } from '../services/priceOracle';

const DonateWithUSDC = ({ provider, campaignAddress, campaignTitle, onDonationComplete }) => {
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [polEquivalent, setPolEquivalent] = useState('0');
  const [exchangeRate, setExchangeRate] = useState(null);

  // Fetch exchange rate on component mount
  useEffect(() => {
    getExchangeRateDisplay().then(rate => {
      setExchangeRate(rate);
    });
  }, []);

  // Calculate POL equivalent when USDC amount changes
  useEffect(() => {
    if (usdcAmount && parseFloat(usdcAmount) > 0) {
      convertUSDCtoPOL(parseFloat(usdcAmount)).then(polValue => {
        setPolEquivalent(polValue.toFixed(4));
      });
    } else {
      setPolEquivalent('0');
    }
  }, [usdcAmount]);

  const handleProgressUpdate = (message, step) => {
    setCurrentStep(message);
    setProgress((step / 8) * 100);
  };

  const handleDonate = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError('Please enter a valid donation amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess(false);
    setProgress(0);

    try {
      const result = await completeDonationFlow(
        provider,
        campaignAddress,
        parseFloat(usdcAmount),
        handleProgressUpdate
      );

      if (result.success) {
        setSuccess(true);
        setCurrentStep('Donation complete! Thank you for your support!');
        setProgress(100);
        
        // Notify parent
        onDonationComplete?.({
          usdcAmount: result.usdcAmount,
          reliefAmount: result.reliefAmount,
          txHash: result.txHash
        });

        // Reset form after delay
        setTimeout(() => {
          setUsdcAmount('');
          setSuccess(false);
          setCurrentStep('');
          setProgress(0);
        }, 5000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Donation error:', err);
      setError(err.message || 'Donation failed');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Donate with USDC</h3>

      {/* Campaign Info */}
      {campaignTitle && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Campaign:</span> {campaignTitle}
          </p>
        </div>
      )}

      {/* Exchange Rate Display */}
      {exchangeRate && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Current Rate:</span> {exchangeRate.usdcToPol}
            </p>
            <p className="text-xs text-gray-500">{exchangeRate.lastUpdate}</p>
          </div>
        </div>
      )}

      {/* Donation Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Donation Amount (USDC)
        </label>
        <input
          type="number"
          value={usdcAmount}
          onChange={(e) => setUsdcAmount(e.target.value)}
          placeholder="Enter USDC amount"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          step="1"
          min="1"
          disabled={isProcessing}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">
            1 USDC = 1 RELIEF Token
          </p>
          {polEquivalent !== '0' && (
            <p className="text-xs text-gray-600 font-semibold">
              ≈ {polEquivalent} POL
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">{currentStep}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700 font-semibold">
              Donation successful! Thank you for your support!
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
        <p className="text-xs text-gray-600 mb-2">
          <strong>How it works:</strong>
        </p>
        <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
          <li>Your USDC will be used to buy RELIEF tokens (1:1 ratio)</li>
          <li>RELIEF tokens will be donated to the campaign</li>
          <li>You'll need to approve multiple transactions</li>
        </ol>
        {polEquivalent !== '0' && (
          <p className="text-xs text-gray-600 mt-2">
            💡 <strong>Your donation of {usdcAmount} USDC is equivalent to ≈{polEquivalent} POL</strong>
          </p>
        )}
      </div>

      {/* Donate Button */}
      <button
        onClick={handleDonate}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
          'Donate Now'
        )}
      </button>
    </div>
  );
};

export default DonateWithUSDC;
