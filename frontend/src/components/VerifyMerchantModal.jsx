import { useState } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { getPublicClient } from '@wagmi/core';
import { config } from '../config/wagmiConfig';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import CampaignFactoryABI from '../contracts/CampaignFactory.json';
import deployment from '../contracts/addresses.json';
import { getPolygonScanUrl } from '../services/polygonService';
import { USER_STATUS } from '../firebase/constants';

export default function VerifyMerchantModal({ merchant, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [showDocuments, setShowDocuments] = useState(false);
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const handleVerify = async () => {
    try {
      if (!walletClient) {
        alert('Please connect your wallet');
        return;
      }

      if (!merchant.walletAddress) {
        alert('Merchant wallet address not found');
        return;
      }

      setIsProcessing(true);
      setTxStatus('Verifying merchant on blockchain...');

      const publicClient = getPublicClient(config, { chainId: 80002 });

      console.log('🔐 Verifying merchant:', {
        merchant: merchant.walletAddress,
        businessName: merchant.businessName,
        categories: merchant.categories,
      });

      // Check if already verified
      const isAlreadyVerified = await publicClient.readContract({
        address: deployment.campaignFactory,
        abi: CampaignFactoryABI.abi,
        functionName: 'isVerifiedMerchant',
        args: [merchant.walletAddress],
      });

      if (isAlreadyVerified) {
        alert('✅ Merchant Already Verified\n\nThis merchant is already verified on the blockchain.');
        
        // Update Firebase to sync
        await updateDoc(doc(db, 'users', merchant.walletAddress.toLowerCase()), {
          status: USER_STATUS.APPROVED,
          verifiedOnChain: true,
          verifiedAt: new Date().toISOString(),
        });
        
        setIsProcessing(false);
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      setTxStatus('Please confirm in MetaMask...');

      const txHash = await walletClient.writeContract({
        address: deployment.campaignFactory,
        abi: CampaignFactoryABI.abi,
        functionName: 'verifyMerchant',
        args: [merchant.walletAddress],
        account: address,
      });

      console.log('📝 Transaction hash:', txHash);
      setTxStatus('Waiting for blockchain confirmation...');

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        timeout: 300_000, // 5 minutes for testnet
        confirmations: 2
      });

      console.log('✅ Transaction confirmed:', receipt);

      // Update Firebase
      setTxStatus('Updating database...');
      await updateDoc(doc(db, 'users', merchant.walletAddress.toLowerCase()), {
        status: USER_STATUS.APPROVED,
        verifiedOnChain: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: address,
        verifiedTxHash: txHash,
      });

      alert(`✅ Merchant Verified Successfully!\n\nBusiness: ${merchant.businessName}\nWallet: ${merchant.walletAddress}\n\nOrganizers can now approve this merchant for beneficiary spending.\n\nTransaction: ${txHash}`);

      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('❌ Error verifying merchant:', error);
      let errorMsg = 'Failed to verify merchant';
      
      if (error.message?.includes('Only owner')) {
        errorMsg = 'Only the super admin can verify merchants';
      } else if (error.message?.includes('Already verified')) {
        errorMsg = 'Merchant is already verified';
      } else if (error.shortMessage) {
        errorMsg = error.shortMessage;
      }

      alert('❌ Error: ' + errorMsg);
    } finally {
      setIsProcessing(false);
      setTxStatus('');
    }
  };

  const handleReject = async () => {
    if (!confirm(`Are you sure you want to reject ${merchant.businessName}?\n\nThis merchant will not be able to receive payments from beneficiaries.`)) {
      return;
    }

    try {
      setIsProcessing(true);
      await updateDoc(doc(db, 'users', merchant.walletAddress.toLowerCase()), {
        status: USER_STATUS.REJECTED,
        rejectedAt: new Date().toISOString(),
        rejectedBy: address,
      });

      alert(`❌ Merchant Rejected\n\n${merchant.businessName} has been rejected.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rejecting merchant:', error);
      alert('Failed to reject merchant');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-green-500/30 rounded-2xl p-8 max-w-4xl w-full shadow-2xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            🏪 Verify Merchant
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Merchant Information */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm font-semibold mb-1">Business Name</p>
              <p className="text-white text-lg">{merchant.businessName}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm font-semibold mb-1">Owner Name</p>
              <p className="text-white text-lg">{merchant.ownerName}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm font-semibold mb-1">Business Type</p>
              <p className="text-white text-lg capitalize">{merchant.businessType}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm font-semibold mb-1">Phone</p>
              <p className="text-white text-lg">{merchant.phone}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg md:col-span-2">
              <p className="text-green-300 text-sm font-semibold mb-1">Email</p>
              <p className="text-white text-lg">{merchant.email}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg md:col-span-2">
              <p className="text-green-300 text-sm font-semibold mb-1">Address</p>
              <p className="text-white text-lg">{merchant.address}</p>
            </div>

            <div className="p-4 bg-black/40 border border-green-500/30 rounded-lg md:col-span-2">
              <p className="text-green-300 text-sm font-semibold mb-1">Service Categories</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {merchant.categories?.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-black/40 border border-blue-500/30 rounded-lg md:col-span-2">
              <p className="text-blue-300 text-sm font-semibold mb-1">Wallet Address</p>
              <p className="text-white text-sm font-mono break-all">{merchant.walletAddress}</p>
            </div>
          </div>

          {/* Documents Section */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-purple-300 font-semibold">📄 Submitted Documents</p>
              <span className="text-purple-300">{showDocuments ? '▼' : '▶'}</span>
            </button>
            
            {showDocuments && merchant.documents && (
              <div className="mt-4 space-y-2">
                {merchant.documents.businessLicense && (
                  <a
                    href={merchant.documents.businessLicense}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-black/40 border border-purple-500/30 rounded-lg text-purple-300 hover:text-purple-200 hover:border-purple-500/50 transition-all"
                  >
                    📜 Business License ↗
                  </a>
                )}
                {merchant.documents.taxId && (
                  <a
                    href={merchant.documents.taxId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-black/40 border border-purple-500/30 rounded-lg text-purple-300 hover:text-purple-200 hover:border-purple-500/50 transition-all"
                  >
                    🔖 Tax ID / Registration ↗
                  </a>
                )}
                {merchant.documents.ownershipProof && (
                  <a
                    href={merchant.documents.ownershipProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-black/40 border border-purple-500/30 rounded-lg text-purple-300 hover:text-purple-200 hover:border-purple-500/50 transition-all"
                  >
                    📋 Ownership Proof ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {txStatus && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-sm">{txStatus}</p>
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            ⚠️ <strong>Important:</strong> Verifying this merchant on the blockchain will allow organizers to approve them for beneficiary spending. Please verify all documents are authentic and business information is accurate.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ❌ Reject
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '⏳ Processing...' : '✅ Verify on Blockchain'}
          </button>
        </div>
      </div>
    </div>
  );
}
