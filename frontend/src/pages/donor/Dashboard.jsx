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
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [buyUsdcModalOpen, setBuyUsdcModalOpen] = useState(false);
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    console.log('🔄 Donor Dashboard: Setting up listeners for', address);
    
    loadUSDCBalance();
    
    // Refresh balance every 5 seconds for real-time updates
    const balanceInterval = setInterval(() => {
      loadUSDCBalance();
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
    
    // Listen for donation completion event to reload balance
    const handleBalanceReload = () => {
      console.log('🔄 Donation completed, reloading USDC balance...');
      loadUSDCBalance();
    };
    
    window.addEventListener('reloadUSDCBalance', handleBalanceReload);
    
    // Cleanup function
    return () => {
      console.log('🧹 Donor Dashboard: Cleaning up listeners');
      clearInterval(balanceInterval);
      window.removeEventListener('reloadUSDCBalance', handleBalanceReload);
      if (unsubscribeCampaigns) unsubscribeCampaigns();
      if (unsubscribeDonations) unsubscribeDonations();
    };
  }, [address]);

  const loadUSDCBalance = async () => {
    if (!address) {
      console.log('⚠️ No address, skipping balance load');
      return;
    }
    
    try {
      const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // User's actual USDC contract
      console.log('💰 Loading USDC balance for:', address);
      console.log('💰 USDC contract:', USDC_ADDRESS);
      
      if (typeof window.ethereum === 'undefined') {
        console.error('❌ MetaMask not found!');
        return;
      }

      // Check current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🌐 Current chain ID:', chainId, '(should be 0x13882 for Polygon Amoy)');
      
      if (chainId !== '0x13882') {
        console.error('❌ Wrong network! Please switch to Polygon Amoy (Chain ID: 80002)');
        setNetworkStatus('wrong');
        setUsdcBalance('0.00');
        return;
      }
      
      setNetworkStatus('correct');

      // balanceOf(address) function selector = 0x70a08231
      const data = '0x70a08231' + address.slice(2).padStart(64, '0');
      console.log('📤 Calling balanceOf with data:', data);
      
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: USDC_ADDRESS,
          data: data
        }, 'latest']
      });
      
      console.log('📥 Raw result:', result);
      const balanceRaw = parseInt(result, 16);
      const formattedBalance = (balanceRaw / 1e6).toFixed(2);
      console.log('✅ USDC balance loaded:', formattedBalance, 'USDC (raw:', balanceRaw, ')');
      setUsdcBalance(formattedBalance);
      
    } catch (error) {
      console.error('❌ Error loading USDC balance:', error);
      console.error('Error details:', error.message);
      setUsdcBalance('0.00');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const switchToPolygonAmoy = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }], // 80002 in hex
      });
      setNetworkStatus('correct');
      // Reload balance after switching
      setTimeout(() => loadUSDCBalance(), 1000);
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x13882',
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
              rpcUrls: ['https://rpc-amoy.polygon.technology/'],
              blockExplorerUrls: ['https://amoy.polygonscan.com/']
            }]
          });
          setNetworkStatus('correct');
          setTimeout(() => loadUSDCBalance(), 1000);
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      } else {
        console.error('Failed to switch network:', error);
      }
    }
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
                USDC Balance — ${parseFloat(usdcBalance).toFixed(2)}
              </h3>
              <p className="text-white/40 text-xs">Stablecoin for donations</p>
              
              {networkStatus === 'wrong' && (
                <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-xs mb-2">⚠️ Wrong Network</p>
                  <button
                    onClick={switchToPolygonAmoy}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
                  >
                    Switch to Polygon Amoy
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setBuyUsdcModalOpen(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-sm mt-auto flex-shrink-0"
            >
              💰 Add USDC
            </button>
          </div>

          {/* Right Card - Donation Stats */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[200px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2 flex-shrink-0">
              Total Donated: ${stats.totalDonated.toFixed(2)} USDC
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
                      <span className="text-green-400 font-semibold whitespace-nowrap">${parseFloat(donation.amount).toFixed(2)} USDC</span>
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
                        <span className="text-green-400 font-semibold text-xs whitespace-nowrap">You: ${totalSupported.toFixed(2)} USDC</span>
                        <span className="text-white/40 text-[10px] whitespace-nowrap">Total: ${campaign.raised?.toFixed(2) || 0} USDC</span>
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
                        <span>Goal: ${campaign.goal?.toFixed(1) || 0} USDC</span>
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
            loadUSDCBalance();
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

      {/* Buy USDC Modal */}
      {buyUsdcModalOpen && (
        <BuyUsdcModal 
          onClose={() => setBuyUsdcModalOpen(false)} 
          onSuccess={loadUSDCBalance}
        />
      )}

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
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    loadBalance();
  }, [address, campaign]);

  // Load USDC balance using direct eth_call
  const loadBalance = async () => {
    try {
      if (!address) return;
      
      const USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // User's actual USDC contract
      
      if (typeof window.ethereum !== 'undefined') {
        // balanceOf(address) function selector = 0x70a08231
        const data = '0x70a08231' + address.slice(2).padStart(64, '0');
        
        const result = await window.ethereum.request({
          method: 'eth_call',
          params: [{
            to: USDC_ADDRESS,
            data: data
          }, 'latest']
        });
        
        const balanceRaw = parseInt(result, 16);
        setBalance((balanceRaw / 1e6).toFixed(2)); // USDC has 6 decimals
      }
    } catch (error) {
      console.error('Error loading USDC balance:', error);
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

      // USDC has 6 decimals
      const amountInDecimals = parseUnits(amount, 6);
      
      console.log('=== Donation Details ===');
      console.log('Donor address:', address);
      console.log('Campaign blockchain address:', campaign.blockchainAddress);
      console.log('Amount:', amount, 'USDC');
      console.log('Amount in decimals:', amountInDecimals.toString());
      console.log('Donor USDC balance:', balance);

      // Check balance
      if (parseFloat(amount) > parseFloat(balance)) {
        throw new Error('Insufficient USDC balance');
      }

      // Get contract ABIs
      const USDC_ABI = [
        {
          "constant": false,
          "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
          ],
          "name": "approve",
          "outputs": [{"name": "", "type": "bool"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [
            {"name": "_owner", "type": "address"},
            {"name": "_spender", "type": "address"}
          ],
          "name": "allowance",
          "outputs": [{"name": "", "type": "uint256"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [{"name": "_owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"name": "balance", "type": "uint256"}],
          "type": "function"
        }
      ];
      const CampaignABI = (await import('../../contracts/Campaign.json')).default.abi;
      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      const client = getPublicClient(config, { chainId: 80002 });

      // Check allowance for USDC
      setTxStatus('Checking USDC allowance...');
      const currentAllowance = await client.readContract({
        address: polygonService.CONTRACTS.usdc,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address, campaign.blockchainAddress],
      });

      // Approve if needed
      if (currentAllowance < amountInDecimals) {
        setTxStatus('Please approve USDC in MetaMask...');
        const approveTxHash = await walletClient.writeContract({
          address: polygonService.CONTRACTS.usdc,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [campaign.blockchainAddress, amountInDecimals],
          account: address,
        });
        
        console.log('✅ Approval tx sent:', approveTxHash);
        setTxStatus('Waiting for approval confirmation...');
        
        await client.waitForTransactionReceipt({ 
          hash: approveTxHash,
          confirmations: 2,
          timeout: 60_000
        });
        
        console.log('✅ Approval confirmed! Proceeding to donation...');
        
        // Wait for network to sync
        setTxStatus('✅ Approval confirmed! Now processing donation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('ℹ️ Already approved, proceeding directly to donation');
        setTxStatus('USDC already approved, processing donation...');
      }

      // Donate
      console.log('🎁 Starting donation transaction...');
      console.log('Campaign address:', campaign.blockchainAddress);
      console.log('Amount:', amountInDecimals.toString());
      
      setTxStatus('⚠️ IMPORTANT: Confirm the DONATION in MetaMask (2nd popup)...');
      
      try {
        const donateTxHash = await walletClient.writeContract({
          address: campaign.blockchainAddress,
          abi: CampaignABI,
          functionName: 'donate',
          args: [amountInDecimals],
        });

        console.log('✅ Donation tx sent:', donateTxHash);
        setTxStatus('Waiting for donation confirmation...');
        
        const receipt = await client.waitForTransactionReceipt({ 
          hash: donateTxHash,
          confirmations: 2,
          timeout: 60_000
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
        currency: 'USDC',
        txHash: donateTxHash,
        blockNumber: receipt.blockNumber.toString(),
        network: 'polygon-amoy',
        chainId: 80002,
        createdAt: serverTimestamp()
      });

      // Success
      setTxStatus('✅ Donation successful! Updating balance...');
      
      // Reload balance immediately
      await loadBalance();
      
      alert(`Successfully donated $${amount} USDC!\n\nTransaction: ${donateTxHash}\n\nView on PolygonScan: ${polygonService.getPolygonScanUrl(donateTxHash)}`);
      
      // Trigger parent component to reload USDC balance
      window.dispatchEvent(new Event('reloadUSDCBalance'));
      
      onClose();
      } catch (donationError) {
        console.error('❌ DONATION TRANSACTION FAILED:', donationError);
        throw new Error(`Donation failed: ${donationError.message || 'User rejected or transaction failed'}`);
      }
      
    } catch (error) {
      console.error('❌ Transaction error:', error);
      const errorMsg = error.message || polygonService.parseContractError(error);
      alert(`Transaction failed: ${errorMsg}\n\nCheck console for details.`);
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
            <span className="text-white/60">Raised: <strong className="text-white">${campaign.raised || 0} USDC</strong></span>
            <span className="text-white/60">Goal: <strong className="text-white">${campaign.goal} USDC</strong></span>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">
            Your USDC Balance: <strong>${parseFloat(balance).toFixed(2)}</strong>
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">
            Donation Amount (USDC)
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
            '💝 Donate USDC'
          )}
        </button>

        <p className="text-xs text-white/40 mt-3 text-center">
          Transactions are processed on Polygon Amoy testnet
        </p>
      </div>
    </div>
  );
}

// Buy USDC Modal Component
function BuyUsdcModal({ onClose, onSuccess }) {
  const [polAmount, setPolAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('0');
  const [polBalance, setPolBalance] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    loadPolBalance();
    loadExchangeRate();
    
    // Auto-refresh exchange rate every 30 seconds
    const rateInterval = setInterval(() => {
      loadExchangeRate();
    }, 30000);
    
    return () => clearInterval(rateInterval);
  }, [address]);

  useEffect(() => {
    if (polAmount && parseFloat(polAmount) > 0 && parseFloat(exchangeRate) > 0) {
      const usdc = (parseFloat(polAmount) * parseFloat(exchangeRate)).toFixed(2);
      setUsdcAmount(usdc);
    } else {
      setUsdcAmount('0');
    }
  }, [polAmount, exchangeRate]);

  const loadPolBalance = async () => {
    try {
      if (!address || typeof window.ethereum === 'undefined') return;
      
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      const balanceInPOL = (parseInt(balance, 16) / 1e18).toFixed(4);
      setPolBalance(balanceInPOL);
    } catch (error) {
      console.error('Error loading POL balance:', error);
    }
  };

  const loadExchangeRate = async () => {
    try {
      console.log('🔄 Fetching real-time POL to USDC exchange rate...');
      
      // Fetch real-time POL price from CoinGecko API (polygon is the correct ID)
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=polygon&vs_currencies=usd', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.polygon && data.polygon.usd) {
        const polPriceInUSD = data.polygon.usd;
        console.log('✅ Real-time POL price:', polPriceInUSD, 'USD');
        console.log('💵 Exchange rate: 1 POL =', polPriceInUSD, 'USDC');
        setExchangeRate(polPriceInUSD.toString());
      } else {
        throw new Error('Invalid response format from CoinGecko');
      }
    } catch (error) {
      console.error('❌ Error loading exchange rate:', error.message);
      // Fallback to current approximate rate if API fails
      setExchangeRate('0.16');
      console.log('⚠️ Using fallback rate: 0.16 USD per POL');
    }
  };

  const handleBuyUsdc = async () => {
    try {
      if (!polAmount || parseFloat(polAmount) <= 0) {
        alert('Please enter a valid POL amount');
        return;
      }

      if (parseFloat(polAmount) > parseFloat(polBalance)) {
        alert('Insufficient POL balance');
        return;
      }

      if (!walletClient) {
        alert('Please connect your wallet');
        return;
      }

      setIsProcessing(true);
      setTxStatus('Preparing swap...');

      const polAmountInWei = parseEther(polAmount);
      
      console.log('=== Swap Details ===');
      console.log('POL Amount:', polAmount);
      console.log('Expected USDC:', usdcAmount);
      console.log('Exchange Rate:', exchangeRate, 'USDC per POL');

      // Get swap contract address
      const swapContractAddress = polygonService.CONTRACTS.testnetUsdcSwap;
      console.log('Swap Contract:', swapContractAddress);

      if (!swapContractAddress) {
        throw new Error('Swap contract address not configured. Please check addresses.json');
      }

      setTxStatus('Please confirm swap in MetaMask...');

      // Call swapPOLforUSDC function on the TestnetUSDCSwap contract
      // The contract receives POL and sends USDC back to the user
      const SWAP_ABI = [{
        "inputs": [],
        "name": "swapPOLforUSDC",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      }];

      const txHash = await walletClient.writeContract({
        address: swapContractAddress,
        abi: SWAP_ABI,
        functionName: 'swapPOLforUSDC',
        value: polAmountInWei,
        account: address,
      });

      console.log('✅ Swap tx sent:', txHash);
      setTxStatus('Waiting for confirmation...');

      const { getPublicClient } = await import('@wagmi/core');
      const { config } = await import('../../config/wagmiConfig');
      const client = getPublicClient(config, { chainId: 80002 });

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
        timeout: 60_000
      });

      console.log('✅ Swap confirmed at block:', receipt.blockNumber);

      alert(`✅ Successfully bought ${usdcAmount} USDC with ${polAmount} POL!\\n\\nTransaction: ${txHash}\\n\\nView on PolygonScan: ${polygonService.getPolygonScanUrl(txHash)}`);

      // Reload USDC balance
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }

      onClose();
    } catch (error) {
      console.error('Swap error:', error);
      const errorMsg = error.message || 'Transaction failed';
      alert(`Swap failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
      setTxStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">💰 Buy USDC with POL</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* POL Balance */}
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-400">
            Your POL Balance: <strong>{parseFloat(polBalance).toFixed(4)} POL</strong>
          </p>
        </div>

        {/* Exchange Rate */}
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-400">
              Exchange Rate: <strong>1 POL = ${exchangeRate} USDC</strong>
            </p>
            <span className="text-xs text-blue-400/60">🔄 Live</span>
          </div>
          <p className="text-xs text-blue-400/60 mt-1">Updates every 30 seconds</p>
        </div>

        {/* POL Amount Input */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">
            Amount to Spend (POL)
          </label>
          <input
            type="number"
            value={polAmount}
            onChange={(e) => setPolAmount(e.target.value)}
            disabled={isProcessing}
            placeholder="Enter POL amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* USDC You'll Receive */}
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400 mb-1">You will receive:</p>
          <p className="text-2xl text-green-400 font-bold">${usdcAmount} USDC</p>
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

        {/* Buy Button */}
        <button
          onClick={handleBuyUsdc}
          disabled={isProcessing || !polAmount || parseFloat(polAmount) <= 0}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            '💳 Buy USDC'
          )}
        </button>

        <p className="text-xs text-white/40 mt-3 text-center">
          Swap powered by POLtoUSDC contract on Polygon Amoy<br/>
          <span className="text-yellow-400/60">Note: MetaMask may show "ETH" but you're paying with POL on Polygon</span>
        </p>
      </div>
    </div>
  );
}
