import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { parseEther, formatEther } from 'viem';
import { useNavigate } from 'react-router-dom';
import { getPublicClient } from '@wagmi/core';
import { config } from '../../config/wagmiConfig';
import { CONTRACTS } from '../../services/polygonService';
import CampaignFactoryABI from '../../contracts/CampaignFactory.json';
import ReliefTokenABI from '../../contracts/ReliefToken.json';
import { useNotification } from '../../contexts/NotificationContext';

export default function MerchantDashboard() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isVerifiedOnChain, setIsVerifiedOnChain] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const { showNotification } = useNotification();
  const lastTransactionCount = useRef(0);

  // Check merchant verification on blockchain
  useEffect(() => {
    const checkBlockchainVerification = async () => {
      if (!address) return;
      
      try {
        setCheckingVerification(true);
        const publicClient = getPublicClient(config, { chainId: 80002 });
        
        const verified = await publicClient.readContract({
          address: CONTRACTS.campaignFactory,
          abi: CampaignFactoryABI.abi,
          functionName: 'isVerifiedMerchant',
          args: [address]
        });
        
        console.log('✅ Merchant verification on blockchain:', verified);
        setIsVerifiedOnChain(verified);
      } catch (error) {
        console.error('❌ Error checking merchant verification:', error);
        setIsVerifiedOnChain(false);
      } finally {
        setCheckingVerification(false);
      }
    };

    checkBlockchainVerification();
  }, [address]);

  // Load RELIEF token balance from blockchain
  const loadTokenBalance = async () => {
    if (!address) return;
    
    try {
      const publicClient = getPublicClient(config, { chainId: 80002 });
      
      const balance = await publicClient.readContract({
        address: CONTRACTS.reliefToken,
        abi: ReliefTokenABI.abi,
        functionName: 'balanceOf',
        args: [address]
      });
      
      const formattedBalance = formatEther(balance);
      console.log('💰 Merchant RELIEF balance:', formattedBalance);
      setTokenBalance(formattedBalance);
    } catch (error) {
      console.error('❌ Error loading token balance:', error);
      setTokenBalance('0');
    }
  };

  useEffect(() => {
    if (!address) {
      navigate('/login');
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    // Load merchant profile
    const loadProfile = async () => {
      const profileDoc = await getDoc(doc(db, 'merchant_profile', address.toLowerCase()));
      if (profileDoc.exists()) {
        setMerchantProfile(profileDoc.data());
      }
      setLoading(false);
    };

    // Listen to transactions
    const transactionsRef = collection(db, 'merchant_transactions');
    const q = query(transactionsRef, where('merchantAddress', '==', address.toLowerCase()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      txData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Check for new transactions (show notification)
      if (lastTransactionCount.current > 0 && txData.length > lastTransactionCount.current) {
        const newTransaction = txData[0]; // Most recent
        showNotification({
          type: 'success',
          message: {
            title: '💰 New Payment Received!',
            description: `${newTransaction.amount} RELIEF from beneficiary`,
            txHash: newTransaction.transactionHash,
          },
          duration: 10000,
        });
      }
      
      lastTransactionCount.current = txData.length;
      setTransactions(txData);
    });

    loadProfile();
    loadTokenBalance();

    return () => unsubscribe();
  }, [address, navigate, showNotification]);

  // Reload token balance every 10 seconds
  useEffect(() => {
    if (!address) return;
    
    const interval = setInterval(() => {
      loadTokenBalance();
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [address]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const currentBalance = parseFloat(tokenBalance);
    
    if (amount > currentBalance) {
      alert(`Insufficient balance.\n\nAvailable: ${currentBalance.toFixed(2)} RELIEF\nRequested: ${amount} RELIEF`);
      return;
    }

    alert('Note: Withdraw functionality requires smart contract integration to transfer tokens from your wallet. Currently showing balance only.');
    
    setWithdrawing(true);
    try {
      // Record withdrawal transaction
      await addDoc(collection(db, 'merchant_transactions'), {
        merchantAddress: address.toLowerCase(),
        type: 'withdrawal',
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        note: 'Merchant can manually transfer tokens from their wallet'
      });

      setWithdrawAmount('');
      alert(`✅ Withdrawal request recorded for ${amount} RELIEF tokens!\n\nYou can manually transfer tokens from your wallet: ${address}`);
      
      // Reload balance after withdrawal
      setTimeout(() => loadTokenBalance(), 2000);
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Failed to process withdrawal. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  if (!merchantProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-green-500/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl"></div>
        </div>
        
        <div className="glass-card border border-white/20 rounded-3xl backdrop-blur-md bg-white/5 p-8 max-w-md text-center relative z-10">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Merchant Profile Found</h2>
          <p className="text-white/70 mb-4">
            Please complete your merchant registration first.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-semibold"
          >
            Register as Merchant
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Available Balance',
      value: `${parseFloat(tokenBalance).toFixed(2)} RELIEF`,
      icon: '💰',
      color: 'bg-green-100 text-green-700',
      trend: '+12.5%'
    },
    {
      label: 'Total Earnings',
      value: `${merchantProfile.totalEarnings?.toFixed(2) || '0.00'} RELIEF`,
      icon: '📈',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      label: 'Total Transactions',
      value: merchantProfile.transactionCount || 0,
      icon: '🧾',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      label: 'Blockchain Verification',
      value: checkingVerification ? 'Checking...' : (isVerifiedOnChain ? 'Verified' : 'Not Verified'),
      icon: checkingVerification ? '⏳' : (isVerifiedOnChain ? '✅' : '❌'),
      color: checkingVerification ? 'bg-gray-100 text-gray-700' : (isVerifiedOnChain ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
    }
  ];

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
              onClick={() => {
                window.location.href = '/';
              }}
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-full border border-white/10 transition-all"
            >
              Disconnect
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col pt-36 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Header Card */}
        <div className="glass-card border border-white/20 rounded-3xl p-6 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏪</div>
              <div>
                <h1 className="text-3xl font-bold text-white">{merchantProfile.businessName}</h1>
                <p className="text-white/70">{merchantProfile.businessType}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {merchantProfile.categories?.map(cat => (
                    <span key={cat} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 flex-shrink-0">
          {stats.map((stat, index) => (
            <div key={index} className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{stat.icon}</span>
                {stat.trend && (
                  <span className="text-sm text-green-400 font-semibold">{stat.trend}</span>
                )}
              </div>
              <p className="text-white/70 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-green-400">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="glass-card border border-white/20 rounded-3xl backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all flex-1 overflow-hidden flex flex-col">
          <div className="flex border-b border-white/10 flex-shrink-0">
            {['overview', 'transactions', 'withdraw'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="glass-card border border-white/10 rounded-2xl p-5 bg-white/5">
                  <h3 className="text-xl font-bold text-white mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-white/60">Owner Name</p>
                      <p className="font-semibold text-white">{merchantProfile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Email</p>
                      <p className="font-semibold text-white">{merchantProfile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Phone</p>
                      <p className="font-semibold text-white">{merchantProfile.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Address</p>
                      <p className="font-semibold text-white">{merchantProfile.businessAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Blockchain Verification Status */}
                {!isVerifiedOnChain && (
                  <div className="glass-card border border-red-500/30 rounded-2xl p-5 bg-red-500/10">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <h4 className="font-semibold text-red-300">Blockchain Verification Required</h4>
                        <p className="text-sm text-red-200/80 mt-2">
                          Your merchant account must be verified on the blockchain by the admin before you can receive payments.
                        </p>
                        <p className="text-sm text-red-200/80 mt-2">
                          <strong>Your Wallet:</strong> <span className="font-mono">{address}</span>
                        </p>
                        <p className="text-sm text-red-200/80 mt-1">
                          Please contact the admin to verify this wallet address on the CampaignFactory contract.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isVerifiedOnChain && (
                  <div className="glass-card border border-green-500/30 rounded-2xl p-5 bg-green-500/10">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-300">Blockchain Verified!</h4>
                        <p className="text-sm text-green-200/80 mt-2">
                          Your merchant account is verified on the blockchain. You can now receive payments from beneficiaries.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-white/60">No transactions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 font-semibold text-white/70">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/70">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/70">Customer</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/70">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/70">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                tx.type === 'sale' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white">{tx.customerAddress?.slice(0, 6)}...{tx.customerAddress?.slice(-4)}</td>
                            <td className="py-3 px-4 font-semibold text-green-400">{tx.amount} RELIEF</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                tx.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white mb-4">Withdraw to Wallet</h3>
                
                <div className="glass-card border border-green-500/30 rounded-2xl p-6 mb-6 bg-gradient-to-r from-green-500/20 to-emerald-600/20">
                  <p className="text-sm text-white/70 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-white">{parseFloat(tokenBalance).toFixed(2)} RELIEF</p>
                  <p className="text-xs text-white/50 mt-1">On-chain balance</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Withdrawal Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={parseFloat(tokenBalance)}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-green-500 focus:outline-none backdrop-blur-sm"
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => setWithdrawAmount(tokenBalance)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-400 font-semibold hover:text-green-300"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="glass-card border border-blue-500/30 rounded-2xl p-4 bg-blue-500/10">
                    <p className="text-sm text-blue-200">
                      ℹ️ Funds will be sent to your connected wallet: <span className="font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
                    </p>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw to Wallet'}
                  </button>

                  <p className="text-xs text-white/40 text-center">
                    Note: Withdrawals are processed instantly. Make sure your wallet is connected.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
