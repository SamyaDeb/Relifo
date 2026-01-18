/**
 * WeilChain Audit Trail Service
 * 
 * This service provides functions to log Polygon transactions to WeilChain
 * and verify their existence for cross-chain audit trail functionality.
 * 
 * Features:
 * - Log transactions to WeilChain immutable audit trail
 * - Verify transactions by Polygon hash
 * - Retrieve audit statistics
 * - Get recent audit entries
 * - Automatic retry with exponential backoff
 * 
 * @module weilchainAuditService
 */

import { WeilWallet } from '@weilliptic/weil-sdk';

// Configuration from environment variables
const SENTINEL_URL = import.meta.env.VITE_WEILCHAIN_SENTINEL_URL || 'https://sentinel.unweil.me';
const AUDIT_CONTRACT = import.meta.env.VITE_WEILCHAIN_AUDIT_CONTRACT;
const SIGNER_KEY = import.meta.env.VITE_WEILCHAIN_SIGNER_KEY;

// Transaction type constants matching the WeilChain contract
export const TRANSACTION_TYPES = {
  DONATION: 'Donation',
  ALLOCATION: 'Allocation',
  BENEFICIARY_SPENDING: 'BeneficiarySpending',
  MERCHANT_PAYMENT: 'MerchantPayment',
  WITHDRAWAL: 'Withdrawal'
};

/**
 * Create a WeilWallet instance for signing transactions
 * @private
 * @returns {WeilWallet} Configured wallet instance
 */
const getSignerWallet = () => {
  if (!SIGNER_KEY) {
    throw new Error('VITE_WEILCHAIN_SIGNER_KEY not configured in .env.local');
  }
  if (!AUDIT_CONTRACT) {
    throw new Error('VITE_WEILCHAIN_AUDIT_CONTRACT not configured in .env.local');
  }
  
  return new WeilWallet({
    privateKey: SIGNER_KEY,
    sentinelEndpoint: SENTINEL_URL
  });
};

/**
 * Create a read-only WeilWallet instance (no private key needed)
 * @private
 * @returns {WeilWallet} Read-only wallet instance
 */
const getReadOnlyWallet = () => {
  if (!AUDIT_CONTRACT) {
    throw new Error('VITE_WEILCHAIN_AUDIT_CONTRACT not configured in .env.local');
  }
  
  // Use a dummy key for read-only operations
  return new WeilWallet({
    privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
    sentinelEndpoint: SENTINEL_URL
  });
};

/**
 * Parse WeilChain contract execution result
 * @private
 * @param {Object} result - Raw result from WeilChain
 * @returns {Object} Parsed result
 */
const parseResult = (result) => {
  if (!result) return null;
  
  // Check if the result has txn_result field
  if (result.txn_result) {
    try {
      const parsed = JSON.parse(result.txn_result);
      
      // Handle Ok/Err result types
      if (parsed.Ok !== undefined) {
        // If Ok value is a JSON string, parse it again
        if (typeof parsed.Ok === 'string') {
          try {
            return JSON.parse(parsed.Ok);
          } catch {
            return parsed.Ok;
          }
        }
        return parsed.Ok;
      }
      
      if (parsed.Err !== undefined) {
        throw new Error(parsed.Err);
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing WeilChain result:', error);
      return result.txn_result;
    }
  }
  
  return result;
};

/**
 * Execute a WeilChain contract call with retry logic for timeout handling
 * @private
 * @param {Function} fn - Function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms for exponential backoff
 * @returns {Promise<*>} Result of the function
 */
const executeWithRetry = async (fn, maxRetries = 3, baseDelay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      const isTimeout = error.message?.includes('deadline') || error.message?.includes('timeout');
      
      if (!isTimeout || isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = baseDelay * Math.pow(2, i);
      console.log(`WeilChain timeout, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Log a Polygon transaction to the WeilChain audit trail
 * 
 * @param {Object} txData - Transaction data
 * @param {string} txData.polygonTxHash - Polygon transaction hash
 * @param {string} txData.fromAddress - Sender address
 * @param {string} txData.toAddress - Recipient address
 * @param {string} txData.amount - Amount (in wei or smallest unit)
 * @param {string} txData.transactionType - Type from TRANSACTION_TYPES
 * @param {string} txData.campaignId - Campaign identifier
 * @param {number} txData.blockNumber - Polygon block number
 * @param {Object} [txData.metadata={}] - Additional metadata (will be stringified)
 * @returns {Promise<string>} Entry ID on success
 * @throws {Error} If logging fails
 * 
 * @example
 * const entryId = await logTransactionToWeilChain({
 *   polygonTxHash: '0x123...',
 *   fromAddress: '0xabc...',
 *   toAddress: '0xdef...',
 *   amount: '1000000000000000000',
 *   transactionType: TRANSACTION_TYPES.DONATION,
 *   campaignId: 'campaign_001',
 *   blockNumber: 12345678,
 *   metadata: { donor: 'Alice', campaign: 'Relief Fund' }
 * });
 */
export const logTransactionToWeilChain = async (txData) => {
  try {
    const wallet = getSignerWallet();
    
    const {
      polygonTxHash,
      fromAddress,
      toAddress,
      amount,
      transactionType,
      campaignId = '',
      blockNumber = 0,
      metadata = {}
    } = txData;
    
    // Validate required fields
    if (!polygonTxHash || !fromAddress || !toAddress || !amount || !transactionType) {
      throw new Error('Missing required transaction data for WeilChain logging');
    }
    
    // Convert amount to u64 (remove decimals if present)
    const amountU64 = parseInt(amount.toString().split('.')[0]);
    
    // Stringify metadata
    const metadataStr = JSON.stringify(metadata);
    
    console.log('📝 Logging to WeilChain:', {
      polygonTxHash,
      transactionType,
      amount: amountU64
    });
    
    // Execute with retry logic
    const result = await executeWithRetry(async () => {
      return await wallet.contracts.execute(
        AUDIT_CONTRACT,
        'log_transaction',
        {
          polygon_tx_hash: polygonTxHash.toLowerCase(),
          from_address: fromAddress.toLowerCase(),
          to_address: toAddress.toLowerCase(),
          amount: amountU64,
          transaction_type: transactionType,
          campaign_id: campaignId,
          block_number: blockNumber,
          metadata: metadataStr
        }
      );
    });
    
    const entryId = parseResult(result);
    console.log('✅ WeilChain audit entry created:', entryId);
    
    return entryId;
  } catch (error) {
    console.error('❌ Failed to log to WeilChain:', error.message);
    
    // Don't throw - WeilChain logging should not block the main transaction
    // Log the error and continue
    if (error.message?.includes('already logged')) {
      console.log('ℹ️ Transaction already logged to WeilChain (duplicate prevention)');
      return 'DUPLICATE';
    }
    
    return null;
  }
};

/**
 * Verify if a Polygon transaction has been logged to WeilChain
 * 
 * @param {string} polygonTxHash - Polygon transaction hash to verify
 * @returns {Promise<boolean>} True if transaction is verified on WeilChain
 * 
 * @example
 * const isVerified = await verifyTransactionOnWeilChain('0x123...');
 * if (isVerified) {
 *   console.log('Transaction verified on WeilChain!');
 * }
 */
export const verifyTransactionOnWeilChain = async (polygonTxHash) => {
  try {
    const wallet = getReadOnlyWallet();
    
    const result = await executeWithRetry(async () => {
      return await wallet.contracts.execute(
        AUDIT_CONTRACT,
        'verify_transaction',
        { polygon_tx_hash: polygonTxHash.toLowerCase() }
      );
    });
    
    const isVerified = parseResult(result);
    return isVerified === true || isVerified === 'true';
  } catch (error) {
    console.error('Error verifying transaction on WeilChain:', error.message);
    return false;
  }
};

/**
 * Get detailed audit entry for a Polygon transaction
 * 
 * @param {string} polygonTxHash - Polygon transaction hash
 * @returns {Promise<Object|null>} Audit entry or null if not found
 * 
 * @example
 * const entry = await getAuditEntry('0x123...');
 * console.log(entry.amount, entry.transaction_type, entry.timestamp);
 */
export const getAuditEntry = async (polygonTxHash) => {
  try {
    const wallet = getReadOnlyWallet();
    
    const result = await executeWithRetry(async () => {
      return await wallet.contracts.execute(
        AUDIT_CONTRACT,
        'get_entry_by_tx_hash',
        { polygon_tx_hash: polygonTxHash.toLowerCase() }
      );
    });
    
    return parseResult(result);
  } catch (error) {
    console.error('Error getting audit entry:', error.message);
    return null;
  }
};

/**
 * Get audit trail statistics
 * 
 * @returns {Promise<Object>} Statistics object with total_entries, total_donations_logged, etc.
 * 
 * @example
 * const stats = await getAuditStats();
 * console.log(`Total entries: ${stats.total_entries}`);
 * console.log(`Total donations: ${stats.total_donations_logged}`);
 */
export const getAuditStats = async () => {
  try {
    const wallet = getReadOnlyWallet();
    
    const result = await executeWithRetry(async () => {
      return await wallet.contracts.execute(
        AUDIT_CONTRACT,
        'get_stats',
        {}
      );
    });
    
    return parseResult(result) || {
      total_entries: 0,
      total_donations_logged: 0,
      total_amount_tracked: 0,
      last_entry_timestamp: 0
    };
  } catch (error) {
    console.error('Error getting audit stats:', error.message);
    return {
      total_entries: 0,
      total_donations_logged: 0,
      total_amount_tracked: 0,
      last_entry_timestamp: 0
    };
  }
};

/**
 * Get recent audit entries
 * 
 * @param {number} limit - Maximum number of entries to retrieve
 * @returns {Promise<Array>} Array of recent audit entries
 * 
 * @example
 * const recent = await getRecentAuditEntries(10);
 * recent.forEach(entry => console.log(entry.polygon_tx_hash));
 */
export const getRecentAuditEntries = async (limit = 10) => {
  try {
    const wallet = getReadOnlyWallet();
    
    const result = await executeWithRetry(async () => {
      return await wallet.contracts.execute(
        AUDIT_CONTRACT,
        'get_recent_entries',
        { limit: limit }
      );
    });
    
    return parseResult(result) || [];
  } catch (error) {
    console.error('Error getting recent entries:', error.message);
    return [];
  }
};

/**
 * Check if WeilChain audit service is configured and available
 * 
 * @returns {Promise<boolean>} True if service is available
 * 
 * @example
 * if (await isWeilChainAvailable()) {
 *   console.log('WeilChain audit trail is ready!');
 * }
 */
export const isWeilChainAvailable = async () => {
  try {
    if (!AUDIT_CONTRACT || !SENTINEL_URL) {
      return false;
    }
    
    // Try to get stats as a health check
    await getAuditStats();
    return true;
  } catch {
    return false;
  }
};

// Export configuration for debugging
export const getConfig = () => ({
  sentinelUrl: SENTINEL_URL,
  contractAddress: AUDIT_CONTRACT,
  hasSignerKey: !!SIGNER_KEY
});
