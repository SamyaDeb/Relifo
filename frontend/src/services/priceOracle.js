/**
 * Price Oracle Service
 * Fetches real-time cryptocurrency prices from CoinGecko API
 * Provides POL/USDC exchange rates for the donation flow
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 30000; // 30 seconds

// Price cache to avoid excessive API calls
let priceCache = {
  pol: null,
  usdc: null,
  lastUpdated: null
};

/**
 * Fetch current prices for POL and USDC from CoinGecko
 * @returns {Promise<{pol: number, usdc: number, timestamp: number}>}
 */
export const fetchPrices = async () => {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=matic-network,usd-coin&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch prices from CoinGecko');
    }
    
    const data = await response.json();
    
    const prices = {
      pol: data['matic-network']?.usd || 0,
      usdc: data['usd-coin']?.usd || 1, // USDC should always be ~$1
      timestamp: Date.now()
    };
    
    // Update cache
    priceCache = prices;
    
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    
    // Return cached prices if available
    if (priceCache.pol && priceCache.usdc) {
      return priceCache;
    }
    
    // Fallback prices if no cache available
    return {
      pol: 0.26, // Approximate fallback
      usdc: 1.0,
      timestamp: Date.now()
    };
  }
};

/**
 * Get cached prices or fetch new ones if cache is stale
 * @returns {Promise<{pol: number, usdc: number, timestamp: number}>}
 */
export const getPrices = async () => {
  const now = Date.now();
  
  // Return cached prices if still fresh
  if (priceCache.lastUpdated && (now - priceCache.lastUpdated) < CACHE_DURATION) {
    return priceCache;
  }
  
  // Fetch new prices
  return await fetchPrices();
};

/**
 * Calculate POL to USDC exchange rate
 * @returns {Promise<number>} - Amount of USDC per 1 POL
 */
export const getPOLtoUSDCRate = async () => {
  const prices = await getPrices();
  
  // Calculate exchange rate: POL price in USD / USDC price in USD
  const rate = prices.pol / prices.usdc;
  
  return rate;
};

/**
 * Calculate USDC to POL exchange rate
 * @returns {Promise<number>} - Amount of POL per 1 USDC
 */
export const getUSDCtoPOLRate = async () => {
  const rate = await getPOLtoUSDCRate();
  return 1 / rate; // Inverse of POL to USDC
};

/**
 * Convert POL amount to USDC value
 * @param {number} polAmount - Amount of POL
 * @returns {Promise<number>} - Equivalent USDC value
 */
export const convertPOLtoUSDC = async (polAmount) => {
  const rate = await getPOLtoUSDCRate();
  return polAmount * rate;
};

/**
 * Convert USDC amount to POL value
 * @param {number} usdcAmount - Amount of USDC
 * @returns {Promise<number>} - Equivalent POL value
 */
export const convertUSDCtoPOL = async (usdcAmount) => {
  const rate = await getUSDCtoPOLRate();
  return usdcAmount * rate;
};

/**
 * Get formatted price display string
 * @param {number} amount - The amount
 * @param {string} currency - Currency symbol (POL, USDC)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (amount, currency = 'USDC') => {
  const decimals = currency === 'USDC' ? 2 : 4;
  return `${amount.toFixed(decimals)} ${currency}`;
};

/**
 * Get time since last price update
 * @returns {string} - Human readable time string
 */
export const getLastUpdateTime = () => {
  if (!priceCache.timestamp) {
    return 'Never';
  }
  
  const seconds = Math.floor((Date.now() - priceCache.timestamp) / 1000);
  
  if (seconds < 10) {
    return 'Just now';
  } else if (seconds < 60) {
    return `${seconds}s ago`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }
};

/**
 * Create a price subscription that updates at regular intervals
 * @param {Function} callback - Function to call with updated prices
 * @param {number} interval - Update interval in milliseconds (default: 30s)
 * @returns {Function} - Cleanup function to stop subscription
 */
export const subscribeToPriceUpdates = (callback, interval = 30000) => {
  // Fetch initial prices
  getPrices().then(callback);
  
  // Set up interval for updates
  const intervalId = setInterval(async () => {
    const prices = await fetchPrices(); // Force fetch, ignore cache
    callback(prices);
  }, interval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

/**
 * Get exchange rate display for UI
 * @returns {Promise<{polToUsdc: string, usdcToPol: string, lastUpdate: string}>}
 */
export const getExchangeRateDisplay = async () => {
  const polToUsdc = await getPOLtoUSDCRate();
  const usdcToPol = await getUSDCtoPOLRate();
  
  return {
    polToUsdc: `1 POL = ${polToUsdc.toFixed(4)} USDC`,
    usdcToPol: `1 USDC = ${usdcToPol.toFixed(4)} POL`,
    lastUpdate: getLastUpdateTime()
  };
};

export default {
  fetchPrices,
  getPrices,
  getPOLtoUSDCRate,
  getUSDCtoPOLRate,
  convertPOLtoUSDC,
  convertUSDCtoPOL,
  formatPrice,
  getLastUpdateTime,
  subscribeToPriceUpdates,
  getExchangeRateDisplay
};
