import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import polygonService from '../../services/polygonService';

export default function BeneficiaryDashboard() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [allocatedAmount, setAllocatedAmount] = useState('0');
  const [spentAmount, setSpentAmount] = useState('0');
  const [transactions, setTransactions] = useState([]);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      loadBeneficiaryData();
    }
  }, [address]);

  const loadBeneficiaryData = async () => {
    try {
      if (!address) return;

      // Query for allocations to this beneficiary
      const allocationsRef = collection(db, 'allocations');
      const allocationsQuery = query(allocationsRef, where('beneficiaryId', '==', address.toLowerCase()));
      
      onSnapshot(allocationsQuery, async (snapshot) => {
        const allocations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (allocations.length > 0) {
          const allocation = allocations[0]; // Get first allocation
          setWalletAddress(allocation.walletAddress);
          
          // Load wallet balance from blockchain
          if (allocation.walletAddress) {
            try {
              const reliefToken = await polygonService.getReliefTokenContract();
              
              // Get wallet balance
              const balance = await reliefToken.read.balanceOf([allocation.walletAddress]);
              setAllocatedAmount(formatEther(balance));
              
            } catch (error) {
              console.error('Error loading wallet balance:', error);
              setAllocatedAmount(allocation.amount.toString());
            }
          }
        }
      });

      // Load spending transactions
      const spendingRef = collection(db, 'spending');
      const spendingQuery = query(spendingRef, where('beneficiaryId', '==', address.toLowerCase()));
      
      onSnapshot(spendingQuery, (snapshot) => {
        const spendingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransactions(spendingData);
        
        const total = spendingData.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        setSpentAmount(total.toString());
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading beneficiary data:', error);
      setLoading(false);
    }
  };

  const remainingAmount = parseFloat(allocatedAmount) - parseFloat(spentAmount);
  const spentPercentage = parseFloat(allocatedAmount) > 0 
    ? (parseFloat(spentAmount) / parseFloat(allocatedAmount)) * 100 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">Beneficiary Dashboard</h1>
          <p className="text-purple-100">Manage your allocated relief funds</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!walletAddress ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">📭</span>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              No Funds Allocated Yet
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have any allocated funds at the moment.
            </p>
            <p className="text-sm text-gray-500">
              Once an organizer allocates funds to you, they will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Fund Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">💰</span>
                  <span className="text-3xl font-bold text-gray-900">
                    {parseFloat(allocatedAmount).toFixed(2)}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Total Allocated (RELIEF)</h3>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">📊</span>
                  <span className="text-3xl font-bold text-red-600">
                    {parseFloat(spentAmount).toFixed(2)}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Total Spent (RELIEF)</h3>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">💵</span>
                  <span className="text-3xl font-bold text-green-600">
                    {remainingAmount.toFixed(2)}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Available Balance (RELIEF)</h3>
              </div>
            </div>

            {/* Spending Progress */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Overview</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Funds Utilized</span>
                    <span className="font-semibold">{spentPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => setShowSpendModal(true)}
                    disabled={remainingAmount <= 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🛒 Spend Funds
                  </button>
                  <a
                    href={polygonService.getPolygonScanUrl(walletAddress, 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 text-center"
                  >
                    View Wallet on PolygonScan ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📍 Your BeneficiaryWallet Address</h3>
              <p className="text-xs font-mono text-blue-800 break-all">{walletAddress}</p>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              </div>
              <div className="p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📜</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No transactions yet
                    </h3>
                    <p className="text-gray-600">Your spending history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map(tx => (
                      <TransactionCard key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spend Modal */}
      {showSpendModal && walletAddress && (
        <SpendFundsModal
          walletAddress={walletAddress}
          availableBalance={remainingAmount}
          onClose={() => setShowSpendModal(false)}
        />
      )}
    </div>
  );
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
          {new Date(transaction.createdAt?.toDate?.() || transaction.date).toLocaleDateString()}
        </p>
        {transaction.txHash && (
          <a
            href={polygonService.getPolygonScanUrl(transaction.txHash)}
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

function SpendFundsModal({ walletAddress, availableBalance, onClose }) {
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
        alert('Insufficient balance');
        return;
      }

      setIsProcessing(true);
      setTxStatus('Preparing spending transaction...');

      const amountInWei = parseEther(amount);

      // Get BeneficiaryWallet contract
      const walletContract = await polygonService.getBeneficiaryWalletContract(walletAddress, walletClient);

      // Call spend function
      setTxStatus('Please confirm spending in MetaMask...');
      
      // Map category to Category enum (0 = Food, 1 = Medicine, etc.)
      const categoryIndex = categories.indexOf(category);
      
      const txHash = await walletContract.write.spend([
        merchantAddress,
        amountInWei,
        categoryIndex
      ]);

      setTxStatus('Waiting for transaction confirmation...');
      const receipt = await polygonService.waitForTransaction(txHash);

      // Update Firebase
      setTxStatus('Recording transaction...');
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
        createdAt: serverTimestamp()
      });

      alert(`Successfully spent ${amount} RELIEF tokens!\n\nMerchant: ${merchantName}\nCategory: ${category}\n\nTransaction: ${txHash}\n\nView on PolygonScan: ${polygonService.getPolygonScanUrl(txHash)}`);

      onClose();
    } catch (error) {
      console.error('Spending error:', error);
      const errorMsg = polygonService.parseContractError(error);
      alert(`Spending failed: ${errorMsg}`);
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
