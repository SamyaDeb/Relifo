import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAccount, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import polygonService from '../../services/polygonService';

export default function DonorDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ totalDonated: 0, campaignsSupported: 0 });
  const [loading, setLoading] = useState(true);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const { address } = useAccount();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!address) {
        setLoading(false);
        return;
      }

      if (!db) {
        // Demo mode
        setCampaigns([
          { id: '1', title: 'Flood Relief - Kerala', goal: 50000, raised: 25000, location: 'Kerala, India' },
          { id: '2', title: 'Earthquake Recovery - Nepal', goal: 100000, raised: 75000, location: 'Kathmandu, Nepal' }
        ]);
        setDonations([
          { id: '1', campaign: 'Flood Relief - Kerala', amount: 500, date: '2025-12-20' }
        ]);
        setStats({ totalDonated: 500, campaignsSupported: 1 });
        setLoading(false);
        return;
      }

      // Realtime listener for active campaigns
      const campaignsRef = collection(db, 'campaigns');
      const campaignsQuery = query(campaignsRef, where('status', '==', 'active'));
      const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
        const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(campaignsData);
      });

      // Realtime listener for user's donations
      const donationsRef = collection(db, 'donations');
      const donationsQuery = query(donationsRef, where('donorId', '==', address.toLowerCase()));
      const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
        const donationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDonations(donationsData);

        // Calculate stats in realtime
        const totalDonated = donationsData.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        const uniqueCampaigns = new Set(donationsData.map(d => d.campaignId));
        setStats({ totalDonated, campaignsSupported: uniqueCampaigns.size });
      });

      setLoading(false);

      // Cleanup listeners on unmount
      return () => {
        unsubscribeCampaigns();
        unsubscribeDonations();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">Donor Dashboard</h1>
          <p className="text-green-100">Support relief campaigns and make a difference</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Donated" value={`${stats.totalDonated.toFixed(2)} RELIEF`} icon="💰" color="bg-green-500" />
          <StatCard title="Campaigns Supported" value={stats.campaignsSupported} icon="🎯" color="bg-blue-500" />
          <StatCard title="Impact Score" value="⭐⭐⭐⭐⭐" icon="🌟" color="bg-yellow-500" />
        </div>

        {/* Available Campaigns */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Available Campaigns</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active campaigns at the moment
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {campaigns.map(campaign => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={campaign} 
                    onDonate={() => {
                      setSelectedCampaign(campaign);
                      setDonateModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Donations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">My Donation History</h2>
          </div>
          <div className="p-6">
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💝</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No donations yet
                </h3>
                <p className="text-gray-600">Start making a difference by donating to a campaign above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map(donation => (
                  <DonationCard key={donation.id} donation={donation} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Donate Modal */}
      {donateModalOpen && selectedCampaign && (
        <DonateModal
          campaign={selectedCampaign}
          onClose={() => {
            setDonateModalOpen(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className={`${color} text-white px-3 py-1 rounded text-sm font-bold`}>
          {value}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
}

function CampaignCard({ campaign, onDonate }) {
  const progress = (campaign.raised / campaign.goal) * 100;

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{campaign.title}</h3>
      <p className="text-gray-600 text-sm mb-4">📍 {campaign.location}</p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Raised</p>
          <p className="text-lg font-bold text-gray-900">{(campaign.raised || 0).toLocaleString()} RELIEF</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Goal</p>
          <p className="text-lg font-bold text-gray-900">{campaign.goal.toLocaleString()} RELIEF</p>
        </div>
      </div>

      <button
        onClick={onDonate}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
      >
        💝 Donate RELIEF Tokens
      </button>
    </div>
  );
}

function DonationCard({ donation }) {
  return (
    <div className="border rounded-lg p-4 flex justify-between items-center">
      <div>
        <h4 className="font-semibold text-gray-900">{donation.campaignTitle || 'Campaign'}</h4>
        <p className="text-sm text-gray-500">{new Date(donation.createdAt?.toDate?.() || donation.date).toLocaleDateString()}</p>
        {donation.txHash && (
          <a
            href={polygonService.getPolygonScanUrl(donation.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on PolygonScan ↗
          </a>
        )}
      </div>
      <div className="text-right">
        <p className="text-xl font-bold text-green-600">{donation.amount} RELIEF</p>
        <p className="text-xs text-gray-500">✓ Confirmed</p>
      </div>
    </div>
  );
}

function DonateModal({ campaign, onClose }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [txStatus, setTxStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    loadBalance();
  }, [address]);

  const loadBalance = async () => {
    try {
      if (!address) return;
      const reliefToken = await polygonService.getReliefTokenContract();
      const bal = await reliefToken.read.balanceOf([address]);
      setBalance(formatEther(bal));
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const handleDonate = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount');
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

      setIsProcessing(true);
      setTxStatus('Preparing transaction...');

      const amountInWei = parseEther(amount);

      // Check balance
      if (parseFloat(amount) > parseFloat(balance)) {
        throw new Error('Insufficient RELIEF token balance');
      }

      // Get contracts
      const reliefToken = await polygonService.getReliefTokenContract();
      const campaignContract = await polygonService.getCampaignContract(campaign.blockchainAddress);

      // Check allowance
      setTxStatus('Checking token allowance...');
      const currentAllowance = await reliefToken.read.allowance([address, campaign.blockchainAddress]);

      // Approve if needed
      if (currentAllowance < amountInWei) {
        setTxStatus('Please approve RELIEF tokens in MetaMask...');
        const approveTxHash = await reliefToken.write.approve([campaign.blockchainAddress, amountInWei]);
        
        setTxStatus('Waiting for approval confirmation...');
        await polygonService.waitForTransaction(approveTxHash);
      }

      // Donate
      setTxStatus('Please confirm donation in MetaMask...');
      const donateTxHash = await campaignContract.write.donate([amountInWei]);

      setTxStatus('Waiting for donation confirmation...');
      const receipt = await polygonService.waitForTransaction(donateTxHash);

      // Update Firebase
      setTxStatus('Updating database...');
      
      // Update campaign raised amount
      const campaignRef = doc(db, 'campaigns', campaign.id);
      await updateDoc(campaignRef, {
        raised: increment(parseFloat(amount))
      });

      // Add donation record
      await addDoc(collection(db, 'donations'), {
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        donorId: address.toLowerCase(),
        amount: parseFloat(amount),
        txHash: donateTxHash,
        blockNumber: receipt.blockNumber.toString(),
        network: 'polygon-amoy',
        chainId: 80002,
        createdAt: serverTimestamp()
      });

      // Success
      alert(`Successfully donated ${amount} RELIEF tokens!\n\nTransaction: ${donateTxHash}\n\nView on PolygonScan: ${polygonService.getPolygonScanUrl(donateTxHash)}`);
      
      onClose();
    } catch (error) {
      console.error('Donation error:', error);
      const errorMsg = polygonService.parseContractError(error);
      alert(`Donation failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
      setTxStatus('');
    }
  };

  const progress = (campaign.raised / campaign.goal) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Donate to Campaign</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Campaign Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">{campaign.title}</h3>
          <p className="text-sm text-gray-600 mb-3">📍 {campaign.location}</p>
          
          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Raised: <strong>{campaign.raised || 0} RELIEF</strong></span>
            <span className="text-gray-600">Goal: <strong>{campaign.goal} RELIEF</strong></span>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Your Balance: <strong>{parseFloat(balance).toFixed(2)} RELIEF</strong>
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Donation Amount (RELIEF Tokens)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
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

        {/* Donate Button */}
        <button
          onClick={handleDonate}
          disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
            '💝 Donate RELIEF Tokens'
          )}
        </button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Transactions are processed on Polygon Amoy testnet
        </p>
      </div>
    </div>
  );
}
