/**
 * Quick Demo: WeilChain Components
 * 
 * This demonstrates how to use the WeilChain audit trail components
 * in your React application.
 */

import React from 'react';
import WeilChainBadge from './components/WeilChainBadge';
import WeilChainAuditStats from './components/WeilChainAuditStats';

/**
 * Example Dashboard with WeilChain Integration
 */
const DemoPage = () => {
  // Example donation data
  const donations = [
    {
      id: 1,
      donor: 'Alice Johnson',
      amount: '1.5 MATIC',
      campaign: 'Food Relief',
      txHash: '0xtest19bcf22208f459824d983ff6', // From our test
      timestamp: '2026-01-18T03:15:00Z'
    },
    {
      id: 2,
      donor: 'Bob Smith',
      amount: '2.0 MATIC',
      campaign: 'Medical Aid',
      txHash: '0x' + '1'.repeat(64), // Example hash
      timestamp: '2026-01-18T02:30:00Z'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Donor Dashboard
          </h1>
          <p className="text-gray-600">
            All transactions verified on WeilChain for transparency
          </p>
        </div>

        {/* Audit Statistics Component */}
        <WeilChainAuditStats />

        {/* Donations List with Badges */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Donations
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {donations.map(donation => (
              <div key={donation.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {donation.donor}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {new Date(donation.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        Campaign: <span className="font-medium">{donation.campaign}</span>
                      </span>
                      <span className="text-gray-600">
                        Amount: <span className="font-medium text-green-600">{donation.amount}</span>
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Transaction Hash:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {donation.txHash.slice(0, 20)}...
                      </code>
                    </div>
                  </div>
                  
                  {/* WeilChain Badge - Shows verification status */}
                  <div className="ml-4">
                    <WeilChainBadge 
                      polygonTxHash={donation.txHash}
                      showDetails={true}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Cross-Chain Verification
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                Every transaction is logged to WeilChain's immutable blockchain for permanent verification. 
                The green badge indicates your transaction has been successfully verified on WeilChain, 
                providing an additional layer of transparency and trust.
              </p>
            </div>
          </div>
        </div>

        {/* Badge Showcase */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Badge States Demo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Different badge sizes */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Extra Small</p>
              <WeilChainBadge 
                polygonTxHash="0xtest19bcf22208f459824d983ff6"
                size="xs"
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Small</p>
              <WeilChainBadge 
                polygonTxHash="0xtest19bcf22208f459824d983ff6"
                size="sm"
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Medium</p>
              <WeilChainBadge 
                polygonTxHash="0xtest19bcf22208f459824d983ff6"
                size="md"
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Large</p>
              <WeilChainBadge 
                polygonTxHash="0xtest19bcf22208f459824d983ff6"
                size="lg"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DemoPage;
