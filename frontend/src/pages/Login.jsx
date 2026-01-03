import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SUPER_ADMIN_ADDRESS, APP_NAME, USER_STATUS } from '../firebase/constants';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const navigate = useNavigate();

  useEffect(() => {
    // Only auto-check wallet connection if user clicked connect button
    if (isConnected && address && hasClickedConnect) {
      handleWalletConnected(address);
    }
  }, [isConnected, address, hasClickedConnect]);

  const handleWalletConnected = async (walletAddress) => {
    setLoading(true);
    setError('');

    try {
      // Check if Super Admin
      if (walletAddress.toLowerCase() === SUPER_ADMIN_ADDRESS.toLowerCase()) {
        navigate('/admin/dashboard');
        return;
      }

      // Check if Firebase is configured
      if (!db) {
        alert('Firebase not configured. Please check your .env file.');
        setLoading(false);
        return;
      }

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', walletAddress);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // New user - go to role selection
        navigate('/register');
        return;
      }

      // Existing user
      const userData = userSnap.data();

      // Update last login in background
      setDoc(userRef, {
        lastLoginAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Failed to update last login:', err));

      // Route based on status
      if (userData.status === USER_STATUS.PENDING) {
        navigate('/pending-approval', { state: { user: userData } });
      } else if (userData.status === USER_STATUS.REJECTED) {
        alert('Your application was rejected. Please contact support.');
        navigate('/register');
      } else if (userData.status === USER_STATUS.APPROVED) {
        navigate(`/${userData.role}/dashboard`);
      }

    } catch (error) {
      console.error('❌ Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setHasClickedConnect(true);
      setError('');
      
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask not found. Please install MetaMask extension from https://metamask.io');
        setHasClickedConnect(false);
        return;
      }
      
      // Directly request MetaMask to open - this will trigger the popup immediately
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error('MetaMask request error:', error);
        throw error;
      }
      
      // Then connect using wagmi
      const injectedConnector = connectors.find(
        (connector) => connector.id === 'injected'
      );
      
      if (injectedConnector) {
        await connect({ connector: injectedConnector });
      } else if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      }
    } catch (err) {
      console.error('Connection error:', err);
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the connection in MetaMask.');
      } else {
        setError(err.message || 'Failed to connect to MetaMask');
      }
      setHasClickedConnect(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {APP_NAME}
          </h1>
          <p className="text-gray-600">
            Transparent Disaster Relief Platform
          </p>
        </div>

        {/* Wallet Connection Status */}
        <div className="mb-6">
          {isConnected && address ? (
            <div className="flex items-center justify-center text-green-600 text-sm bg-green-50 py-2 px-4 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Wallet connected: {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          ) : (
            <div className="flex items-center justify-center text-orange-600 text-sm bg-orange-50 py-2 px-4 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              No wallet connected
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Connect Button */}
        <div className="w-full">
          {!isConnected ? (
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {loading ? 'Connecting...' : 'Connect MetaMask Wallet'}
            </button>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2">Wallet Connected</p>
              <p className="text-sm text-gray-500 font-mono bg-gray-100 px-4 py-2 rounded">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              {loading && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Verifying...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Network Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-4">
            🔒 Using Polygon <span className="font-semibold text-purple-600">Amoy Testnet</span>
          </p>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">Low</p>
              <p className="text-xs text-gray-600">Gas Fees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">Fast</p>
              <p className="text-xs text-gray-600">Confirmation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-600">100%</p>
              <p className="text-xs text-gray-600">Transparent</p>
            </div>
          </div>
        </div>

        {/* Why Polygon */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Why Polygon Blockchain?
          </h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Fast & scalable transactions
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Low transaction costs
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Smart contract support for transparency
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Ethereum-compatible & secure
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
