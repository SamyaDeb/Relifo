/**
 * Polygon Service - Web3 interactions for Relifo platform
 * Uses wagmi/viem for Polygon Amoy testnet
 */

import { getContract } from 'viem';
import { polygonAmoy } from 'wagmi/chains';

// Import contract ABIs
import ReliefTokenABI from '../contracts/ReliefToken.json';
import CampaignFactoryABI from '../contracts/CampaignFactory.json';
import CampaignABI from '../contracts/Campaign.json';
import BeneficiaryWalletABI from '../contracts/BeneficiaryWallet.json';

// Import deployed contract addresses
import contractAddresses from '../contracts/addresses.json';

// Network configuration
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology';

// Contract addresses
export const CONTRACTS = {
  reliefToken: contractAddresses.contracts.ReliefToken,
  reliefTokenSale: contractAddresses.contracts.ReliefTokenSale,
  campaignFactory: contractAddresses.contracts.CampaignFactory,
};

/**
 * Check if MetaMask is installed
 */
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

/**
 * Get MetaMask provider
 */
export const getProvider = () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }
  return window.ethereum;
};

/**
 * Connect to MetaMask wallet
 * @returns {Promise<string>} Connected wallet address
 */
export const connectWallet = async () => {
  try {
    const provider = getProvider();
    
    // Request account access
    const accounts = await provider.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }
    
    const address = accounts[0];
    
    // Check if on correct network
    const chainId = await provider.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== POLYGON_AMOY_CHAIN_ID) {
      await switchToPolygonAmoy();
    }
    
    return address;
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('Connection rejected by user');
    }
    throw error;
  }
};

/**
 * Get current connected wallet address
 * @returns {Promise<string|null>} Wallet address or null if not connected
 */
export const getWalletAddress = async () => {
  try {
    const provider = getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
};

/**
 * Switch to Polygon Amoy testnet
 */
export const switchToPolygonAmoy = async () => {
  try {
    const provider = getProvider();
    
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: {
                name: 'POL',
                symbol: 'POL',
                decimals: 18,
              },
              rpcUrls: [POLYGON_AMOY_RPC],
              blockExplorerUrls: ['https://amoy.polygonscan.com/'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Polygon Amoy network to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to Polygon Amoy network');
    }
  }
};

/**
 * Get current network chain ID
 * @returns {Promise<number>} Chain ID
 */
export const getCurrentChainId = async () => {
  try {
    const provider = getProvider();
    const chainId = await provider.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
};

/**
 * Check if connected to Polygon Amoy
 * @returns {Promise<boolean>}
 */
export const isConnectedToPolygonAmoy = async () => {
  const chainId = await getCurrentChainId();
  return chainId === POLYGON_AMOY_CHAIN_ID;
};

/**
 * Get ReliefToken contract instance
 * @param {object} walletClient - Viem wallet client
 * @returns {object} Contract instance
 */
export const getReliefTokenContract = (walletClient) => {
  if (!CONTRACTS.reliefToken) {
    throw new Error('ReliefToken address not configured');
  }
  
  return getContract({
    address: CONTRACTS.reliefToken,
    abi: ReliefTokenABI.abi,
    client: walletClient,
  });
};

/**
 * Get CampaignFactory contract instance
 * @param {object} walletClient - Viem wallet client
 * @returns {object} Contract instance
 */
export const getCampaignFactoryContract = (walletClient) => {
  if (!CONTRACTS.campaignFactory) {
    throw new Error('CampaignFactory address not configured');
  }
  
  return getContract({
    address: CONTRACTS.campaignFactory,
    abi: CampaignFactoryABI.abi,
    client: walletClient,
  });
};

/**
 * Get Campaign contract instance
 * @param {string} campaignAddress - Campaign contract address
 * @param {object} walletClient - Viem wallet client
 * @returns {object} Contract instance
 */
export const getCampaignContract = (campaignAddress, walletClient) => {
  if (!campaignAddress) {
    throw new Error('Campaign address is required');
  }
  
  return getContract({
    address: campaignAddress,
    abi: CampaignABI.abi,
    client: walletClient,
  });
};

/**
 * Get BeneficiaryWallet contract instance
 * @param {string} walletAddress - Beneficiary wallet contract address
 * @param {object} walletClient - Viem wallet client
 * @returns {object} Contract instance
 */
export const getBeneficiaryWalletContract = (walletAddress, walletClient) => {
  if (!walletAddress) {
    throw new Error('Beneficiary wallet address is required');
  }
  
  return getContract({
    address: walletAddress,
    abi: BeneficiaryWalletABI.abi,
    client: walletClient,
  });
};

/**
 * Get wallet balance (POL)
 * @param {string} address - Wallet address
 * @returns {Promise<string>} Balance in POL
 */
export const getBalance = async (address) => {
  try {
    const provider = getProvider();
    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    // Convert from wei to POL
    return (parseInt(balance, 16) / 1e18).toFixed(4);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};

/**
 * Format wallet address for display
 * @param {string} address - Full wallet address
 * @returns {string} Formatted address (0x1234...5678)
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Parse error message from contract call
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const parseContractError = (error) => {
  if (!error) return 'Unknown error occurred';
  
  const message = error.message || error.toString();
  
  // User rejected transaction
  if (message.includes('User denied') || message.includes('User rejected')) {
    return 'Transaction was rejected';
  }
  
  // Insufficient funds
  if (message.includes('insufficient funds')) {
    return 'Insufficient POL for transaction fee';
  }
  
  // Contract revert with reason
  if (message.includes('revert')) {
    const match = message.match(/revert (.+?)(?:"|$)/);
    if (match && match[1]) {
      return match[1];
    }
    return 'Transaction failed';
  }
  
  // Network error
  if (message.includes('network')) {
    return 'Network error. Please check your connection';
  }
  
  return 'Transaction failed. Please try again';
};

/**
 * Wait for transaction confirmation
 * @param {string} txHash - Transaction hash
 * @returns {Promise<object>} Transaction receipt
 */
export const waitForTransaction = async (txHash) => {
  const provider = getProvider();
  
  return new Promise((resolve, reject) => {
    const checkReceipt = async () => {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        
        if (receipt) {
          if (receipt.status === '0x1') {
            resolve(receipt);
          } else {
            reject(new Error('Transaction failed'));
          }
        } else {
          // Check again in 2 seconds
          setTimeout(checkReceipt, 2000);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    checkReceipt();
  });
};

/**
 * Get PolygonScan transaction URL
 * @param {string} txHash - Transaction hash
 * @returns {string} PolygonScan URL
 */
export const getPolygonScanUrl = (txHash) => {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
};

/**
 * Get PolygonScan address URL
 * @param {string} address - Contract or wallet address
 * @returns {string} PolygonScan URL
 */
export const getPolygonScanAddressUrl = (address) => {
  return `https://amoy.polygonscan.com/address/${address}`;
};

/**
 * Add token to MetaMask
 * @param {string} tokenAddress - Token contract address
 * @param {string} tokenSymbol - Token symbol
 * @param {number} tokenDecimals - Token decimals
 */
export const addTokenToMetaMask = async (
  tokenAddress = CONTRACTS.reliefToken,
  tokenSymbol = 'RELIEF',
  tokenDecimals = 18
) => {
  try {
    const provider = getProvider();
    
    await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
        },
      },
    });
  } catch (error) {
    console.error('Error adding token to MetaMask:', error);
    throw error;
  }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('accountsChanged', callback);
  }
};

// Listen for chain changes
export const onChainChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('chainChanged', callback);
  }
};

// Remove listeners
export const removeAccountsChangedListener = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.removeListener('accountsChanged', callback);
  }
};

export const removeChainChangedListener = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.removeListener('chainChanged', callback);
  }
};

export default {
  // Wallet functions
  connectWallet,
  getWalletAddress,
  isMetaMaskInstalled,
  getBalance,
  formatAddress,
  
  // Network functions
  switchToPolygonAmoy,
  getCurrentChainId,
  isConnectedToPolygonAmoy,
  
  // Contract functions
  getReliefTokenContract,
  getCampaignFactoryContract,
  getCampaignContract,
  getBeneficiaryWalletContract,
  
  // Utility functions
  parseContractError,
  waitForTransaction,
  getPolygonScanUrl,
  getPolygonScanAddressUrl,
  addTokenToMetaMask,
  
  // Event listeners
  onAccountsChanged,
  onChainChanged,
  removeAccountsChangedListener,
  removeChainChangedListener,
  
  // Constants
  CONTRACTS,
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_RPC,
};
