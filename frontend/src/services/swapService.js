/**
 * POL to USDC Swap Service
 * Allows donors to swap POL → USDC on your website
 * 
 * Usage:
 *   const usdcAmount = await swapPOLtoUSDC(web3Provider, 0.5);
 */

import { ethers } from 'ethers';

// Addresses
const SWAP_CONTRACT_ADDRESS = import.meta.env.VITE_POL_USDC_SWAP_ADDRESS;
const USDC_ADDRESS = '0x41E94cA92cD8D48f89f8059ffc125265ce440722';

// Simple ABI for swap contract
const SWAP_ABI = [
  'function swapPOLtoUSDC() external payable returns (uint256)',
  'function getEstimatedUSDCOut(uint256 polAmount) external pure returns (uint256)',
  'function minUSDCOut() external view returns (uint256)',
  'event SwapExecuted(address indexed donor, uint256 polAmount, uint256 usdcAmount, uint256 timestamp)'
];

const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

/**
 * Get estimated USDC output for given POL amount
 * @param {number} polAmount - POL amount to swap
 * @returns {Promise<number>} Estimated USDC amount
 */
export const getEstimatedSwapAmount = async (polAmount) => {
  try {
    if (!polAmount || polAmount === 0) return 0;

    // Use public RPC (no wallet needed for read)
    const provider = new ethers.JsonRpcProvider(
      import.meta.env.VITE_POLYGON_RPC_URL
    );
    
    const contract = new ethers.Contract(SWAP_CONTRACT_ADDRESS, SWAP_ABI, provider);
    
    // Convert POL to wei
    const polWei = ethers.parseEther(polAmount.toString());
    
    // Get estimated output
    const usdcAmount = await contract.getEstimatedUSDCOut(polWei);
    
    // Convert back from wei (USDC has 6 decimals)
    return Number(ethers.formatUnits(usdcAmount, 6));
  } catch (error) {
    console.error('Error getting estimated swap amount:', error);
    return 0;
  }
};

/**
 * Execute POL → USDC swap
 * @param {ethers.BrowserProvider} provider - Web3 provider from user's wallet
 * @param {number} polAmount - Amount of POL to swap
 * @returns {Promise<{success: boolean, usdcAmount: number, txHash: string, error: string}>}
 */
export const swapPOLtoUSDC = async (provider, polAmount) => {
  try {
    if (!provider) {
      throw new Error('Web3 provider not found. Please connect wallet.');
    }

    if (!polAmount || polAmount <= 0) {
      throw new Error('Please enter a valid POL amount');
    }

    if (!SWAP_CONTRACT_ADDRESS) {
      throw new Error('Swap contract address not configured');
    }

    // Get signer
    const signer = await provider.getSigner();
    
    // Create contract instance
    const contract = new ethers.Contract(
      SWAP_CONTRACT_ADDRESS,
      SWAP_ABI,
      signer
    );

    // Convert POL to wei
    const polWei = ethers.parseEther(polAmount.toString());

    console.log(`Swapping ${polAmount} POL for USDC...`);

    // Call swapPOLtoUSDC function with POL value
    const tx = await contract.swapPOLtoUSDC({
      value: polWei,
      gasLimit: 500000 // Set gas limit
    });

    console.log('Transaction submitted:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('Transaction confirmed:', receipt.hash);

    // Get USDC amount from event
    const event = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(e => e?.name === 'SwapExecuted');

    const usdcAmount = event 
      ? Number(ethers.formatUnits(event.args.usdcAmount, 6))
      : await getEstimatedSwapAmount(polAmount);

    return {
      success: true,
      usdcAmount,
      txHash: receipt.hash,
      error: null
    };
  } catch (error) {
    console.error('Swap error:', error);
    return {
      success: false,
      usdcAmount: 0,
      txHash: null,
      error: error.message || 'Swap failed. Please try again.'
    };
  }
};

/**
 * Get user's USDC balance
 * @param {ethers.BrowserProvider} provider - Web3 provider
 * @param {string} userAddress - User's wallet address
 * @returns {Promise<number>} USDC balance
 */
export const getUSDCBalance = async (provider, userAddress) => {
  try {
    const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return Number(ethers.formatUnits(balance, 6)); // USDC has 6 decimals
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return 0;
  }
};

/**
 * Get real-time POL/USDC rate from CoinGecko
 * @returns {Promise<number>} POL price in USDC
 */
export const getPOLtoUSDCRate = async () => {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,usd-coin&vs_currencies=usd'
    );
    const data = await response.json();
    
    const polPrice = data['matic-network'].usd;
    const usdcPrice = data['usd-coin'].usd;
    
    // How many USDC = 1 POL
    const rate = polPrice / usdcPrice;
    
    return {
      rate: rate.toFixed(4),
      polPrice: polPrice.toFixed(2),
      usdcPrice: usdcPrice.toFixed(2),
      timestamp: new Date().toLocaleTimeString()
    };
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return null;
  }
};

export default {
  swapPOLtoUSDC,
  getEstimatedSwapAmount,
  getUSDCBalance,
  getPOLtoUSDCRate
};