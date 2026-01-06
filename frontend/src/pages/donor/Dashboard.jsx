import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { parseEther, formatEther, parseUnits } from 'viem';
import polygonService from '../../services/polygonService';

export default function DonorDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ totalDonated: 0, campaignsSupported: 0 });
  const [loading, setLoading] = useState(true);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);
  const [reliefBalance, setReliefBalance] = useState('0');
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    console.log('🔄 Donor Dashboard: Setting up listeners for', address);
    
    loadReliefBalance();
    
    // Refresh balance every 5 seconds for real-time updates
    const balanceInterval = setInterval(() => {
      loadReliefBalance();
    }, 5000);

    // Set up real-time listeners
    let unsubscribeCampaigns;
    let unsubscribeDonations;

    const setupListeners = async () => {
      try {
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
        unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
          const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('📋 Donor Dashboard: Campaigns updated:', campaignsData.length);
          setCampaigns(campaignsData);
        });

        // Realtime listener for user's donations
        const donationsRef = collection(db, 'donations');
        const donationsQuery = query(donationsRef, where('donorId', '==', address.toLowerCase()));
        unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
          const donationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('💰 Donor Dashboard: Donations updated:', donationsData.length);
          console.log('💰 Donation records:', donationsData.map(d => ({
            campaign: d.campaignTitle,
            amount: d.amount,
            txHash: d.txHash?.substring(0, 10) + '...'
          })));
          setDonations(donationsData);

          // Calculate stats in realtime
          const totalDonated = donationsData.reduce((sum, d) => sum + parseFloat(d.amount), 0);
          console.log('💰 Total donated calculated:', totalDonated);
          const uniqueCampaigns = new Set(donationsData.map(d => d.campaignId));
          setStats({ totalDonated, campaignsSupported: uniqueCampaigns.size });
        });

        setLoading(false);
      } catch (error) {
        console.error('❌ Error setting up listeners:', error);
        setLoading(false);
      }
    };

    setupListeners();
    
    // Cleanup function
    return () => {
      console.log('🧹 Donor Dashboard: Cleaning up listeners');
      clearInterval(balanceInterval);
      if (unsubscribeCampaigns) unsubscribeCampaigns();
      if (unsubscribeDonations) unsubscribeDonations();
    };
  }, [address]);

  const loadReliefBalance = async () => {
    if (!address) return;
    try {
      const { publicClient } = await import('wagmi/actions');
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      
      const client = getPublicClient(config, { chainId: 80002 });
      const balance = await client.readContract({
        address: polygonService.CONTRACTS.reliefToken,
        abi: (await import('../../contracts/ReliefToken.json')).default.abi,
        functionName: 'balanceOf',
        args: [address],
      });
      setReliefBalance(formatEther(balance));
    } catch (error) {
      console.error('Error loading RELIEF balance:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const handleAddTokens = () => {
    setShowBuyTokensModal(true);
  };

  const scrollToSection = (sectionId) => {
    navigate('/', { state: { scrollTo: sectionId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  // Get campaigns donor has donated to
  const donatedCampaignIds = new Set(donations.map(d => d.campaignId));
  const donatedCampaigns = campaigns.filter(c => donatedCampaignIds.has(c.id));
  const availableCampaigns = campaigns.filter(c => !donatedCampaignIds.has(c.id));

  return (
    <div className="min-h-screen h-screen bg-black relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Round Green Glowing Orbs - Fixed positions, no overlap */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-green-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-12 right-12 w-80 h-80 bg-green-500/18 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-16 w-64 h-64 bg-emerald-500/12 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-52 w-80 h-80 bg-green-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
        
        {/* 100 Small Round Floating Dots */}
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-float"
            style={{
              width: '3px',
              height: '3px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.2 + 0.05,
              animationDuration: `${Math.random() * 8 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <div className="fixed top-[20px] left-0 right-0 z-50 py-4 pointer-events-none px-4">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between relative pointer-events-auto">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl"></div>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Relifo</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              About
            </button>
            <button
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              Dashboard
            </button>
          </div>

          {/* Disconnect Button */}
          <div className="flex items-center">
            <button
              onClick={handleDisconnect}
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-full border border-white/10 transition-all"
            >
              Disconnect
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content - Fits in viewport */}
      <div className="relative z-10 h-full flex flex-col pt-36 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Top Row - Wallet Info & Donation Stats */}
        <div className="grid md:grid-cols-2 gap-4 mb-4 flex-shrink-0">
          {/* Left Card - Wallet Information */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[200px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-3">Wallet Address</h2>
            <p className="text-white/60 text-xs font-mono mb-4 break-all">
              {address || 'Not connected'}
            </p>
            
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white mb-2">
                Relief Token Balance — {parseFloat(reliefBalance).toFixed(2)}
              </h3>
            </div>

            <button
              onClick={handleAddTokens}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-2xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all text-sm mt-auto flex-shrink-0"
            >
              Add Tokens
            </button>
          </div>

          {/* Right Card - Donation Stats */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[200px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2 flex-shrink-0">
              Total Donated: {stats.totalDonated.toFixed(2)} RELIEF
            </h2>
            <p className="text-xs text-white/60 mb-3">From {donations.length} donation{donations.length !== 1 ? 's' : ''} to {stats.campaignsSupported} campaign{stats.campaignsSupported !== 1 ? 's' : ''}</p>
            
            <div className="mt-2 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-base font-semibold text-white mb-3 flex-shrink-0">My Donation History</h3>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {donations.length === 0 ? (
                  <p className="text-white/40 text-xs">No donations yet</p>
                ) : (
                  donations.slice(0, 5).map(donation => (
                    <div key={donation.id} className="flex justify-between items-center text-xs border-b border-white/10 pb-1">
                      <span className="text-white/80 truncate mr-2">{donation.campaignTitle || 'Campaign'}</span>
                      <span className="text-green-400 font-semibold whitespace-nowrap">{parseFloat(donation.amount).toFixed(2)} RELIEF</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Campaigns */}
        <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0 overflow-hidden h-[200px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Available Campaigns -</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar flex-1">
            {availableCampaigns.length === 0 ? (
              <p className="text-white/40 col-span-full text-center py-8">No available campaigns</p>
            ) : (
              availableCampaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onDonate={() => {
                    setSelectedCampaign(campaign);
                    setDonateModalOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* My Donated Campaigns */}
        <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all flex-shrink-0 overflow-hidden h-[200px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">My Donated Campaigns -</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar flex-1">
            {donatedCampaigns.length === 0 ? (
              <p className="text-white/40 text-center py-8">You haven't donated to any campaigns yet</p>
            ) : (
              donatedCampaigns.map(campaign => {
                const userDonations = donations.filter(d => d.campaignId === campaign.id);
                const totalSupported = userDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
                const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
                
                console.log(`💝 Campaign "${campaign.title}":`, {
                  'Your donations count': userDonations.length,
                  'Your total': totalSupported,
                  'Campaign raised (all donors)': campaign.raised,
                  'Your donation records': userDonations.map(d => d.amount)
                });

                return (
                  <div key={campaign.id} className="glass-card border border-white/10 rounded-2xl p-3 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-semibold text-white truncate mr-2">{campaign.title}</h3>
                      <div className="flex flex-col items-end">
                        <span className="text-green-400 font-semibold text-xs whitespace-nowrap">You: {totalSupported.toFixed(2)} RELIEF</span>
                        <span className="text-white/40 text-[10px] whitespace-nowrap">Total: {campaign.raised?.toFixed(2) || 0} RELIEF</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>Goal: {campaign.goal?.toFixed(1) || 0} RELIEF</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Donate Again Button */}
                    <button
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setDonateModalOpen(true);
                      }}
                      className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
                    >
                      💝 Donate Again
                    </button>
                  </div>
                );
              })
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
            loadReliefBalance();
          }}
        />
      )}

      {/* Buy Tokens Modal */}
      {showBuyTokensModal && (
        <BuyTokensModal
          onClose={() => setShowBuyTokensModal(false)}
          onSuccess={() => {
            setShowBuyTokensModal(false);
            loadReliefBalance();
          }}
        />
      )}

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(5px);
          }
          50% {
            transform: translateY(-40px) translateX(-5px);
          }
          75% {
            transform: translateY(-20px) translateX(5px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes border-orbit {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        .animate-border-orbit {
          animation: border-orbit 3s linear infinite;
        }
        .glass-card {
          box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.7);
        }
      `}</style>
    </div>
  );
}

// Buy Tokens Modal Component
function BuyTokensModal({ onClose, onSuccess }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [tokenAmount, setTokenAmount] = useState('');
  const [polAmount, setPolAmount] = useState('0');
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate POL amount (1 POL = 1 RELIEF)
  useEffect(() => {
    if (tokenAmount && !isNaN(tokenAmount)) {
      setPolAmount(tokenAmount);
    } else {
      setPolAmount('0');
    }
  }, [tokenAmount]);

  const handleBuyTokens = async () => {
    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      alert('Please enter a valid token amount');
      return;
    }

    if (!walletClient) {
      alert('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setIsProcessing(true);
    setTxStatus('Preparing transaction...');

    try {
      const amountInWei = parseUnits(tokenAmount, 18);
      const ReliefTokenSaleABI = (await import('../../contracts/ReliefTokenSale.json')).default.abi;

      setTxStatus('Confirm transaction in MetaMask...');

      // Buy tokens by sending POL
      const tx = await walletClient.writeContract({
        address: polygonService.CONTRACTS.reliefTokenSale,
        abi: ReliefTokenSaleABI,
        functionName: 'buyTokens',
        args: [],
        value: amountInWei,
      });

      setTxHash(tx);
      setTxStatus('Transaction submitted! Waiting for confirmation...');

      // Wait for transaction confirmation
      const { publicClient } = await import('wagmi/actions');
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      const client = getPublicClient(config, { chainId: 80002 });
      await client.waitForTransactionReceipt({ hash: tx });

      setTxStatus('Success! Tokens purchased.');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Error buying tokens:', error);
      const errorMessage = error?.message || error?.shortMessage || 'Transaction failed';
      setTxStatus(`Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card border border-white/20 rounded-3xl p-6 max-w-md w-full bg-black/90 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Buy RELIEF Tokens</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Token Amount Input */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">
              Number of RELIEF Tokens
            </label>
            <input
              type="number"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isProcessing}
            />
          </div>

          {/* POL Amount Display */}
          <div className="glass-card bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">POL Required:</span>
              <span className="text-white font-semibold text-lg">{polAmount} POL</span>
            </div>
            <p className="text-white/40 text-xs mt-2">Exchange Rate: 1 POL = 1 RELIEF</p>
          </div>

          {/* Transaction Status */}
          {txStatus && (
            <div className={`glass-card border rounded-xl p-4 ${
              txStatus.includes('Error') ? 'bg-red-500/10 border-red-500/20' : 
              txStatus.includes('Success') ? 'bg-green-500/10 border-green-500/20' : 
              'bg-white/5 border-white/10'
            }`}>
              <p className={`text-sm ${
                txStatus.includes('Error') ? 'text-red-400' : 
                txStatus.includes('Success') ? 'text-green-400' : 
                'text-white/80'
              }`}>
                {txStatus}
              </p>
              {txHash && (
                <a
                  href={polygonService.getPolygonScanUrl(txHash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-xs mt-2 inline-block"
                >
                  View on PolygonScan →
                </a>
              )}
            </div>
          )}

          {/* Buy Button */}
          <button
            onClick={handleBuyTokens}
            disabled={isProcessing || !tokenAmount || parseFloat(tokenAmount) <= 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Buy Tokens'}
          </button>

          {txStatus.includes('Success') && txHash && (
            <div className="glass-card bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <h3 className="text-green-400 font-semibold mb-2">Payment Receipt</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Tokens Purchased:</span>
                  <span className="text-white font-semibold">{tokenAmount} RELIEF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">POL Paid:</span>
                  <span className="text-white font-semibold">{polAmount} POL</span>
                </div>
                <div className="mt-2 pt-2 border-t border-green-500/20">
                  <p className="text-white/60 text-xs">Transaction Hash:</p>
                  <a
                    href={polygonService.getPolygonScanUrl(txHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 text-xs font-mono break-all"
                  >
                    {txHash}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, onDonate }) {
  const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;

  return (
    <div className="glass-card border border-white/10 rounded-2xl p-3 bg-white/5 hover:bg-white/10 transition-all">
      <h3 className="text-white font-semibold mb-2 text-xs truncate">{campaign.title}</h3>
      <div className="mb-2">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/40 mt-1">{progress.toFixed(0)}% funded</p>
      </div>
      <button
        onClick={onDonate}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-1.5 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
      >
        Donate
      </button>
    </div>
  );
}

// Donate Modal Component
function DonateModal({ campaign, onClose }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [txStatus, setTxStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [campaignTokenAddress, setCampaignTokenAddress] = useState(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    loadCampaignToken();
    loadBalance();
  }, [address, campaign]);

  // Get the token address from the campaign contract
  const loadCampaignToken = async () => {
    try {
      if (!campaign.blockchainAddress) return;
      
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      const CampaignABI = (await import('../../contracts/Campaign.json')).default.abi;
      
      const client = getPublicClient(config, { chainId: 80002 });
      const tokenAddr = await client.readContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI,
        functionName: 'reliefToken',
      });
      console.log('🪙 Campaign uses token:', tokenAddr);
      setCampaignTokenAddress(tokenAddr);
    } catch (error) {
      console.error('Error loading campaign token:', error);
      // Fallback to global token
      setCampaignTokenAddress(polygonService.CONTRACTS.reliefToken);
    }
  };

  const loadBalance = async () => {
    try {
      if (!address) return;
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      
      // Use campaign's token address or fallback to global
      const tokenToCheck = campaignTokenAddress || polygonService.CONTRACTS.reliefToken;
      
      const client = getPublicClient(config, { chainId: 80002 });
      const bal = await client.readContract({
        address: tokenToCheck,
        abi: (await import('../../contracts/ReliefToken.json')).default.abi,
        functionName: 'balanceOf',
        args: [address],
      });
      setBalance(formatEther(bal));
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  // Reload balance when campaign token is loaded
  useEffect(() => {
    if (campaignTokenAddress && address) {
      loadBalance();
    }
  }, [campaignTokenAddress, address]);

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

      if (!campaignTokenAddress) {
        alert('Loading campaign token... Please try again.');
        return;
      }

      setIsProcessing(true);
      setTxStatus('Preparing transaction...');

      const amountInWei = parseEther(amount);
      
      // Use the campaign's token address
      const tokenToUse = campaignTokenAddress;
      
      console.log('=== Donation Details ===');
      console.log('Donor address:', address);
      console.log('Campaign blockchain address:', campaign.blockchainAddress);
      console.log('Amount:', amount, 'RELIEF');
      console.log('Amount in Wei:', amountInWei.toString());
      console.log('🪙 Campaign Token address:', tokenToUse);
      console.log('Donor balance:', balance, 'RELIEF');

      // Check balance
      if (parseFloat(amount) > parseFloat(balance)) {
        throw new Error('Insufficient RELIEF token balance');
      }

      // Get contract ABIs
      const ReliefTokenABI = (await import('../../contracts/ReliefToken.json')).default.abi;
      const CampaignABI = (await import('../../contracts/Campaign.json')).default.abi;
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      const client = getPublicClient(config, { chainId: 80002 });

      // Check allowance using campaign's token
      setTxStatus('Checking token allowance...');
      const currentAllowance = await client.readContract({
        address: tokenToUse,
        abi: ReliefTokenABI,
        functionName: 'allowance',
        args: [address, campaign.blockchainAddress],
      });

      // Approve if needed
      if (currentAllowance < amountInWei) {
        setTxStatus('Estimating gas for approval...');
        
        // Try to estimate gas first to get better error messages
        try {
          const gasEstimate = await client.estimateContractGas({
            address: tokenToUse,
            abi: ReliefTokenABI,
            functionName: 'approve',
            args: [campaign.blockchainAddress, amountInWei],
            account: address,
          });
          console.log('Approval gas estimate:', gasEstimate);
        } catch (estimateError) {
          console.error('❌ Approval gas estimation failed!');
          console.error('Estimate error:', estimateError);
          if (estimateError.shortMessage) {
            console.error('Short message:', estimateError.shortMessage);
          }
          if (estimateError.details) {
            console.error('Details:', estimateError.details);
          }
          throw new Error('Approval would fail: ' + (estimateError.shortMessage || estimateError.message));
        }
        
        setTxStatus('Please approve RELIEF tokens in MetaMask...');
        const approveTxHash = await walletClient.writeContract({
          address: tokenToUse,
          abi: ReliefTokenABI,
          functionName: 'approve',
          args: [campaign.blockchainAddress, amountInWei],
          account: address,
        });
        
        console.log('✅ Approval tx sent:', approveTxHash);
        setTxStatus('Waiting for approval confirmation (2 blocks)...');
        
        // Wait for 2 block confirmations
        const approveReceipt = await client.waitForTransactionReceipt({ 
          hash: approveTxHash,
          confirmations: 2,
          timeout: 60_000 // 60 seconds
        });
        
        console.log('✅ Approval confirmed at block:', approveReceipt.blockNumber);
        
        // Verify allowance was actually updated
        const newAllowance = await client.readContract({
          address: tokenToUse,
          abi: ReliefTokenABI,
          functionName: 'allowance',
          args: [address, campaign.blockchainAddress],
        });
        
        console.log('✅ New allowance verified:', formatEther(newAllowance), 'RELIEF');
        
        if (newAllowance < amountInWei) {
          throw new Error('Approval failed: Allowance not updated on-chain');
        }
        
        // Wait for network to sync
        setTxStatus('Syncing with network...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Donate
      setTxStatus('Please confirm donation in MetaMask...');
      const donateTxHash = await walletClient.writeContract({
        address: campaign.blockchainAddress,
        abi: CampaignABI,
        functionName: 'donate',
        args: [amountInWei],
      });

      console.log('✅ Donation tx sent:', donateTxHash);
      setTxStatus('Waiting for donation confirmation (2 blocks)...');
      
      const receipt = await client.waitForTransactionReceipt({ 
        hash: donateTxHash,
        confirmations: 2,
        timeout: 60_000 // 60 seconds
      });
      
      console.log('✅ Donation confirmed at block:', receipt.blockNumber);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card border border-white/20 rounded-3xl max-w-md w-full p-8 bg-black/80 backdrop-blur-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Donate to Campaign</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white text-3xl"
          >
            ×
          </button>
        </div>

        {/* Campaign Info */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <h3 className="font-semibold text-white mb-2">{campaign.title}</h3>
          <p className="text-sm text-white/60 mb-3">📍 {campaign.location}</p>
          
          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/60">Progress</span>
              <span className="font-semibold text-green-400">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-white/60">Raised: <strong className="text-white">{campaign.raised || 0} RELIEF</strong></span>
            <span className="text-white/60">Goal: <strong className="text-white">{campaign.goal} RELIEF</strong></span>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">
            Your Balance: <strong>{parseFloat(balance).toFixed(2)} RELIEF</strong>
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">
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
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Transaction Status */}
        {txStatus && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
              <p className="text-sm text-yellow-400">{txStatus}</p>
            </div>
          </div>
        )}

        {/* Donate Button */}
        <button
          onClick={handleDonate}
          disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        <p className="text-xs text-white/40 mt-3 text-center">
          Transactions are processed on Polygon Amoy testnet
        </p>
      </div>
    </div>
  );
}
