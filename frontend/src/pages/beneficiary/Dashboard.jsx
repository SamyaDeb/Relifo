import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { freighterService } from '../../services/freighterService';

export default function BeneficiaryDashboard() {
  const [beneficiaryData, setBeneficiaryData] = useState(null);
  const [allocatedFunds, setAllocatedFunds] = useState(0);
  const [spentFunds, setSpentFunds] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBeneficiaryData();
  }, []);

  const loadBeneficiaryData = async () => {
    try {
      const publicKey = await freighterService.getPublicKey();

      if (!db) {
        // Demo mode
        setBeneficiaryData({
          name: 'Demo Beneficiary',
          campaign: 'Flood Relief - Kerala',
          status: 'active'
        });
        setAllocatedFunds(5000);
        setSpentFunds(2000);
        setTransactions([
          { id: '1', type: 'Food', amount: 800, date: '2025-12-20', merchant: 'Local Grocery Store' },
          { id: '2', type: 'Medicine', amount: 1200, date: '2025-12-21', merchant: 'Pharmacy' }
        ]);
        setLoading(false);
        return;
      }

      // Realtime listener for beneficiary data
      const beneficiaryRef = doc(db, 'beneficiaries', publicKey);
      const unsubscribe = onSnapshot(beneficiaryRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setBeneficiaryData(data);
          setAllocatedFunds(data.allocatedFunds || 0);
          setSpentFunds(data.spentFunds || 0);
          setTransactions(data.transactions || []);
        }
      });

      setLoading(false);

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading beneficiary data:', error);
      setLoading(false);
    }
  };

  const remainingFunds = allocatedFunds - spentFunds;
  const spentPercentage = allocatedFunds > 0 ? (spentFunds / allocatedFunds) * 100 : 0;

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
          <p className="text-purple-100">Track your relief funds and spending</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fund Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">💰</span>
              <span className="text-3xl font-bold text-gray-900">${allocatedFunds.toLocaleString()}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Total Allocated</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">📊</span>
              <span className="text-3xl font-bold text-red-600">${spentFunds.toLocaleString()}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Total Spent</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">💵</span>
              <span className="text-3xl font-bold text-green-600">${remainingFunds.toLocaleString()}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Remaining Balance</h3>
          </div>
        </div>

        {/* Spending Progress */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Overview</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Funds Utilized</span>
              <span className="font-semibold">{spentPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-600 h-4 rounded-full transition-all"
                style={{ width: `${Math.min(spentPercentage, 100)}%` }}
              />
            </div>
          </div>

          {beneficiaryData?.campaign && (
            <div className="bg-purple-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-purple-600 font-semibold mb-1">Linked Campaign</p>
              <p className="text-lg font-bold text-purple-900">{beneficiaryData.campaign}</p>
            </div>
          )}
        </div>

        {/* Allowed Categories */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Allowed Spending Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CategoryCard icon="🍞" title="Food & Groceries" status="allowed" />
            <CategoryCard icon="💊" title="Medicine & Healthcare" status="allowed" />
            <CategoryCard icon="🏠" title="Shelter & Housing" status="allowed" />
            <CategoryCard icon="👕" title="Clothing & Essentials" status="allowed" />
            <CategoryCard icon="🎮" title="Entertainment" status="restricted" />
            <CategoryCard icon="🍺" title="Alcohol & Tobacco" status="restricted" />
            <CategoryCard icon="🎰" title="Gambling" status="restricted" />
            <CategoryCard icon="💎" title="Luxury Items" status="restricted" />
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          </div>
          <div className="p-6">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📝</span>
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

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">How to Use Your Relief Funds</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use your Stellar wallet to make payments at approved merchants</li>
                <li>• Only essential items are allowed (food, medicine, shelter, clothing)</li>
                <li>• All transactions are recorded on the blockchain for transparency</li>
                <li>• Your remaining balance updates automatically after each purchase</li>
                <li>• Contact support if you need help or have questions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, status }) {
  const isAllowed = status === 'allowed';
  
  return (
    <div className={`border-2 rounded-lg p-4 ${
      isAllowed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
    }`}>
      <div className="text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <p className="text-sm font-semibold text-gray-900 mb-2">{title}</p>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isAllowed 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {isAllowed ? '✓ Allowed' : '✗ Restricted'}
        </span>
      </div>
    </div>
  );
}

function TransactionCard({ transaction }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{transaction.type}</h4>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
              Approved
            </span>
          </div>
          <p className="text-sm text-gray-600">{transaction.merchant}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(transaction.date || transaction.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-red-600">-${transaction.amount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Stellar TX</p>
        </div>
      </div>
    </div>
  );
}
