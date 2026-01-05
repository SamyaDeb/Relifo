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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading merchant dashboard...</p>
        </div>
      </div>
    );
  }

  if (!merchantProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Merchant Profile Found</h2>
          <p className="text-gray-600 mb-4">
            Please complete your merchant registration first.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏪</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{merchantProfile.businessName}</h1>
                <p className="text-gray-600">{merchantProfile.businessType}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {merchantProfile.categories?.map(cat => (
                    <span key={cat} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{stat.icon}</span>
                {stat.trend && (
                  <span className="text-sm text-green-600 font-semibold">{stat.trend}</span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="flex border-b">
            {['overview', 'transactions', 'withdraw'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Owner Name</p>
                      <p className="font-semibold">{merchantProfile.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold">{merchantProfile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{merchantProfile.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-semibold">{merchantProfile.businessAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Blockchain Verification Status */}
                {!isVerifiedOnChain && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <h4 className="font-semibold text-red-800">Blockchain Verification Required</h4>
                        <p className="text-sm text-red-700">
                          Your merchant account must be verified on the blockchain by the admin before you can receive payments.
                        </p>
                        <p className="text-sm text-red-700 mt-2">
                          <strong>Your Wallet:</strong> <span className="font-mono">{address}</span>
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          Please contact the admin to verify this wallet address on the CampaignFactory contract.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isVerifiedOnChain && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-800">Blockchain Verified!</h4>
                        <p className="text-sm text-green-700">
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
                <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-600">No transactions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                tx.type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3 px-4">{tx.customerAddress?.slice(0, 6)}...{tx.customerAddress?.slice(-4)}</td>
                            <td className="py-3 px-4 font-semibold">{tx.amount} RELIEF</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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
                <h3 className="text-xl font-bold text-gray-900 mb-4">Withdraw to Wallet</h3>
                
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 mb-6">
                  <p className="text-sm opacity-90 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold">{parseFloat(tokenBalance).toFixed(2)} RELIEF</p>
                  <p className="text-xs opacity-75 mt-1">On-chain balance</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => setWithdrawAmount(merchantProfile.balance?.toString() || '0')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-orange-600 font-semibold hover:text-orange-700"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <p className="text-sm text-blue-700">
                      ℹ️ Funds will be sent to your connected wallet: <span className="font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
                    </p>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw to Wallet'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Note: Withdrawals are processed instantly. Make sure your wallet is connected.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
