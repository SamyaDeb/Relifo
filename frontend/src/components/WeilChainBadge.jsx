/**
 * WeilChain Verification Badge Component
 * 
 * Displays a verification badge showing whether a Polygon transaction
 * has been logged to WeilChain's immutable audit trail.
 * 
 * States:
 * - Loading: Checking verification status
 * - Verified: Transaction confirmed on WeilChain (green badge)
 * - Pending: Transaction not yet logged (yellow badge)
 * - Error: Verification check failed (gray badge)
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { verifyTransactionOnWeilChain, getAuditEntry } from '../services/weilchainAuditService';

/**
 * WeilChainBadge Component
 * 
 * @param {Object} props
 * @param {string} props.polygonTxHash - The Polygon transaction hash to verify
 * @param {boolean} [props.showDetails=false] - Whether to show detailed audit info on hover
 * @param {string} [props.size='sm'] - Badge size: 'xs', 'sm', 'md', 'lg'
 * @param {boolean} [props.showLink=true] - Whether to show link to WeilChain explorer
 * 
 * @example
 * <WeilChainBadge 
 *   polygonTxHash="0x123..." 
 *   showDetails={true}
 *   size="md"
 * />
 */
const WeilChainBadge = ({ 
  polygonTxHash, 
  showDetails = false,
  size = 'sm',
  showLink = true
}) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'verified' | 'pending' | 'error'
  const [auditEntry, setAuditEntry] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Size classes for different badge sizes
  const sizeClasses = {
    xs: 'text-xs px-2 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  // Icon size classes
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  useEffect(() => {
    let mounted = true;

    const verifyTransaction = async () => {
      if (!polygonTxHash) {
        setStatus('error');
        return;
      }

      try {
        // Wait a bit to allow transaction to be logged
        await new Promise(resolve => setTimeout(resolve, 2000));

        const isVerified = await verifyTransactionOnWeilChain(polygonTxHash);
        
        if (!mounted) return;

        if (isVerified) {
          setStatus('verified');
          
          // If details requested, fetch the full audit entry
          if (showDetails) {
            const entry = await getAuditEntry(polygonTxHash);
            if (mounted) {
              setAuditEntry(entry);
            }
          }
        } else {
          setStatus('pending');
          
          // Retry after 5 seconds if pending
          setTimeout(() => {
            if (mounted) verifyTransaction();
          }, 5000);
        }
      } catch (error) {
        console.error('Error verifying WeilChain transaction:', error);
        if (mounted) {
          setStatus('error');
        }
      }
    };

    verifyTransaction();

    return () => {
      mounted = false;
    };
  }, [polygonTxHash, showDetails]);

  // Badge content based on status
  const getBadgeContent = () => {
    switch (status) {
      case 'loading':
        return {
          icon: (
            <svg className={`animate-spin ${iconSizes[size]}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          text: 'Checking',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-300'
        };
      
      case 'verified':
        return {
          icon: (
            <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          text: 'Verified on WeilChain',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-300'
        };
      
      case 'pending':
        return {
          icon: (
            <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          ),
          text: 'Pending',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-300'
        };
      
      default: // error
        return {
          icon: (
            <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          text: 'Check Failed',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          borderColor: 'border-gray-300'
        };
    }
  };

  const { icon, text, bgColor, textColor, borderColor } = getBadgeContent();

  // WeilChain explorer link
  const explorerUrl = polygonTxHash && status === 'verified'
    ? `https://explorer.unweil.me/tx/${polygonTxHash}`
    : null;

  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-full border
          ${sizeClasses[size]} ${bgColor} ${textColor} ${borderColor}
          font-medium transition-all duration-200
          ${explorerUrl && showLink ? 'cursor-pointer hover:shadow-md' : ''}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => explorerUrl && showLink && window.open(explorerUrl, '_blank')}
      >
        {icon}
        <span className="whitespace-nowrap">{text}</span>
        {explorerUrl && showLink && (
          <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        )}
      </div>

      {/* Tooltip with details */}
      {showDetails && showTooltip && auditEntry && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
            <div className="font-semibold mb-2 text-purple-300">WeilChain Audit Entry</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Entry ID:</span>
                <span className="font-mono">{auditEntry.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span>{auditEntry.transaction_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span>{auditEntry.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Block:</span>
                <span>{auditEntry.block_number}</span>
              </div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeilChainBadge;
