import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getUSDCBalance, getRELIEFBalance } from '../services/donationService';

const WalletBalance = ({ provider, refreshTrigger }) => {
  const [balances, setBalances] = useState({
    pol: '0',
    usdc: '0',
    relief: '0'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (provider) {
      fetchBalances();
    }
  }, [provider, refreshTrigger]);

  const fetchBalances = async () => {
    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Get POL balance
      const polBalance = await provider.getBalance(address);
      const pol = ethers.formatEther(polBalance);

      // Get USDC balance
      const usdc = await getUSDCBalance(provider, address);

      // Get RELIEF balance
      const relief = await getRELIEFBalance(provider, address);

      setBalances({
        pol: parseFloat(pol).toFixed(4),
        usdc: usdc.toFixed(2),
        relief: relief.toFixed(2)
      });
    } catch (err) {
      console.error('Error fetching balances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-sm text-gray-600">Loading balances...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Your Wallet</h3>
      
      <div className="space-y-3">
        {/* POL Balance */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
              P
            </div>
            <div>
              <p className="text-sm text-gray-600">POL (Native)</p>
              <p className="text-lg font-semibold">{balances.pol}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Gas Token</p>
        </div>

        {/* USDC Balance */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
              $
            </div>
            <div>
              <p className="text-sm text-gray-600">USDC</p>
              <p className="text-lg font-semibold">{balances.usdc}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Stablecoin</p>
        </div>

        {/* RELIEF Balance */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
              R
            </div>
            <div>
              <p className="text-sm text-gray-600">RELIEF</p>
              <p className="text-lg font-semibold">{balances.relief}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Donation Token</p>
        </div>
      </div>

      <button
        onClick={fetchBalances}
        className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
      >
        Refresh Balances
      </button>
    </div>
  );
};

export default WalletBalance;
