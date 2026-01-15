import { ethers } from 'ethers';

/**
 * USDC Faucet Helper for Testnet
 * Allows users to get testnet USDC easily
 */

const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;

const USDC_ABI = [
  'function faucet(uint256 amount) external',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/**
 * Get USDC from the testnet faucet
 * @param {ethers.providers.Web3Provider} provider - Connected wallet provider
 * @param {string} amount - Amount of USDC to request (default: 100)
 * @returns {Promise<Object>} Transaction receipt and details
 */
export async function getUSDCFromFaucet(provider, amount = '100') {
  try {
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    
    // Get balance before
    const balanceBefore = await usdc.balanceOf(address);
    
    // Request USDC from faucet
    const amountInDecimals = ethers.parseUnits(amount, 6); // USDC has 6 decimals
    console.log(`Requesting ${amount} USDC from faucet...`);
    
    const tx = await usdc.faucet(amountInDecimals);
    console.log(`Transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get balance after
    const balanceAfter = await usdc.balanceOf(address);
    const received = balanceAfter - balanceBefore;
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      amount: amount,
      received: ethers.formatUnits(received, 6),
      balanceBefore: ethers.formatUnits(balanceBefore, 6),
      balanceAfter: ethers.formatUnits(balanceAfter, 6),
      explorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`
    };
  } catch (error) {
    console.error('Faucet error:', error);
    
    // Handle specific errors
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    }
    
    throw new Error(error.message || 'Failed to get USDC from faucet');
  }
}

/**
 * Check USDC balance
 * @param {ethers.providers.Web3Provider} provider - Connected wallet provider
 * @returns {Promise<string>} USDC balance formatted
 */
export async function getUSDCBalance(provider) {
  try {
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const balance = await usdc.balanceOf(address);
    
    return ethers.formatUnits(balance, 6);
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}

/**
 * Check if user needs USDC (balance below threshold)
 * @param {ethers.providers.Web3Provider} provider - Connected wallet provider
 * @param {string} threshold - Minimum balance threshold (default: 10)
 * @returns {Promise<boolean>} True if user needs USDC
 */
export async function needsUSDC(provider, threshold = '10') {
  try {
    const balance = await getUSDCBalance(provider);
    return parseFloat(balance) < parseFloat(threshold);
  } catch (error) {
    return true; // Assume needs USDC if error
  }
}

/**
 * Get USDC contract details
 * @param {ethers.providers.Web3Provider} provider - Connected wallet provider
 * @returns {Promise<Object>} USDC contract info
 */
export async function getUSDCInfo(provider) {
  try {
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const [symbol, decimals] = await Promise.all([
      usdc.symbol(),
      usdc.decimals()
    ]);
    
    return {
      address: USDC_ADDRESS,
      symbol,
      decimals: Number(decimals),
      explorerUrl: `https://amoy.polygonscan.com/address/${USDC_ADDRESS}`
    };
  } catch (error) {
    console.error('Error getting USDC info:', error);
    return {
      address: USDC_ADDRESS,
      symbol: 'USDC',
      decimals: 6,
      explorerUrl: `https://amoy.polygonscan.com/address/${USDC_ADDRESS}`
    };
  }
}

export default {
  getUSDCFromFaucet,
  getUSDCBalance,
  needsUSDC,
  getUSDCInfo
};
