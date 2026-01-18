import { useState, useEffect } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import polygonService, { getPolygonScanUrl } from '../services/polygonService';
import { doc, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getPublicClient } from '@wagmi/core';
import { config } from '../config/wagmiConfig';
import CampaignABI from '../contracts/Campaign.json';
import { addPolygonAmoyNetwork, updatePolygonAmoyRPC } from '../utils/addPolygonAmoyNetwork';

export default function AllocateFundsModal({ campaign, beneficiaries, onClose, onSuccess }) {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [campaignBalance, setCampaignBalance] = useState('0');
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  useEffect(() => {
    loadCampaignBalance();
  }, [campaign]);

  const loadCampaignBalance = async () => {
    try {
      if (!campaign.blockchainAddress) {
        console.log('⚠️ No blockchain address for campaign');
        return;
      }
      
      console.log('📊 Loading campaign balance for:', campaign.blockchainAddress);
      
      const publicClient = getPublicClient(config, { chainId: 80002 });
      
      // Read campaignInfo struct which contains raisedAmount
      const campaignInfoData = await publicClient.readContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI.abi,
        functionName: 'campaignInfo',
      });
      
      // Read totalAllocated to see what's already been allocated
      const totalAllocated = await publicClient.readContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI.abi,
        functionName: 'totalAllocated',
      });
      
      // Get the token address from the campaign itself (campaigns may use different tokens)
      const campaignTokenAddress = await publicClient.readContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI.abi,
        functionName: 'reliefToken',
      });
      console.log('🪙 Campaign token address:', campaignTokenAddress);
      
      // Check actual token balance of campaign contract using campaign's token
      const ReliefTokenABI = await import('../contracts/ReliefToken.json');
      
      const tokenBalance = await publicClient.readContract({
        address: campaignTokenAddress,
        abi: ReliefTokenABI.abi,
        functionName: 'balanceOf',
        args: [campaign.blockchainAddress],
      });
      
      console.log('Campaign info:', campaignInfoData);
      console.log('📊 Campaign raisedAmount (on-chain):', formatUnits(campaignInfoData[3], 6), 'USDC');
      console.log('💰 Actual token balance of campaign:', formatUnits(tokenBalance, 6), 'USDC');
      console.log('📤 Total allocated:', formatUnits(totalAllocated, 6), 'USDC');
      
      // campaignInfo returns a struct, raisedAmount is at index 3
      const raisedAmount = campaignInfoData[3];
      const availableBalance = raisedAmount - totalAllocated;
      const balance = formatUnits(availableBalance, 6);
      
      console.log('✅ Available for allocation:', balance, 'USDC');
      setCampaignBalance(balance);
    } catch (error) {
      console.error('Error loading campaign balance:', error);
      console.error('Campaign address:', campaign.blockchainAddress);
    }
  };

  const handleAllocate = async () => {
    try {
      if (!selectedBeneficiary || !amount || parseFloat(amount) <= 0) {
        alert('Please select a beneficiary and enter a valid amount');
        return;
      }

      if (!campaign.blockchainAddress) {
        alert('Campaign not deployed to blockchain');
        return;
      }

      if (!walletClient) {
        alert('Please connect your wallet');
        return;
      }

      if (!address) {
        alert('Wallet address not found');
        return;
      }

      if (parseFloat(amount) > parseFloat(campaignBalance)) {
        alert(`Insufficient funds in campaign.\n\nAvailable: $${campaignBalance} USDC\nRequested: $${amount} USDC`);
        return;
      }

      setIsProcessing(true);
      setTxStatus('Validating network and contract...');

      const publicClient = getPublicClient(config, { chainId: 80002 });

      // CRITICAL: Verify we're on Polygon Amoy testnet
      console.log('🔍 Checking network...');
      let chainId;
      try {
        chainId = await publicClient.getChainId();
        console.log('Current Chain ID:', chainId);
      } catch (chainError) {
        console.error('Failed to get chain ID:', chainError);
        setIsProcessing(false);
        
        // Try to fix the network configuration
        const shouldFixNetwork = window.confirm(
          '❌ Network Connection Error\n\n' +
          'Cannot connect to Polygon Amoy network.\n\n' +
          'This may be due to RPC issues.\n\n' +
          'Click OK to automatically update the network configuration in MetaMask.'
        );
        
        if (shouldFixNetwork) {
          setTxStatus('Updating network configuration...');
          const fixed = await updatePolygonAmoyRPC();
          if (fixed) {
            alert('✅ Network updated! Please try allocating funds again.');
          }
        }
        
        setTxStatus('');
        return;
      }
      
      if (chainId !== 80002) {
        setIsProcessing(false);
        
        // Try to switch/add network automatically
        const shouldSwitch = window.confirm(
          `❌ Wrong Network!\n\n` +
          `Current Chain ID: ${chainId}\n` +
          `Required: Polygon Amoy (80002)\n\n` +
          `Click OK to automatically switch to Polygon Amoy Testnet.`
        );
        
        if (shouldSwitch) {
          setTxStatus('Switching network...');
          const switched = await addPolygonAmoyNetwork();
          if (switched) {
            alert('✅ Switched to Polygon Amoy! Please try allocating funds again.');
          }
          setTxStatus('');
        }
        
        return;
      }
      console.log('✅ Connected to Polygon Amoy testnet');

      // Verify contract exists
      console.log('🔍 Checking if contract exists...');
      let code;
      try {
        code = await publicClient.getBytecode({
          address: campaign.blockchainAddress,
        });
      } catch (bytecodeError) {
        console.error('Failed to get contract bytecode:', bytecodeError);
        setIsProcessing(false);
        alert('❌ Cannot verify contract\n\nFailed to check if campaign contract exists.\n\nPlease ensure you are on the correct network and try again.');
        return;
      }
      
      if (!code || code === '0x') {
        setIsProcessing(false);
        alert(`❌ Contract Not Found!\n\nThe campaign contract does not exist at:\n${campaign.blockchainAddress}\n\nThis means the campaign was not properly deployed.\n\nPlease contact the administrator.`);
        return;
      }
      console.log('✅ Contract exists at address');

      // Verify organizer permissions
      console.log('🔍 Checking organizer permissions...');
      let campaignInfo;
      try {
        campaignInfo = await publicClient.readContract({
          address: campaign.blockchainAddress,
          abi: CampaignABI.abi,
          functionName: 'campaignInfo',
        });
      } catch (readError) {
        console.error('Failed to read campaign info:', readError);
        setIsProcessing(false);
        alert('❌ Cannot read campaign data\n\nFailed to verify organizer permissions.\n\nThe contract may not be deployed correctly or there is a network issue.');
        return;
      }
      
      const contractOrganizer = campaignInfo[6]; // organizer is at index 6
      console.log('Contract Organizer:', contractOrganizer);
      console.log('Your Address:', address);
      
      if (contractOrganizer.toLowerCase() !== address.toLowerCase()) {
        setIsProcessing(false);
        alert(`❌ Permission Denied!\n\nYou are not the organizer of this campaign.\n\nCampaign Organizer: ${contractOrganizer}\nYour Address: ${address}\n\nOnly the organizer can allocate funds.`);
        return;
      }
      console.log('✅ You are the campaign organizer');

      setTxStatus('Preparing allocation...');

      // USDC uses 6 decimals
      const amountInWei = parseUnits(amount, 6);
      const beneficiary = beneficiaries.find(b => b.id === selectedBeneficiary);
      
      if (!beneficiary) {
        alert('Beneficiary not found');
        setIsProcessing(false);
        return;
      }

      // IMPORTANT: For beneficiaries, the wallet address IS the document ID
      // The id field contains the wallet address (lowercase)
      const beneficiaryWalletAddress = beneficiary.walletAddress || beneficiary.id;
      
      if (!beneficiaryWalletAddress || !beneficiaryWalletAddress.startsWith('0x')) {
        alert('❌ Invalid beneficiary wallet address');
        setIsProcessing(false);
        return;
      }

      console.log('🎯 Allocating funds:', {
        beneficiaryWallet: beneficiaryWalletAddress,
        beneficiaryId: beneficiary.id,
        amount: amount,
        amountInWei: amountInWei.toString(),
        campaign: campaign.blockchainAddress,
        organizerAddress: address,
        chainId: chainId
      });
      
      setTxStatus('Checking allocation requirements...');
      console.log('⚡ Estimating gas for allocation...');
      
      // Read campaign state first to debug
      const totalAllocated = await publicClient.readContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI.abi,
          functionName: 'totalAllocated',
        });
        
        const raisedAmount = campaignInfo[3];
        
        console.log('📊 Pre-allocation check:', {
          raisedAmount: formatUnits(raisedAmount, 6),
          totalAllocated: formatUnits(totalAllocated, 6),
          requestedAmount: formatUnits(amountInWei, 6),
          wouldBeTotal: formatUnits(totalAllocated + amountInWei, 6),
          hasEnough: raisedAmount >= (totalAllocated + amountInWei)
        });
        
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            address: campaign.blockchainAddress,
            abi: CampaignABI.abi,
            functionName: 'allocateFunds',
            args: [beneficiaryWalletAddress, amountInWei],
            account: walletClient.account.address,
          });
          console.log('✅ Gas estimation successful:', gasEstimate);
        } catch (gasError) {
          console.error('❌ Gas estimation failed:');
          console.error('Full error:', gasError);
          console.error('Error name:', gasError.name);
          console.error('Error message:', gasError.message);
          console.error('Short message:', gasError.shortMessage);
          console.error('Details:', gasError.details);
          console.error('Meta messages:', gasError.metaMessages);
          
          // Try to extract the actual revert reason
          let errorMessage = 'Unknown error';
          if (gasError.message) {
            if (gasError.message.includes('Insufficient campaign balance')) {
              errorMessage = `Campaign doesn't have enough funds.\n\nAvailable: $${formatUnits(raisedAmount - totalAllocated, 6)} USDC\nRequested: $${amount} USDC`;
            } else if (gasError.message.includes('Invalid beneficiary')) {
              errorMessage = 'Invalid beneficiary address';
            } else if (gasError.shortMessage) {
              errorMessage = gasError.shortMessage;
            } else {
              errorMessage = gasError.message;
            }
          }
          
          throw new Error(`Cannot allocate funds: ${errorMessage}`);
        }

        setTxStatus('Please confirm the transaction in MetaMask...');
        
        let txHash;
        try {
          console.log('📤 Sending transaction to blockchain...');
          console.log('Contract:', campaign.blockchainAddress);
          console.log('Function: allocateFunds');
        console.log('Args:', [beneficiaryWalletAddress, amountInWei.toString()]);
        console.log('From:', address);
        console.log('Chain ID:', chainId);
        
        // Execute allocation transaction
        txHash = await walletClient.writeContract({
          address: campaign.blockchainAddress,
          abi: CampaignABI.abi,
          functionName: 'allocateFunds',
          args: [beneficiaryWalletAddress, amountInWei],
          account: address,
          chain: {
            id: 80002,
            name: 'Polygon Amoy',
            network: 'polygon-amoy',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://rpc-amoy.polygon.technology'] },
              public: { http: ['https://rpc-amoy.polygon.technology'] },
            },
            blockExplorers: {
              default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
            },
            testnet: true,
          },
        });

        console.log('✅ Transaction sent! Hash:', txHash);
        console.log('🔗 PolygonScan:', getPolygonScanUrl(txHash, 'tx'));
        
        // Note: On testnets, there can be a delay before transaction appears in mempool
        // We'll verify it during the receipt wait instead
        
      } catch (txError) {
        console.error('❌ Transaction submission failed:', txError);
        
        // Check if it's a user rejection
        if (txError.message?.includes('User rejected') || txError.message?.includes('User denied') || txError.code === 4001 || txError.code === 'ACTION_REJECTED') {
          throw new Error('Transaction cancelled by user');
        }
        
        // Check if it's insufficient funds
        if (txError.message?.includes('insufficient funds')) {
          throw new Error('Insufficient POL for gas fee. Please add POL to your wallet.');
        }
        
        // Generic error - don't mask the real error
        throw new Error(`Transaction failed: ${txError.shortMessage || txError.message || 'Unknown error'}`);
      }

      setTxStatus('Transaction sent! Waiting for confirmation...');
      
      // Wait for transaction confirmation with reasonable timeout
      let receipt;
      try {
        console.log('⏳ Waiting for transaction confirmation...');
        console.log('This may take 30-90 seconds on Polygon Amoy testnet');
        
        receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 120_000, // 2 minutes
          confirmations: 1
        });
        
        console.log('✅ Transaction confirmed:', receipt);
        
        // Check if transaction succeeded
        if (receipt.status === 'reverted' || receipt.status === 0) {
          console.error('❌ Transaction reverted!');
          console.error('Receipt:', receipt);
          throw new Error('Transaction reverted on blockchain. The allocation failed. Check contract state and try again.');
        }
        
        console.log('🎉 Allocation successful on blockchain!');
      } catch (receiptError) {
        console.error('❌ Transaction confirmation error:', receiptError);
        
        // If it's a timeout, the transaction might still be pending
        if (receiptError.message?.includes('timeout')) {
          console.log('⏳ Transaction still pending on blockchain');
          console.log('Check status:', getPolygonScanUrl(txHash, 'tx'));
          
          alert(`⏳ Transaction Submitted\n\nTransaction Hash: ${txHash.substring(0, 10)}...\n\nThe transaction is taking longer than expected.\n\nCheck status: ${getPolygonScanUrl(txHash, 'tx')}\n\nPlease verify on PolygonScan before trying again.`);
          
          setIsProcessing(false);
          setTxStatus('');
          return; // Don't continue
        }
        
        throw receiptError;
      }

      // Extract beneficiary wallet address from event logs or query blockchain
      let walletAddress = null;
      
      // Try to get wallet from transaction logs
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          for (const log of receipt.logs) {
            // Find FundsAllocated event
            if (log.topics.length >= 2) {
              // The beneficiary address is in the first indexed parameter (topic[1])
              const beneficiaryFromLog = `0x${log.topics[1].slice(26)}`;
              if (beneficiaryFromLog.toLowerCase() === beneficiaryWalletAddress.toLowerCase()) {
                // Wallet address is typically in the log data or topic[2]
                if (log.topics.length >= 3) {
                  walletAddress = `0x${log.topics[2].slice(26)}`;
                }
                break;
              }
            }
          }
        } catch (logErr) {
          console.warn('Could not parse wallet address from logs:', logErr);
        }
      }
      
      // If we couldn't get wallet from logs, query the contract directly
      if (!walletAddress) {
        console.log('📞 Querying blockchain for beneficiary wallet address...');
        try {
          walletAddress = await publicClient.readContract({
            address: campaign.blockchainAddress,
            abi: CampaignABI.abi,
            functionName: 'getBeneficiaryWallet',
            args: [beneficiaryWalletAddress],
          });
          console.log('✅ Got wallet address from blockchain:', walletAddress);
        } catch (queryErr) {
          console.warn('⚠️ Could not query wallet address from blockchain:', queryErr);
          console.log('This is OK - the wallet will be created when transaction confirms');
        }
      }

      // Update Firebase - if this fails, we still succeeded on blockchain
      try {
        setTxStatus('Updating database...');

        // Add allocation record
        if (db) {
          console.log('💾 Saving to Firebase:', {
            beneficiaryId: selectedBeneficiary,
            beneficiaryWallet: beneficiaryWalletAddress,
            amount: parseFloat(amount),
            contractWalletAddress: walletAddress
          });

          await addDoc(collection(db, 'allocations'), {
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            beneficiaryId: selectedBeneficiary,
            beneficiaryName: beneficiary.name || beneficiary.email,
            beneficiaryWallet: beneficiaryWalletAddress,
            amount: parseFloat(amount),
            contractWalletAddress: walletAddress,
            txHash: txHash,
            blockNumber: receipt.blockNumber.toString(),
            network: 'polygon-amoy',
            chainId: 80002,
            createdAt: new Date().toISOString()
          });

          // Update beneficiary document with allocated amount (use lowercase)
          const beneficiaryDocId = selectedBeneficiary.toLowerCase();
          console.log('━'.repeat(60));
          console.log('📝 UPDATING BENEFICIARY FIREBASE DOCUMENT');
          console.log('━'.repeat(60));
          console.log('Document ID (lowercase):', beneficiaryDocId);
          console.log('Original ID:', selectedBeneficiary);
          console.log('Contract Wallet:', walletAddress);
          
          const beneficiaryRef = doc(db, 'users', beneficiaryDocId);
          
          // Get current allocated amount
          const currentAllocated = beneficiary.allocatedAmount || 0;
          const newAllocated = currentAllocated + parseFloat(amount);
          
          console.log('💰 Allocation update:', {
            current: currentAllocated,
            adding: parseFloat(amount),
            new: newAllocated,
            contractWallet: walletAddress
          });

          await updateDoc(beneficiaryRef, {
            allocatedAmount: newAllocated,
            contractWalletAddress: walletAddress,
            allocationTxHash: txHash,
            updatedAt: new Date().toISOString()
          });
          
          console.log('✅ Firebase updated successfully');
          console.log('━'.repeat(60));
        }
      } catch (dbError) {
        console.error('━'.repeat(60));
        console.error('❌ FIREBASE UPDATE FAILED');
        console.error('━'.repeat(60));
        console.error('Error Type:', dbError.name);
        console.error('Error Message:', dbError.message);
        console.error('Error Code:', dbError.code);
        console.error('Full Error:', dbError);
        console.error('');
        console.error('Attempted to update document ID:', selectedBeneficiary.toLowerCase());
        console.error('Contract Wallet:', walletAddress);
        console.error('Allocated Amount:', parseFloat(amount));
        console.error('');
        console.error('⚠️ IMPORTANT: Blockchain transaction succeeded!');
        console.error('The funds WERE allocated on blockchain.');
        console.error('Only the Firebase record update failed.');
        console.error('');
        console.error('The beneficiary dashboard will still show funds');
        console.error('because it now reads directly from blockchain.');
        console.error('━'.repeat(60));
        // Don't throw - blockchain succeeded, Firebase is just for our records
      }

      // Reload balance
      try {
        await loadCampaignBalance();
      } catch (balanceError) {
        console.warn('Could not reload balance:', balanceError);
      }
      
      // Show success message
      alert(`✅ Funds Allocated Successfully!\n\nAmount: $${amount} USDC\nBeneficiary: ${beneficiary.name || beneficiary.email}\n\nTransaction: ${txHash.substring(0, 20)}...\n\nView on PolygonScan:\n${getPolygonScanUrl(txHash, 'tx')}\n\nThe beneficiary can now see and spend these funds.`);
      
      setIsProcessing(false);
      setTxStatus('');
      onClose();
    } catch (error) {
      console.error('━'.repeat(60));
      console.error('❌ ALLOCATION ERROR');
      console.error('━'.repeat(60));
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('━'.repeat(60));
      
      setIsProcessing(false);
      setTxStatus('');
      
      let errorMessage = 'Unknown error occurred';
      
      if (error.message?.includes('user rejected') || error.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient POL for gas fee. Please add POL to your wallet.';
      } else if (error.message?.includes('Insufficient campaign balance')) {
        errorMessage = `Campaign has insufficient funds.\n\nAvailable: $${campaignBalance} USDC\nRequested: $${amount} USDC`;
      } else if (error.message?.includes('reverted')) {
        errorMessage = `Transaction reverted on blockchain.\n\nPossible reasons:\n• Campaign has insufficient funds\n• Beneficiary not approved\n• Contract paused\n\nPlease check and try again.`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ Allocation Failed\n\n${errorMessage}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Allocate Funds</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Campaign Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">{campaign.title}</h3>
          <p className="text-sm text-blue-800">
            Available: <strong>${parseFloat(campaignBalance).toFixed(2)} USDC</strong>
          </p>
        </div>

        {/* Select Beneficiary */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Select Beneficiary
          </label>
          <select
            value={selectedBeneficiary}
            onChange={(e) => setSelectedBeneficiary(e.target.value)}
            disabled={isProcessing}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Choose a beneficiary...</option>
            {beneficiaries.map(beneficiary => {
              const walletAddr = beneficiary.walletAddress || beneficiary.id;
              return (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.name || beneficiary.email} - {walletAddr?.slice(0, 6)}...{walletAddr?.slice(-4)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Allocation Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Transaction Status */}
        {txStatus && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <p className="text-sm text-yellow-800">{txStatus}</p>
            </div>
          </div>
        )}

        {/* Allocate Button */}
        <button
          onClick={handleAllocate}
          disabled={isProcessing || !selectedBeneficiary || !amount || parseFloat(amount) <= 0}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            '💰 Allocate Funds to Beneficiary'
          )}
        </button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          This will create a BeneficiaryWallet contract on-chain
        </p>
      </div>
    </div>
  );
}
