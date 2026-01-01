import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SUPER_ADMIN_ADDRESS, APP_NAME } from '../firebase/constants';
import { freighterService } from '../services/freighterService';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkFreighter();
  }, []);

  const checkFreighter = async () => {
    const installed = await freighterService.isInstalled();
    setFreighterInstalled(installed);
  };

  const connectWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if Freighter is installed
      if (!freighterInstalled) {
        setError('Please install Freighter wallet extension');
        window.open('https://www.freighter.app/', '_blank');
        setLoading(false);
        return;
      }

      // Request access permission
      const allowed = await freighterService.requestAccess();
      if (!allowed) {
        setError('Please allow access to Freighter wallet');
        setLoading(false);
        return;
      }

      // Get public key
      const publicKey = await freighterService.getPublicKey();
      console.log('✅ Connected wallet:', publicKey);

      // Store in localStorage
      localStorage.setItem('userAddress', publicKey);

      // Check if Super Admin
      if (publicKey === SUPER_ADMIN_ADDRESS) {
        localStorage.setItem('userRole', 'admin');
        console.log('🔐 Super Admin detected');
        alert('✅ Super Admin Login Successful!\n\nAddress: ' + publicKey.substring(0, 10) + '...');
        // navigate('/admin/dashboard'); // TODO: Create dashboard
        return;
      }

      // Check if Firebase is configured
      if (!db) {
        console.warn('⚠️ Firebase not configured');
        alert('⚠️ Firebase not configured yet.\n\nYour wallet is connected!\nAddress: ' + publicKey.substring(0, 10) + '...\n\nTo continue, set up Firebase credentials in .env file.');
        return;
      }

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', publicKey);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // New user - go to role selection
        console.log('👤 New user - redirecting to registration');
        // navigate('/register'); // TODO: Create register page
        alert('✅ New User Detected!\n\nAddress: ' + publicKey.substring(0, 10) + '...\n\nNext step: Create registration page');
        return;
      }

      // Existing user
      const userData = userSnap.data();
      localStorage.setItem('userRole', userData.role);

      // Update last login
      await setDoc(userRef, {
        lastLoginAt: new Date()
      }, { merge: true });

      console.log('✅ User logged in:', userData.role);

      // Route based on verification status
      if (userData.verificationStatus === 'pending') {
        navigate('/pending-approval');
      } else if (userData.verificationStatus === 'rejected') {
        navigate('/application-rejected');
      } else if (userData.verificationStatus === 'approved') {
        // Route to role dashboard
        switch (userData.role) {
          case 'organizer':
            navigate('/organizer/dashboard');
            break;
          case 'beneficiary':
            navigate('/beneficiary/dashboard');
            break;
          case 'donor':
            navigate('/donor/dashboard');
            break;
          default:
            navigate('/');
        }
      }

    } catch (error) {
      console.error('❌ Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
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

        {/* Freighter Status */}
        <div className="mb-6">
          {freighterInstalled ? (
            <div className="flex items-center justify-center text-green-600 text-sm bg-green-50 py-2 px-4 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Freighter wallet detected ✓
            </div>
          ) : (
            <div className="flex items-center justify-center text-orange-600 text-sm bg-orange-50 py-2 px-4 rounded-lg">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Freighter wallet not installed
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
        <button
          onClick={connectWallet}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Connect Freighter Wallet
            </>
          )}
        </button>

        {/* Install Freighter Link */}
        {!freighterInstalled && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Don't have Freighter wallet?
            </p>
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
            >
              Install Freighter Extension →
            </a>
          </div>
        )}

        {/* Network Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-4">
            🔒 Using Stellar <span className="font-semibold text-blue-600">Testnet</span>
          </p>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">$0.00001</p>
              <p className="text-xs text-gray-600">Transaction Fee</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">3s</p>
              <p className="text-xs text-gray-600">Confirmation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-600">100%</p>
              <p className="text-xs text-gray-600">Transparent</p>
            </div>
          </div>
        </div>

        {/* Why Stellar */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Why Stellar Blockchain?
          </h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Lightning-fast transactions (3-5 seconds)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Near-zero fees (perfect for disaster relief)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Built-in USDC stablecoin support
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Environmentally friendly (low energy)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
