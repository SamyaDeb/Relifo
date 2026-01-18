/**
 * USDC Donation Service
 * Handles the complete flow: USDC → RELIEF tokens → Campaign donation
 * 
 * Flow:
 * 1. Check USDC balance
 * 2. Approve USDC for ReliefTokenSale
 * 3. Buy RELIEF tokens with USDC
 * 4. Approve RELIEF for Campaign
 * 5. Donate RELIEF to campaign
 * 6. Log transaction to WeilChain audit trail
 */

import { ethers } from 'ethers';
import { logTransactionToWeilChain, TRANSACTION_TYPES } from './weilchainAuditService';

// Contract addresses from env
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;
const RELIEF_TOKEN_ADDRESS = import.meta.env.VITE_RELIEF_TOKEN_ADDRESS;
const RELIEF_TOKEN_SALE_ADDRESS = import.meta.env.VITE_RELIEF_TOKEN_SALE_ADDRESS;

// ABIs
const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const RELIEF_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const RELIEF_TOKEN_SALE_ABI = [
  'function buyTokens(uint256 usdcAmount) external',
  'function calculateTokenAmount(uint256 usdcAmount) external pure returns (uint256)',
  'function MIN_PURCHASE() external view returns (uint256)',
  'function MAX_PURCHASE() external view returns (uint256)'
];

const CAMPAIGN_ABI = [
  'function donate(uint256 amount) external',
  'function campaignInfo() external view returns (tuple(string title, string description, uint256 goalAmount, uint256 raisedAmount, string location, string disasterType, address organizer, address admin, uint8 status, uint256 createdAt))',
  'function donorContributions(address donor) external view returns (uint256)'
];

/**
 * Get user's USDC balance
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
 * Get user's RELIEF token balance
 */
export const getRELIEFBalance = async (provider, userAddress) => {
  try {
    const contract = new ethers.Contract(RELIEF_TOKEN_ADDRESS, RELIEF_TOKEN_ABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return Number(ethers.formatEther(balance)); // RELIEF has 18 decimals
  } catch (error) {
    console.error('Error getting RELIEF balance:', error);
    return 0;
  }
};

/**
 * Check if USDC is approved for ReliefTokenSale
 */
export const checkUSDCApproval = async (provider, userAddress, usdcAmount) => {
  try {
    const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const allowance = await contract.allowance(userAddress, RELIEF_TOKEN_SALE_ADDRESS);
    const usdcAmountWei = ethers.parseUnits(usdcAmount.toString(), 6);
    return allowance >= usdcAmountWei;
  } catch (error) {
    console.error('Error checking USDC approval:', error);
    return false;
  }
};

/**
 * Approve USDC spending for ReliefTokenSale
 */
export const approveUSDC = async (provider, usdcAmount) => {
  try {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    
    const usdcAmountWei = ethers.parseUnits(usdcAmount.toString(), 6);
    
    console.log(`Approving ${usdcAmount} USDC for ReliefTokenSale...`);
    const tx = await contract.approve(RELIEF_TOKEN_SALE_ADDRESS, usdcAmountWei);
    console.log('Approval transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('USDC approved successfully!');
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error approving USDC:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Buy RELIEF tokens with USDC
 */
export const buyReliefTokens = async (provider, usdcAmount) => {
  try {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      RELIEF_TOKEN_SALE_ADDRESS,
      RELIEF_TOKEN_SALE_ABI,
      signer
    );
    
    const usdcAmountWei = ethers.parseUnits(usdcAmount.toString(), 6);
    
    console.log(`Buying RELIEF tokens with ${usdcAmount} USDC...`);
    const tx = await contract.buyTokens(usdcAmountWei);
    console.log('Purchase transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('RELIEF tokens purchased successfully!');
    
    return { success: true, txHash: tx.hash, reliefAmount: usdcAmount };
  } catch (error) {
    console.error('Error buying RELIEF tokens:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if RELIEF is approved for Campaign
 */
export const checkRELIEFApproval = async (provider, userAddress, campaignAddress, reliefAmount) => {
  try {
    const contract = new ethers.Contract(RELIEF_TOKEN_ADDRESS, RELIEF_TOKEN_ABI, provider);
    const allowance = await contract.allowance(userAddress, campaignAddress);
    const reliefAmountWei = ethers.parseEther(reliefAmount.toString());
    return allowance >= reliefAmountWei;
  } catch (error) {
    console.error('Error checking RELIEF approval:', error);
    return false;
  }
};

/**
 * Approve RELIEF spending for Campaign
 */
export const approveRELIEF = async (provider, campaignAddress, reliefAmount) => {
  try {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(RELIEF_TOKEN_ADDRESS, RELIEF_TOKEN_ABI, signer);
    
    const reliefAmountWei = ethers.parseEther(reliefAmount.toString());
    
    console.log(`Approving ${reliefAmount} RELIEF for campaign...`);
    const tx = await contract.approve(campaignAddress, reliefAmountWei);
    console.log('Approval transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('RELIEF approved successfully!');
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error approving RELIEF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Donate RELIEF tokens to campaign
 */
export const donateToCampaign = async (provider, campaignAddress, reliefAmount, campaignMetadata = {}) => {
  try {
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, signer);
    
    const reliefAmountWei = ethers.parseEther(reliefAmount.toString());
    
    console.log(`Donating ${reliefAmount} RELIEF to campaign...`);
    const tx = await contract.donate(reliefAmountWei);
    console.log('Donation transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Donation successful!');
    
    // Log to WeilChain audit trail (non-blocking)
    logTransactionToWeilChain({
      polygonTxHash: receipt.hash,
      fromAddress: userAddress,
      toAddress: campaignAddress,
      amount: reliefAmountWei.toString(),
      transactionType: TRANSACTION_TYPES.DONATION,
      campaignId: campaignMetadata.campaignId || campaignAddress,
      blockNumber: receipt.blockNumber,
      metadata: {
        donor: userAddress,, campaignMetadata = {}
        campaignTitle: campaignMetadata.title || 'Unknown Campaign',
        reliefAmount: reliefAmount.toString(),
        timestamp: new Date().toISOString(),
        ...campaignMetadata
      }
    }).then(() => {
      console.log('✅ Transaction logged to WeilChain audit trail');
    }).catch(err => {
      console.log('⚠️ WeilChain logging failed (non-critical):', err.message);
    });
    
    return { success: true, txHash: receipt.hash, receipt };
  } catch (error) {
    console.error('Error donating to campaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete donation flow: USDC → RELIEF → Campaign
 * This is the main function to call from UI
 */
export const completeDonationFlow = async (provider, campaignAddress, usdcAmount, onProgress) => {
  try {
    const userAddress = await provider.getSigner().getAddress();
    
    // Step 1: Check USDC balance
    onProgress?.('Checking USDC balance...', 1);
    const usdcBalance = await getUSDCBalance(provider, userAddress);
    if (usdcBalance < usdcAmount) {
      throw new Error(`Insufficient USDC balance. You have ${usdcBalance} USDC, need ${usdcAmount} USDC`);
    }
    
    // Step 2: Check and approve USDC
    onProgress?.('Checking USDC approval...', 2);
    const isUSDCApproved = await checkUSDCApproval(provider, userAddress, usdcAmount);
    
    if (!isUSDCApproved) {
      onProgress?.('Approving USDC... (sign transaction)', 3);
      const approvalResult = await approveUSDC(provider, usdcAmount);
      if (!approvalResult.success) {
        throw new Error('USDC approval failed: ' + approvalResult.error);
      }
    }
    
    // Step 3: Buy RELIEF tokens
    onProgress?.('Buying RELIEF tokens... (sign transaction)', 4);
    const purchaseResult = await buyReliefTokens(provider, usdcAmount);
    if (!purchaseResult.success) {
      throw new Error('RELIEF purchase failed: ' + purchaseResult.error);
    }
    
    // Step 4: Check and approve RELIEF for campaign
    onProgress?.('Checking RELIEF approval for campaign...', 5);
    const reliefAmount = usdcAmount; // 1:1 ratio
    const isRELIEFApproved = await checkRELIEFApproval(provider, userAddress, campaignAddress, reliefAmount);
    
    if (!isRELIEFApproved) {
      onProgress?.('Approving RELIEF for campaign... (sign transaction)', 6);
      const reliefApprovalResult = await approveRELIEF(provider, campaignAddress, reliefAmount);
      if (!reliefApprovalResult.success) {
        throw new Error('RELIEF approval failed: ' + reliefApprovalResult.error);
      }
    }
    
    // Step 5: Donate RELIEF to campaign
    onProgress?.('Donating to campaign... (sign transaction)', 7);
    const donationResult = await donateToCampaign(provider, campaignAddress, reliefAmount, {
      ...campaignMetadata,
      campaignId: campaignAddress,
      donor: userAddress
    });
    if (!donationResult.success) {
      throw new Error('Donation failed: ' + donationResult.error);
    }
    
    onProgress?.('Donation complete! Logging to WeilChain...', 8);
    
    return {
      success: true,
      usdcAmount,
      reliefAmount,
      txHash: donationResult.txHash,
      receipt: donationResult.receipt
    };
    
  } catch (error) {
    console.error('Complete donation flow error:', error);
    return {
      success: false,
      error: error.message || 'Donation failed'
    };
  }
};

/**
 * Get campaign information
 */
export const getCampaignInfo = async (provider, campaignAddress) => {
  try {
    const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, provider);
    const info = await contract.campaignInfo();
    
    return {
      title: info.title,
      description: info.description,
      goalAmount: Number(ethers.formatEther(info.goalAmount)),
      raisedAmount: Number(ethers.formatEther(info.raisedAmount)),
      location: info.location,
      disasterType: info.disasterType,
      organizer: info.organizer,
      admin: info.admin,
      status: info.status,
      createdAt: Number(info.createdAt)
    };
  } catch (error) {
    console.error('Error getting campaign info:', error);
    return null;
  }
};

export default {
  getUSDCBalance,
  getRELIEFBalance,
  approveUSDC,
  buyReliefTokens,
  approveRELIEF,
  donateToCampaign,
  completeDonationFlow,
  getCampaignInfo
};
