import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { freighterService } from '../services/freighterService';
import { USER_STATUS, ROLES } from '../firebase/constants';

export default function PendingApproval() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;

    const checkApprovalStatus = async () => {
      try {
        const publicKey = await freighterService.getPublicKey();
        
        if (db) {
          // Real-time listener for approval status
          unsubscribe = onSnapshot(doc(db, 'users', publicKey), async (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              setUserData(data);
              
              // Load campaign info if beneficiary
              if (data.role === ROLES.BENEFICIARY && data.campaignId) {
                const campaignDoc = await getDoc(doc(db, 'campaigns', data.campaignId));
                if (campaignDoc.exists()) {
                  setCampaign(campaignDoc.data());
                }
              }
              
              // If approved, redirect to dashboard
              if (data.status === USER_STATUS.APPROVED) {
                navigate(`/${data.role}/dashboard`);
              }
              // If rejected, redirect back to register
              else if (data.status === USER_STATUS.REJECTED) {
                alert('Your application was rejected. Please contact support or try again.');
                navigate('/register');
              }
            } else {
              // User doesn't exist, redirect to register
              navigate('/register');
            }
            setLoading(false);
          });
        } else {
          // Demo mode - just show the pending page
          setUserData({
            name: 'Demo User',
            role: 'organizer',
            status: USER_STATUS.PENDING
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking approval:', error);
        setLoading(false);
      }
    };

    checkApprovalStatus();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking approval status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Pending Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
              <span className="text-5xl">⏳</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Application Pending
            </h1>
            <p className="text-xl text-gray-600">
              We're reviewing your application
            </p>
          </div>

          {/* User Info */}
          {userData && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Application Details:
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-semibold text-gray-900">{userData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-semibold text-gray-900 capitalize">{userData.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                    Pending Review
                  </span>
                </div>
                {userData.organization && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Organization:</span>
                    <span className="font-semibold text-gray-900">{userData.organization}</span>
                  </div>
                )}
                {userData.role === ROLES.BENEFICIARY && campaign && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign:</span>
                    <span className="font-semibold text-gray-900">{campaign.title}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Information */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="border-l-4 border-indigo-500 pl-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  ✅ Step 1: Application Submitted
                </h4>
                <p className="text-gray-600 text-sm">
                  Your application has been received successfully
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-600 mb-2">
                  ⏳ Step 2: Under Review
                </h4>
                <p className="text-gray-600 text-sm">
                  {userData?.role === ROLES.BENEFICIARY 
                    ? 'The campaign organizer is reviewing your application'
                    : 'Our admin team is currently reviewing your application'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-400 mb-2">
                  ⭐ Step 3: Approval
                </h4>
                <p className="text-gray-400 text-sm">
                  You'll be automatically redirected once approved
                </p>
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {userData?.role === ROLES.BENEFICIARY 
                      ? 'The campaign organizer will review your application within 24-48 hours'
                      : 'Our admin team will review your application within 24-48 hours'}</li>
                    <li>• You'll receive an email notification about the decision</li>
                    <li>• This page will automatically update when approved</li>
                    <li>• You can close this page and come back anytime</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Need Help */}
            <div className="text-center pt-6 border-t">
              <p className="text-gray-600 mb-4">
                Questions about your application?
              </p>
              <button className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Contact Support →
              </button>
            </div>
          </div>

          {/* Auto-refresh indicator */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Checking for updates...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
