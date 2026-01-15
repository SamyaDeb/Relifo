import { useState, useEffect } from 'react';
import { convertUSDCtoPOL } from '../services/priceOracle';

/**
 * PriceComparisonDisplay Component
 * Shows USDC amount with POL equivalent
 * 
 * Props:
 * - usdcAmount: number - The USDC amount to display
 * - showLabel: boolean (default: true) - Show "Equivalent" label
 * - className: string - Additional CSS classes
 */
const PriceComparisonDisplay = ({ usdcAmount, showLabel = true, className = '' }) => {
  const [polEquivalent, setPolEquivalent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (usdcAmount && usdcAmount > 0) {
      setIsLoading(true);
      convertUSDCtoPOL(usdcAmount).then(polValue => {
        setPolEquivalent(polValue.toFixed(4));
        setIsLoading(false);
      });
    } else {
      setPolEquivalent(null);
      setIsLoading(false);
    }
  }, [usdcAmount]);

  if (!usdcAmount || usdcAmount <= 0) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-semibold text-gray-900">
        {usdcAmount.toFixed(2)} USDC
      </span>
      {isLoading ? (
        <span className="text-sm text-gray-500">
          (calculating...)
        </span>
      ) : polEquivalent && (
        <span className="text-sm text-gray-600">
          ({showLabel && 'Equivalent: '}≈ {polEquivalent} POL)
        </span>
      )}
    </div>
  );
};

export default PriceComparisonDisplay;
