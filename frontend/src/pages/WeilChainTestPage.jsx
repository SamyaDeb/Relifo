import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WeilChainBadge from '../components/WeilChainBadge';
import WeilChainAuditStats from '../components/WeilChainAuditStats';
import { 
  logTransactionToWeilChain, 
  verifyTransactionOnWeilChain, 
  getAuditStats,
  getAuditEntry,
  TRANSACTION_TYPES 
} from '../services/weilchainAuditService';

export default function WeilChainTestPage() {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testTxHash, setTestTxHash] = useState('');
  const [customTxHash, setCustomTxHash] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [stats, setStats] = useState(null);

  // Generate a mock transaction hash for testing
  const generateMockTxHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  };

  const addResult = (test, success, message, details = null) => {
    setTestResults(prev => [...prev, { 
      test, 
      success, 
      message, 
      details,
      timestamp: new Date().toISOString() 
    }]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Test 1: Get Stats (Read-only connection)
      addResult('Connection Test', null, 'Testing read-only connection...');
      try {
        const statsResult = await getAuditStats();
        setStats(statsResult);
        addResult('Connection Test', true, 'Successfully connected to WeilChain!', statsResult);
      } catch (error) {
        addResult('Connection Test', false, `Connection failed: ${error.message}`);
      }

      // Test 2: Log a test transaction
      const mockTxHash = generateMockTxHash();
      setTestTxHash(mockTxHash);
      addResult('Log Transaction', null, `Testing transaction logging with hash: ${mockTxHash.slice(0, 20)}...`);
      
      try {
        const logResult = await logTransactionToWeilChain(
          mockTxHash,
          'Donation',
          100.50,
          {
            campaignId: 'test-campaign-001',
            campaignTitle: 'WeilChain Integration Test',
            donorAddress: '0x1234567890abcdef1234567890abcdef12345678',
            testMode: true
          }
        );
        addResult('Log Transaction', true, 'Transaction logged successfully!', logResult);
      } catch (error) {
        addResult('Log Transaction', false, `Logging failed: ${error.message}`);
      }

      // Wait a moment for WeilChain to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 3: Verify the logged transaction
      addResult('Verify Transaction', null, 'Testing transaction verification...');
      try {
        const verifyResult = await verifyTransactionOnWeilChain(mockTxHash);
        addResult('Verify Transaction', verifyResult.exists, 
          verifyResult.exists ? 'Transaction verified on WeilChain!' : 'Transaction not yet confirmed',
          verifyResult
        );
      } catch (error) {
        addResult('Verify Transaction', false, `Verification failed: ${error.message}`);
      }

      // Test 4: Get audit entry details
      addResult('Get Entry Details', null, 'Fetching entry details...');
      try {
        const entryResult = await getAuditEntry(mockTxHash);
        if (entryResult) {
          addResult('Get Entry Details', true, 'Entry details retrieved!', entryResult);
        } else {
          addResult('Get Entry Details', false, 'Entry not found (may still be processing)');
        }
      } catch (error) {
        addResult('Get Entry Details', false, `Failed to get entry: ${error.message}`);
      }

      // Test 5: Log different transaction types
      const types = ['Allocation', 'BeneficiarySpending', 'MerchantPayment'];
      for (const txType of types) {
        const typeHash = generateMockTxHash();
        addResult(`Log ${txType}`, null, `Testing ${txType} logging...`);
        try {
          await logTransactionToWeilChain(typeHash, txType, Math.random() * 1000, {
            testMode: true,
            txType: txType
          });
          addResult(`Log ${txType}`, true, `${txType} logged successfully!`);
        } catch (error) {
          addResult(`Log ${txType}`, false, `${txType} logging failed: ${error.message}`);
        }
      }

      // Final stats after all tests
      addResult('Final Stats', null, 'Fetching updated statistics...');
      try {
        const finalStats = await getAuditStats();
        setStats(finalStats);
        addResult('Final Stats', true, 'Statistics updated!', finalStats);
      } catch (error) {
        addResult('Final Stats', false, `Stats failed: ${error.message}`);
      }

    } catch (error) {
      addResult('Test Suite', false, `Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const verifyCustomTransaction = async () => {
    if (!customTxHash) {
      alert('Please enter a transaction hash');
      return;
    }
    
    setVerifyResult(null);
    try {
      const result = await verifyTransactionOnWeilChain(customTxHash);
      setVerifyResult(result);
    } catch (error) {
      setVerifyResult({ error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-auto">
      {/* Animated Background Effects - Green Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-green-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-12 right-12 w-80 h-80 bg-green-500/18 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-16 w-64 h-64 bg-emerald-500/12 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-52 w-80 h-80 bg-green-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-white/70 hover:text-white transition"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">
                 WeilChain Integration Test
            </h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-6">
        {/* Audit Stats Component */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">📊 Live Audit Statistics</h2>
          <WeilChainAuditStats />
        </div>

        {/* Custom Transaction Verification */}
        <div className="glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5">
          <h2 className="text-xl font-bold text-white mb-4">🔍 Verify Custom Transaction</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={customTxHash}
              onChange={(e) => setCustomTxHash(e.target.value)}
              placeholder="Enter Polygon transaction hash (0x...)"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-green-500"
            />
            <button
              onClick={verifyCustomTransaction}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold transition"
            >
              Verify
            </button>
          </div>
          
          {verifyResult && (
            <div className={`mt-4 p-4 rounded-xl ${
              verifyResult.error 
                ? 'bg-red-500/20 border border-red-500/30' 
                : verifyResult.exists 
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-yellow-500/20 border border-yellow-500/30'
            }`}>
              {verifyResult.error ? (
                <p className="text-red-300">❌ Error: {verifyResult.error}</p>
              ) : verifyResult.exists ? (
                <div className="text-green-300">
                  <p className="font-bold">✅ Transaction Verified on WeilChain!</p>
                  <p className="text-sm mt-2">Entry ID: {verifyResult.entryId}</p>
                  <p className="text-sm">Type: {verifyResult.transactionType}</p>
                  <p className="text-sm">Amount: ${verifyResult.amount?.toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-yellow-300">⏳ Transaction not found on WeilChain</p>
              )}
            </div>
          )}
        </div>

        {/* Badge Preview */}
        {testTxHash && (
          <div className="glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5">
            <h2 className="text-xl font-bold text-white mb-4">🏷️ Badge Preview</h2>
            <div className="flex items-center gap-4">
              <span className="text-white/70">Test Transaction:</span>
              <WeilChainBadge polygonTxHash={testTxHash} size="lg" />
            </div>
            <p className="text-xs text-white/50 mt-2 font-mono">{testTxHash}</p>
          </div>
        )}

        {/* Test Results */}
        <div className="glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5">
          <h2 className="text-xl font-bold text-white mb-4">📋 Test Results</h2>
          
          {testResults.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <p className="text-5xl mb-4">🧪</p>
              <p>Click "Run All Tests" to test WeilChain integration</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    result.success === null
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : result.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.success === null ? '⏳' : result.success ? '✅' : '❌'}
                      </span>
                      <div>
                        <p className="font-bold text-white">{result.test}</p>
                        <p className={`text-sm ${
                          result.success === null ? 'text-blue-300' : result.success ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-white/50">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.details && (
                    <details className="mt-3">
                      <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-white/70 overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Info */}
        <div className="glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5">
          <h2 className="text-xl font-bold text-white mb-4">⚙️ Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-white/50">Sentinel URL</p>
              <p className="text-green-400 font-mono">https://sentinel.unweil.me</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-white/50">Contract Address</p>
              <p className="text-green-400 font-mono text-xs break-all">
                {import.meta.env.VITE_WEILCHAIN_AUDIT_CONTRACT || 'aaaaaasmrquobjshwok2uyfz7gcgg6dbuhvusublvgyrimskqkwws5udqu'}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-white/50">Network</p>
              <p className="text-green-400">WeilChain Testnet</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-white/50">Signer Status</p>
              <p className="text-green-400">
                {import.meta.env.VITE_WEILCHAIN_SIGNER_KEY ? '✓ Configured' : '⚠️ Using default'}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Types Reference */}
        <div className="glass-card border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5">
          <h2 className="text-xl font-bold text-white mb-4">📑 Supported Transaction Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
              <div key={key} className="glass-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30 text-center backdrop-blur-md">
                <p className="text-white font-bold">{value}</p>
                <p className="text-xs text-white/50 mt-1">{key}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .glass-card {
          box-shadow: 0 8px 32px 0 rgba(0, 255, 100, 0.1);
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
      `}</style>
    </div>
  );
}
