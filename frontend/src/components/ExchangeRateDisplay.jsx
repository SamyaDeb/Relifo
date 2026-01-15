import { useState, useEffect } from 'react';
import { getExchangeRateDisplay, subscribeToPriceUpdates } from '../services/priceOracle';

/**
 * ExchangeRateDisplay Component
 * Shows real-time POL/USDC exchange rates
 * 
 * Props:
 * - variant: 'polToUsdc' | 'usdcToPol' | 'both' (default: 'both')
 * - autoUpdate: boolean (default: true) - Auto-refresh every 30s
 * - className: string - Additional CSS classes
 */
const ExchangeRateDisplay = ({ variant = 'both', autoUpdate = true, className = '' }) => {
  const [exchangeRate, setExchangeRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    getExchangeRateDisplay().then(rate => {
      setExchangeRate(rate);
      setIsLoading(false);
    });

    // Subscribe to updates if autoUpdate is enabled
    if (autoUpdate) {
      const unsubscribe = subscribeToPriceUpdates(() => {
        getExchangeRateDisplay().then(setExchangeRate);
      }, 30000);

      return unsubscribe;
    }
  }, [autoUpdate]);

  if (isLoading) {
    return (
      <div className={`flex items-center text-sm text-gray-500 ${className}`}>
        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading rates...
      </div>
    );
  }

  if (!exchangeRate) {
    return null;
  }

  return (
    <div className={`text-sm ${className}`}>
      {variant === 'polToUsdc' && (
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{exchangeRate.polToUsdc}</span>
          <span className="text-xs text-gray-500">{exchangeRate.lastUpdate}</span>
        </div>
      )}
      
      {variant === 'usdcToPol' && (
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{exchangeRate.usdcToPol}</span>
          <span className="text-xs text-gray-500">{exchangeRate.lastUpdate}</span>
        </div>
      )}
      
      {variant === 'both' && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">{exchangeRate.polToUsdc}</span>
            <span className="text-xs text-gray-500">{exchangeRate.lastUpdate}</span>
          </div>
          <div className="text-gray-600">
            {exchangeRate.usdcToPol}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeRateDisplay;
