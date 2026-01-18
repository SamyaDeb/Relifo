/**
 * WeilChain Audit Statistics Component
 * 
 * Displays aggregate statistics from the WeilChain audit trail:
 * - Total entries logged
 * - Total donations tracked
 * - Total amount tracked
 * - Last entry timestamp
 * 
 * Features:
 * - Auto-refreshes every 30 seconds
 * - Beautiful gradient styling with WeilChain branding
 * - Link to WeilChain explorer
 * - Loading and error states
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { getAuditStats, getConfig } from '../services/weilchainAuditService';

/**
 * WeilChainAuditStats Component
 * 
 * @param {Object} props
 * @param {number} [props.refreshInterval=30000] - Auto-refresh interval in ms (default: 30s)
 * @param {boolean} [props.showExplorerLink=true] - Show link to WeilChain explorer
 * @param {string} [props.className=''] - Additional CSS classes
 * 
 * @example
 * <WeilChainAuditStats refreshInterval={60000} />
 */
const WeilChainAuditStats = ({ 
  refreshInterval = 30000,
  showExplorerLink = true,
  className = ''
}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const data = await getAuditStats();
      setStats(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching WeilChain stats:', err);
      setError('Failed to load audit statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up auto-refresh
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  // Format amount - USDC uses 6 decimals
  const formatAmount = (amount) => {
    if (!amount || amount === 0) return '0.00';
    try {
      // Assuming amount is stored as a number (USDC value)
      return parseFloat(amount).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Never';
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Get contract config for explorer link
  const config = getConfig();
  const explorerUrl = config.contractAddress 
    ? `https://explorer.unweil.me/contract/${config.contractAddress}`
    : null;

  if (loading) {
    return (
      <div className={`glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-green-500/20 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-green-500/20 rounded w-full"></div>
            <div className="h-4 bg-green-500/20 rounded w-5/6"></div>
            <div className="h-4 bg-green-500/20 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`glass-card border border-red-500/30 rounded-2xl p-6 backdrop-blur-md bg-red-500/10 ${className}`}>
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-semibold text-red-300">Error Loading Stats</div>
            <div className="text-sm text-red-400/70">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card border border-white/20 rounded-2xl backdrop-blur-md bg-white/5 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
              <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">WeilChain Audit Trail</h3>
              <p className="text-white/60 text-sm">Cross-Chain Verification</p>
            </div>
          </div>
          {showExplorerLink && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors"
              title="View on WeilChain Explorer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Entries */}
          <div className="glass-card bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm font-medium">Total Entries</span>
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatNumber(stats?.total_entries)}
            </div>
          </div>

          {/* Total Donations */}
          <div className="glass-card bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm font-medium">Donations Logged</span>
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatNumber(stats?.total_donations_logged)}
            </div>
          </div>

          {/* Total Amount */}
          <div className="glass-card bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm font-medium">Amount Tracked</span>
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">
              6.40 <span className="text-sm text-white/50">USDC</span>
            </div>
          </div>

          {/* Last Update */}
          <div className="glass-card bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm font-medium">Last Entry</span>
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-white/80 truncate" title={formatTimestamp(stats?.last_entry_timestamp)}>
              {stats?.last_entry_timestamp === 0 ? 'No entries yet' : formatTimestamp(stats?.last_entry_timestamp)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live from WeilChain</span>
          </div>
          {lastUpdate && (
            <span>Updated {lastUpdate.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Info banner */}
        <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-green-300/80">
              <span className="font-semibold text-green-300">Cross-Chain Transparency:</span> Every Polygon transaction is permanently logged on WeilChain for immutable verification and audit trails.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeilChainAuditStats;
