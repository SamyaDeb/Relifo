import { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import polygonService from '../services/polygonService';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AllocateFundsModal({ campaign, beneficiaries, onClose }) {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [campaignBalance, setCampaignBalance] = useState('0');
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    loadCampaignBalance();
  }, [campaign]);

  const loadCampaignBalance = async () => {
    try {
      if (!campaign.blockchainAddress) return;
      
      const campaignContract = await polygonService.getCampaignContract(campaign.blockchainAddress);
      const balance = await campaignContract.read.totalRaised();
      setCampaignBalance(formatEther(balance));
    } catch (error) {
      console.error('Error loading campaign balance:', error);
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

      if (parseFloat(amount) > parseFloat(campaignBalance)) {
        alert('Insufficient funds in campaign');
        return;
      }

      setIsProcessing(true);
      setTxStatus('Preparing allocation...');

      const amountInWei = parseEther(amount);
      const beneficiary = beneficiaries.find(b => b.walletAddress === selectedBeneficiary);

      // Get campaign contract
      const campaignContract = await polygonService.getCampaignContract(campaign.blockchainAddress);

      // Call allocateFunds to create BeneficiaryWallet
      setTxStatus('Creating beneficiary wallet... Please confirm in MetaMask');
      
      // Use staticCall to get the wallet address that will be created
      const walletAddress = await campaignContract.read.allocateFunds([selectedBeneficiary, amountInWei]);
      
      // Now execute the actual transaction
      setTxStatus('Please confirm allocation in MetaMask...');
      const txHash = await campaignContract.write.allocateFunds([selectedBeneficiary, amountInWei]);

      setTxStatus('Waiting for transaction confirmation...');
      const receipt = await polygonService.waitForTransaction(txHash);

      // Update Firebase
      setTxStatus('Updating database...');

      // Add allocation record
      await addDoc(collection(db, 'allocations'), {
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        beneficiaryId: selectedBeneficiary,
        beneficiaryName: beneficiary.name,
        amount: parseFloat(amount),
        walletAddress: walletAddress,
        txHash: txHash,
        blockNumber: receipt.blockNumber.toString(),
        network: 'polygon-amoy',
        chainId: 80002,
        createdAt: serverTimestamp()
      });

      // Update beneficiary document
      const beneficiaryRef = doc(db, 'users', selectedBeneficiary);
      await updateDoc(beneficiaryRef, {
        walletAddress: walletAddress,
        allocatedAmount: parseFloat(amount),
        hasWallet: true,
        updatedAt: serverTimestamp()
      });

      alert(`Successfully allocated ${amount} RELIEF tokens!\n\nBeneficiary Wallet: ${walletAddress}\n\nTransaction: ${txHash}\n\nView on PolygonScan: ${polygonService.getPolygonScanUrl(txHash)}`);

      onClose();
    } catch (error) {
      console.error('Allocation error:', error);
      const errorMsg = polygonService.parseContractError(error);
      alert(`Allocation failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
      setTxStatus('');
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
            Available: <strong>{parseFloat(campaignBalance).toFixed(2)} RELIEF</strong>
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
            {beneficiaries.map(beneficiary => (
              <option key={beneficiary.walletAddress} value={beneficiary.walletAddress}>
                {beneficiary.name} - {beneficiary.walletAddress.slice(0, 6)}...{beneficiary.walletAddress.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Allocation Amount (RELIEF Tokens)
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
