/**
 * Example Donation Page Component
 * 
 * This component demonstrates the complete USDC donation flow:
 * 1. Swap POL → USDC (if user doesn't have USDC)
 * 2. Buy RELIEF tokens with USDC
 * 3. Donate RELIEF to campaign (or use the complete flow)
 * 
 * Usage in your pages:
 * 
 * import DonationPageExample from '../components/DonationPageExample';
 * 
 * function CampaignDetails() {
 *   const provider = ... // Your ethers provider
 *   const campaignAddress = "0x...";
 *   
 *   return <DonationPageExample provider={provider} campaignAddress={campaignAddress} />;
 * }
 */

import { useState } from 'react';
import SwapModal from './SwapModal';
import BuyReliefModal from './BuyReliefModal';
import DonateWithUSDC from './DonateWithUSDC';
import WalletBalance from './WalletBalance';
import ExchangeRateDisplay from './ExchangeRateDisplay';

const DonationPageExample = ({ provider, campaignAddress, campaignTitle }) => {
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isBuyReliefModalOpen, setIsBuyReliefModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState(null);

  const handleSwapComplete = (result) => {
    setIsSwapModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
    showNotification('success', `Successfully swapped POL to ${result.usdcReceived} USDC!`);
  };

  const handlePurchaseComplete = (result) => {
    setIsBuyReliefModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
    showNotification('success', `Successfully purchased ${result.reliefAmount} RELIEF tokens!`);
  };

  const handleDonationComplete = (result) => {
    setRefreshTrigger(prev => prev + 1);
    showNotification('success', `Successfully donated ${result.reliefAmount} RELIEF to the campaign!`);
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support This Campaign</h1>
          <p className="text-gray-600">
            Use USDC stablecoin to make a difference. Don't have USDC? Swap your POL tokens!
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Wallet & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Wallet Balance */}
            <WalletBalance provider={provider} refreshTrigger={refreshTrigger} />
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              
              <button
                onClick={() => setIsSwapModalOpen(true)}
                className="w-full mb-3 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Swap POL → USDC
              </button>
              
              <button
                onClick={() => setIsBuyReliefModalOpen(true)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Buy RELIEF Tokens
              </button>
            </div>

            {/* Live Exchange Rates */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">Live Exchange Rates</h3>
              <ExchangeRateDisplay variant="both" autoUpdate={true} />
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Get POL from faucet</li>
                <li>• Swap POL to USDC</li>
                <li>• Buy RELIEF with USDC</li>
                <li>• Donate to campaigns</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Donation Form */}
          <div className="lg:col-span-2">
            <DonateWithUSDC
              provider={provider}
              campaignAddress={campaignAddress}
              campaignTitle={campaignTitle}
              onDonationComplete={handleDonationComplete}
            />

            {/* How It Works Section */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">How the Donation Process Works</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Get USDC (Optional)</h4>
                    <p className="text-sm text-gray-600">
                      If you don't have USDC, swap your POL tokens to USDC using our built-in DEX integration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Convert to RELIEF</h4>
                    <p className="text-sm text-gray-600">
                      Your USDC is automatically converted to RELIEF tokens at a 1:1 ratio. RELIEF is our donation token.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Donate to Campaign</h4>
                    <p className="text-sm text-gray-600">
                      RELIEF tokens are sent directly to the campaign. Beneficiaries can redeem them with approved merchants.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advantages Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="font-semibold">Price Stable</h4>
                </div>
                <p className="text-sm text-gray-600">
                  USDC is a stablecoin pegged to USD, protecting your donation from volatility.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h4 className="font-semibold">Fast & Secure</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Blockchain technology ensures transparent, instant, and secure donations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        provider={provider}
        onSwapComplete={handleSwapComplete}
      />

      <BuyReliefModal
        isOpen={isBuyReliefModalOpen}
        onClose={() => setIsBuyReliefModalOpen(false)}
        provider={provider}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
};

export default DonationPageExample;
