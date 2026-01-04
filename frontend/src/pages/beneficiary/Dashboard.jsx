import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { getPublicClient } from '@wagmi/core';
import { config } from '../../config/wagmiConfig';
import ReliefTokenABI from '../../contracts/ReliefToken.json';
import BeneficiaryWalletABI from '../../contracts/BeneficiaryWallet.json';
import CampaignABI from '../../contracts/Campaign.json';
import { CONTRACTS, getPolygonScanUrl, parseContractError } from '../../services/polygonService';

export default function BeneficiaryDashboard() {
  const [contractWalletAddress, setContractWalletAddress] = useState(null);
  const [allocatedAmount, setAllocatedAmount] = useState('0');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [spentAmount, setSpentAmount] = useState('0');
  const [transactions, setTransactions] = useState([]);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [userData, setUserData] = useState(null);
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  // Load beneficiary wallet and balance from blockchain
  const loadFromBlockchain = async (campaignAddress) => {
    try {
      console.log('🔗 Loading data from blockchain...');
      console.log('Campaign Address:', campaignAddress);
      console.log('Beneficiary Address:', address);
      
      const publicClient = getPublicClient(config, { chainId: 80002 });
      
      // Get beneficiary wallet address from campaign contract
      const walletAddress = await publicClient.readContract({
        address: campaignAddress,
        abi: CampaignABI.abi,
        functionName: 'getBeneficiaryWallet',
        args: [address],
      });
      
      console.log('💼 Beneficiary Wallet from blockchain:', walletAddress);
      
      if (walletAddress && walletAddress !== '0x0000000000000000000000000000000000000000') {
        setContractWalletAddress(walletAddress);
        
        // Get wallet balance
        const balance = await publicClient.readContract({
          address: CONTRACTS.reliefToken,
          abi: ReliefTokenABI.abi,
          functionName: 'balanceOf',
          args: [walletAddress],
        });
        
        const balanceFormatted = formatEther(balance);
        console.log('💰 Wallet balance from blockchain:', balanceFormatted, 'RELIEF');
        setCurrentBalance(balanceFormatted);
        setAllocatedAmount(balanceFormatted); // Use balance as allocated amount
        
        return walletAddress;
      } else {
        console.log('⚠️ No wallet created yet for this beneficiary');
        console.log('This means no funds have been allocated yet.');
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading from blockchain:', error);
      console.error('Error details:', error.message);
      if (error.cause) {
        console.error('Error cause:', error.cause);
      }
      return null;
    }
  };

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    console.log('🔍 Beneficiary Dashboard - Loading data for address:', address);

    // Real-time listener for user data (using lowercase for case-insensitive lookup)
    const userRef = doc(db, 'users', address.toLowerCase());
    const unsubscribeUser = onSnapshot(userRef, async (snapshot) => {
      console.log('📄 User document snapshot:', {
        exists: snapshot.exists(),
        id: snapshot.id,
        data: snapshot.data()
      });
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('👤 User data:', data);
        setUserData(data); // Store user data in state
        
        // Load campaign info first
        if (data.campaignId) {
          console.log('📋 Loading campaign:', data.campaignId);
          const campaignDoc = await getDoc(doc(db, 'campaigns', data.campaignId));
          if (campaignDoc.exists()) {
            const campaignData = { id: campaignDoc.id, ...campaignDoc.data() };
            setCampaign(campaignData);
            console.log('✅ Campaign loaded:', campaignData.title);
            console.log('📍 Campaign blockchain address:', campaignData.blockchainAddress);
            
            // Load wallet and balance from blockchain using campaign contract address
            if (campaignData.blockchainAddress) {
              console.log('🔗 Loading from blockchain with address:', campaignData.blockchainAddress);
              const walletFromBlockchain = await loadFromBlockchain(campaignData.blockchainAddress);
              
              // If blockchain has wallet but Firebase doesn't, trust blockchain
              if (walletFromBlockchain && !data.contractWalletAddress) {
                console.log('✅ Using blockchain data (Firebase not updated yet)');
              }
            } else {
              console.error('❌ Campaign missing blockchainAddress field!');
              console.error('Campaign data:', campaignData);
            }
          } else {
            console.error('❌ Campaign document not found for ID:', data.campaignId);
          }
        } else {
          console.warn('⚠️ User data missing campaignId field');
        }
        
        // Also check Firebase data (for backward compatibility)
        if (data.contractWalletAddress && !contractWalletAddress) {
          console.log('💼 Found contract wallet in Firebase:', data.contractWalletAddress);
          setContractWalletAddress(data.contractWalletAddress);
          await loadWalletBalance(data.contractWalletAddress);
        }
        
        if (data.allocatedAmount !== undefined && allocatedAmount === '0') {
          console.log('💰 Allocated amount from Firebase:', data.allocatedAmount);
          setAllocatedAmount((data.allocatedAmount || 0).toString());
        }
      } else {
        console.log('❌ User document does not exist');
        console.log('------------------------------------------------------------');
        console.log('🔍 FIREBASE DOCUMENT NOT FOUND');
        console.log('------------------------------------------------------------');
        console.log('Your wallet address:', address);
        console.log('Looking for document ID:', address.toLowerCase());
        console.log('');
        console.log('Trying to load from blockchain as fallback...');
        console.log('------------------------------------------------------------');
        
        // Try to load from blockchain even if Firebase document doesn't exist
        // This requires knowing the campaign address somehow
        // For now, we'll wait for Firebase to have at least the campaignId
      }
      setLoading(false);
    }, (error) => {
      console.error('❌ Error listening to user document:', error);
      setLoading(false);
    });

    // Real-time listener for spending transactions (using lowercase for consistency)
    const spendingQuery = query(
      collection(db, 'spending'),
      where('beneficiaryId', '==', address.toLowerCase())
    );
    
    const unsubscribeSpending = onSnapshot(spendingQuery, (snapshot) => {
      const spendingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('💸 Spending transactions:', spendingData);
      setTransactions(spendingData);
      
      const total = spendingData.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
      setSpentAmount(total.toString());
    });

    return () => {
      unsubscribeUser();
      unsubscribeSpending();
    };
  }, [address]);

  const loadWalletBalance = async (walletAddress) => {
    try {
      console.log('💰 Loading balance for wallet:', walletAddress);
      const publicClient = getPublicClient(config, { chainId: 80002 });
      
      // Get RELIEF token balance of BeneficiaryWallet
      const balance = await publicClient.readContract({
        address: CONTRACTS.reliefToken,
        abi: ReliefTokenABI.abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      
      const balanceFormatted = formatEther(balance);
      console.log('✅ Wallet balance:', balanceFormatted, 'RELIEF');
      setCurrentBalance(balanceFormatted);
    } catch (error) {
      console.error('━'.repeat(60));
      console.error('❌ ERROR Loading Wallet Balance');
      console.error('━'.repeat(60));
      console.error('Contract Wallet:', contractWalletAddress);
      console.error('ReliefToken Address:', CONTRACTS.reliefToken);
      console.error('Error:', error.message);
      console.error('');
      console.error('Possible causes:');
      console.error('1. Network connection issue');
      console.error('2. Invalid contract wallet address');
      console.error('3. Contract not deployed on current network');
      console.error('━'.repeat(60));
    }
  };

  // Reload balance every 10 seconds
  useEffect(() => {
    if (!contractWalletAddress) return;
    
    const interval = setInterval(() => {
      loadWalletBalance(contractWalletAddress);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [contractWalletAddress]);

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const scrollToSection = (sectionId) => {
    navigate('/');
  };

  const remainingAmount = parseFloat(currentBalance);
  const spentPercentage = parseFloat(allocatedAmount) > 0 
    ? ((parseFloat(allocatedAmount) - parseFloat(currentBalance)) / parseFloat(allocatedAmount)) * 100 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-black relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Round Green Glowing Orbs */}
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
      <div className="fixed top-[25px] left-0 right-0 z-50 py-4 pointer-events-none px-4">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between gap-[3px] relative pointer-events-auto">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl pointer-events-none"></div>
          
          {/* Logo */}
          <div className="flex items-center space-x-2 w-[150px] ml-[5px]">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Relifo</span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center space-x-5 -ml-[10px] relative z-10">
            <button onClick={() => navigate('/')} className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">Home</span>
            </button>
            <button onClick={() => scrollToSection('about')} className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">About</span>
            </button>
            <button className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">Beneficiary</span>
            </button>
          </div>

          {/* Disconnect Button */}
          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={handleDisconnect}
              className="group relative flex cursor-pointer items-center justify-center whitespace-nowrap border border-white/10 px-6 py-3 text-white bg-black rounded-[100px] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px w-[150px] overflow-visible"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
                <div className="absolute aspect-square bg-gradient-to-l from-[#10b981] to-transparent animate-border-orbit opacity-90" style={{width: '51px', offsetPath: 'rect(0px auto auto 0px round 40px)'}}></div>
              </div>
              <span className="relative z-20">Disconnect</span>
              <div className="pointer-events-none insert-0 absolute size-full rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"></div>
              <div className="pointer-events-none absolute -z-10 bg-black rounded-[100px] inset-[0.05em]"></div>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col pt-36 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        
        {/* Debug Panel (only show in development) */}
        <div className="glass-card border border-yellow-400/30 rounded-xl p-4 mb-4 flex-shrink-0 bg-yellow-900/10">
          <h3 className="text-sm font-bold text-yellow-300 mb-2">🔍 Debug Info</h3>
          <div className="text-xs font-mono text-yellow-200/80 space-y-1">
            <p>✓ Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <p>✓ Campaign: {campaign ? campaign.title : 'Loading...'}</p>
            <p>✓ Campaign Address: {campaign?.blockchainAddress || 'Not loaded'}</p>
            <p>✓ Beneficiary Wallet: {contractWalletAddress ? `${contractWalletAddress.slice(0, 6)}...${contractWalletAddress.slice(-4)}` : 'Not created'}</p>
            <p>✓ Balance: {currentBalance} RELIEF</p>
            <p>✓ Loading: {loading ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        {!contractWalletAddress ? (
          <div className="glass-card border border-white/20 rounded-3xl p-12 backdrop-blur-md bg-white/5 text-center flex-1 flex items-center justify-center">
            <div>
              <span className="text-6xl mb-4 block">📭</span>
              <h3 className="text-2xl font-semibold text-white mb-2">
                No Funds Allocated Yet
              </h3>
              <p className="text-white/70 mb-4">
                Waiting for organizer approval and fund allocation
              </p>
              {campaign && (
                <div className="mt-4 p-4 glass-card border border-white/10 rounded-xl bg-white/5 inline-block">
                  <p className="text-sm text-white/90">
                    Registered for: <strong className="text-green-400">{campaign.title}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Top Row - Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
              {/* Total Allocated */}
              <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
                <h2 className="text-sm font-semibold text-white/70 mb-2">💰 Total Allocated</h2>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-5xl font-bold text-green-400">
                    {parseFloat(currentBalance).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-white/50 text-center">RELIEF Tokens (Live from Blockchain)</p>
              </div>

              {/* Current Balance */}
              <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
                <h2 className="text-sm font-semibold text-white/70 mb-2">💳 Current Balance</h2>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-5xl font-bold text-blue-400">
                    {parseFloat(currentBalance).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-white/50 text-center">Available to Spend (Real-time)</p>
              </div>

              {/* Total Spent */}
              <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
                <h2 className="text-sm font-semibold text-white/70 mb-2">📊 Total Spent</h2>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-5xl font-bold text-purple-400">
                    {parseFloat(spentAmount).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-white/50 text-center">From {transactions.length} Transactions</p>
              </div>
            </div>

            {/* Campaign Info Card */}
            {campaign && (
              <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-white mb-3">📋 Campaign Details</h2>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-white/70 text-sm w-32">Title:</span>
                    <span className="text-white text-sm font-medium">{campaign.title}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-white/70 text-sm w-32">Description:</span>
                    <span className="text-white/80 text-sm">{campaign.description}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-white/70 text-sm w-32">Location:</span>
                    <span className="text-white text-sm">📍 {campaign.location}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-white/70 text-sm w-32">Disaster Type:</span>
                    <span className="text-white text-sm">🌊 {campaign.disasterType}</span>
                  </div>
                  {contractWalletAddress && (
                    <div className="flex items-start">
                      <span className="text-white/70 text-sm w-32">Your Wallet:</span>
                      <a 
                        href={`https://amoy.polygonscan.com/address/${contractWalletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 text-sm hover:text-green-300 transition font-mono"
                      >
                        {contractWalletAddress.slice(0, 6)}...{contractWalletAddress.slice(-4)} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0">
              <button
                onClick={() => setShowSpendModal(true)}
                disabled={parseFloat(currentBalance) <= 0}
                className="w-full group relative flex cursor-pointer items-center justify-center whitespace-nowrap border border-white/10 px-6 py-4 text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-[100px] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-20 text-lg font-semibold">🛒 Spend RELIEF Tokens</span>
              </button>
              <p className="text-xs text-white/50 mt-3 text-center">
                Current Balance: {parseFloat(currentBalance).toFixed(2)} RELIEF
              </p>
            </div>

            {/* Transaction History */}
            <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all flex-1 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-4">📜 Transaction History</h2>
              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {transactions.length === 0 ? (
                  <div className="text-center text-white/50 py-8">
                    <p>No transactions yet</p>
                    <p className="text-xs mt-2">Your spending history will appear here</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="glass-card border border-white/10 rounded-2xl p-4 bg-white/5 hover:bg-white/10 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-semibold">{tx.merchantName}</p>
                          <p className="text-xs text-white/50">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="text-red-400 font-bold text-lg">-{parseFloat(tx.amount).toFixed(2)} RELIEF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">{tx.category}</span>
                        <a 
                          href={getPolygonScanUrl(tx.txHash, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 transition"
                        >
                          View on Explorer ↗
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spend Modal */}
      {showSpendModal && <SpendModal />}

      {/* CSS Animations */}
      <style jsx>{`
        .glass-card {
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-15px) translateX(5px);
          }
        }
        
        .animate-float {
          animation: float linear infinite;
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
          animation: border-orbit 4s linear infinite;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );

  // Helper function for Spend Modal
  function SpendModal() {
    return (
      <SpendFundsModal
        walletAddress={contractWalletAddress}
        availableBalance={remainingAmount}
        onClose={() => setShowSpendModal(false)}
        onSuccess={() => loadWalletBalance(contractWalletAddress)}
      />
    );
  }
}

function TransactionCard({ transaction }) {
  return (
    <div className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{getCategoryIcon(transaction.category)}</span>
          <div>
            <h4 className="font-semibold text-gray-900">{transaction.merchantName || 'Merchant'}</h4>
            <p className="text-sm text-gray-600">Category: {transaction.category}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'Recent'}
        </p>
        {transaction.txHash && (
          <a
            href={getPolygonScanUrl(transaction.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on PolygonScan ↗
          </a>
        )}
      </div>
      <div className="text-right">
        <p className="text-xl font-bold text-purple-600">{transaction.amount} RELIEF</p>
        <p className="text-xs text-green-600">✓ Confirmed</p>
      </div>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    'Food': '🍲',
    'Medicine': '💊',
    'Shelter': '🏠',
    'Education': '📚',
    'Clothing': '👕',
    'Other': '📦'
  };
  return icons[category] || '📦';
}

function SpendFundsModal({ walletAddress, availableBalance, onClose, onSuccess }) {
  const [merchantAddress, setMerchantAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [merchantName, setMerchantName] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const categories = ['Food', 'Medicine', 'Shelter', 'Education', 'Clothing', 'Other'];

  const handleSpend = async () => {
    try {
      if (!merchantAddress || !amount || parseFloat(amount) <= 0) {
        alert('Please enter merchant address and valid amount');
        return;
      }

      if (!merchantName) {
        alert('Please enter merchant name');
        return;
      }

      if (!walletClient) {
        alert('Please connect your wallet');
        return;
      }

      if (parseFloat(amount) > availableBalance) {
        alert(`Insufficient balance.\n\nAvailable: ${availableBalance.toFixed(2)} RELIEF\nRequested: ${amount} RELIEF`);
        return;
      }

      setIsProcessing(true);
      setTxStatus('Checking merchant approval...');

      const amountInWei = parseEther(amount);
      const publicClient = getPublicClient(config, { chainId: 80002 });

      console.log('🛒 Spending:', {
        wallet: walletAddress,
        merchant: merchantAddress,
        amount: amount,
        category: category
      });

      // Map category to Category enum (0 = Food, 1 = Medicine, etc.)
      const categoryIndex = categories.indexOf(category);

      // Check if merchant is approved for this category
      setTxStatus('Verifying merchant approval...');
      const isApproved = await publicClient.readContract({
        address: walletAddress,
        abi: BeneficiaryWalletABI.abi,
        functionName: 'isMerchantApproved',
        args: [merchantAddress, categoryIndex],
      });

      if (!isApproved) {
        setIsProcessing(false);
        alert(`❌ Merchant Not Approved\n\nThis merchant (${merchantName}) is not approved for ${category} purchases.\n\n📋 To spend at this merchant:\n1. Request merchant approval from your organizer\n2. Contact: Your campaign organizer\n3. Provide: Merchant address and category\n\nMerchant Address:\n${merchantAddress}\n\nCategory: ${category} (${categoryIndex})`);
        return;
      }

      // Prepare description (merchant name and category)
      const description = `Purchase from ${merchantName} - ${category}`;

      setTxStatus('Preparing spending transaction...');

      // Gas estimation to check for errors
      try {
        const gasEstimate = await publicClient.estimateContractGas({
          address: walletAddress,
          abi: BeneficiaryWalletABI.abi,
          functionName: 'spend',
          args: [merchantAddress, amountInWei, categoryIndex, description],
          account: address,
        });
        console.log('✅ Gas estimation successful:', gasEstimate);
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        let errorMsg = 'Transaction would fail';
        if (gasError.message?.includes('Only beneficiary')) {
          errorMsg = 'Only the beneficiary can spend these funds';
        } else if (gasError.message?.includes('Insufficient balance')) {
          errorMsg = 'Insufficient balance in wallet';
        } else if (gasError.message?.includes('not approved')) {
          errorMsg = 'Merchant not approved for this category. Please contact your organizer to approve this merchant.';
        } else if (gasError.shortMessage) {
          errorMsg = gasError.shortMessage;
        }
        throw new Error(errorMsg);
      }

      setTxStatus('Please confirm spending in MetaMask...');
      
      const txHash = await walletClient.writeContract({
        address: walletAddress,
        abi: BeneficiaryWalletABI.abi,
        functionName: 'spend',
        args: [merchantAddress, amountInWei, categoryIndex, description],
        account: address,
      });

      console.log('📝 Transaction hash:', txHash);
      setTxStatus('Waiting for transaction confirmation...');
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('✅ Transaction confirmed:', receipt);

      // Update Firebase
      try {
        setTxStatus('Recording transaction...');
        if (db) {
          await addDoc(collection(db, 'spending'), {
            beneficiaryId: address.toLowerCase(),
            walletAddress: walletAddress,
            merchantAddress: merchantAddress,
            merchantName: merchantName,
            amount: parseFloat(amount),
            category: category,
            txHash: txHash,
            blockNumber: receipt.blockNumber.toString(),
            network: 'polygon-amoy',
            chainId: 80002,
            createdAt: new Date().toISOString()
          });
        }
      } catch (dbError) {
        console.warn('⚠️ Firebase update failed (blockchain transaction succeeded):', dbError);
      }

      alert(`✅ Successfully spent ${amount} RELIEF tokens!\n\nMerchant: ${merchantName}\nCategory: ${category}\n\nTransaction: ${txHash.substring(0, 10)}...`);

      // Reload balance
      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Spending error:', error);
      const errorMsg = parseContractError(error);
      alert(`❌ Spending failed:\n\n${errorMsg || error.message || error}`);
    } finally {
      setIsProcessing(false);
      setTxStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Spend Funds</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Available Balance */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-800">
            Available Balance: <strong>{availableBalance.toFixed(2)} RELIEF</strong>
          </p>
        </div>

        {/* Merchant Name */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            disabled={isProcessing}
            placeholder="e.g., Local Grocery Store"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Merchant Address */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Merchant Wallet Address
          </label>
          <input
            type="text"
            value={merchantAddress}
            onChange={(e) => setMerchantAddress(e.target.value)}
            disabled={isProcessing}
            placeholder="0x..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
          />
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Amount (RELIEF Tokens)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            max={availableBalance}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Spending Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isProcessing}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryIcon(cat)} {cat}
              </option>
            ))}
          </select>
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

        {/* Spend Button */}
        <button
          onClick={handleSpend}
          disabled={isProcessing || !merchantAddress || !amount || !merchantName || parseFloat(amount) <= 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
            '🛒 Spend RELIEF Tokens'
          )}
        </button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Spending is restricted by category and approved merchants
        </p>
      </div>
    </div>
  );
}
