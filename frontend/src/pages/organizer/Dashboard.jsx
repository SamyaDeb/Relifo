import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { USER_STATUS } from '../../firebase/constants';
import { freighterService } from '../../services/freighterService';

export default function OrganizerDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [pendingBeneficiaries, setPendingBeneficiaries] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const publicKey = await freighterService.getPublicKey();
      setWalletAddress(publicKey);

      if (!db) {
        // Demo mode
        setCampaigns([
          { id: '1', title: 'Flood Relief - Kerala', goal: 50000, raised: 25000, status: 'active', beneficiaries: 150 }
        ]);
        setLoading(false);
        return;
      }

      // Realtime listener for organizer's campaigns
      const campaignsRef = collection(db, 'campaigns');
      const campaignsQuery = query(campaignsRef, where('organizerId', '==', publicKey));
      const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
        const campaignData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(campaignData);

        // Get campaign IDs for this organizer
        const campaignIds = campaignData.map(c => c.id);

        // Load pending beneficiaries for these campaigns
        if (campaignIds.length > 0) {
          const usersRef = collection(db, 'users');
          const beneficiariesQuery = query(
            usersRef, 
            where('role', '==', 'beneficiary'),
            where('status', '==', USER_STATUS.PENDING)
          );
          
          const unsubscribeBeneficiaries = onSnapshot(beneficiariesQuery, (benefSnapshot) => {
            const allPendingBeneficiaries = benefSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
            
            // Filter only beneficiaries for this organizer's campaigns
            const myPendingBeneficiaries = allPendingBeneficiaries.filter(b => 
              campaignIds.includes(b.campaignId)
            );
            
            setPendingBeneficiaries(myPendingBeneficiaries);
          });

          return () => {
            unsubscribeCampaigns();
            unsubscribeBeneficiaries();
          };
        }
      });

      setLoading(false);

      return () => unsubscribeCampaigns();
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleApproveBeneficiary = async (beneficiaryId) => {
    if (!db) {
      alert('Demo mode - Firebase not configured');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', beneficiaryId), {
        status: USER_STATUS.APPROVED,
        updatedAt: new Date().toISOString()
      });
      alert('Beneficiary approved successfully!');
    } catch (error) {
      console.error('Error approving beneficiary:', error);
      alert('Failed to approve beneficiary');
    }
  };

  const handleRejectBeneficiary = async (beneficiaryId) => {
    if (!db) {
      alert('Demo mode - Firebase not configured');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', beneficiaryId), {
        status: USER_STATUS.REJECTED,
        updatedAt: new Date().toISOString()
      });
      alert('Beneficiary application rejected');
    } catch (error) {
      console.error('Error rejecting beneficiary:', error);
      alert('Failed to reject beneficiary');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Organizer Dashboard</h1>
              <p className="text-blue-100">Create and manage relief campaigns</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 shadow-lg"
            >
              + Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatCard title="Total Campaigns" value={campaigns.length} icon="📋" />
          <StatCard title="Active" value={campaigns.filter(c => c.status === 'active').length} icon="✅" />
          <StatCard title="Total Raised" value={`$${campaigns.reduce((sum, c) => sum + (c.raised || 0), 0).toLocaleString()}`} icon="💰" />
          <StatCard title="Total Beneficiaries" value={campaigns.reduce((sum, c) => sum + (c.beneficiaries || 0), 0)} icon="👥" />
          <StatCard title="Pending Approvals" value={pendingBeneficiaries.length} icon="⏳" color="bg-yellow-500" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'campaigns'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => setActiveTab('beneficiaries')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'beneficiaries'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Beneficiaries ({pendingBeneficiaries.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'campaigns' && (
              <>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🚀</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-gray-600 mb-6">Create your first relief campaign to start helping people</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      Create Campaign
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {campaigns.map(campaign => (
                      <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'beneficiaries' && (
              <div className="space-y-4">
                {pendingBeneficiaries.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      All caught up!
                    </h3>
                    <p className="text-gray-600">No pending beneficiary applications at the moment</p>
                  </div>
                ) : (
                  pendingBeneficiaries.map(beneficiary => (
                    <BeneficiaryCard 
                      key={beneficiary.id} 
                      beneficiary={beneficiary}
                      campaign={campaigns.find(c => c.id === beneficiary.campaignId)}
                      onApprove={handleApproveBeneficiary}
                      onReject={handleRejectBeneficiary}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Campaigns - Legacy section kept for backward compatibility, can be removed */}
        {/* Old campaigns section removed as it's now in tabs */}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCampaigns();
          }}
          organizerId={walletAddress}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color = 'bg-indigo-500' }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className={`${color} text-white px-3 py-1 rounded text-sm font-bold`}>{value}</span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
}

function CampaignCard({ campaign }) {
  const progress = (campaign.raised / campaign.goal) * 100;

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{campaign.title}</h3>
          <p className="text-gray-600">{campaign.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {campaign.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-gray-900">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <p className="text-sm text-gray-500">Raised</p>
            <p className="text-lg font-bold text-gray-900">${(campaign.raised || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="text-lg font-bold text-gray-900">${campaign.goal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Beneficiaries</p>
            <p className="text-lg font-bold text-gray-900">{campaign.beneficiaries || 0}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <button className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold">
            Manage
          </button>
          <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-semibold">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignModal({ onClose, onSuccess, organizerId }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    disasterType: 'flood',
    location: '',
    expectedBeneficiaries: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (db) {
        await addDoc(collection(db, 'campaigns'), {
          ...formData,
          goal: parseFloat(formData.goal),
          expectedBeneficiaries: parseInt(formData.expectedBeneficiaries),
          organizerId: organizerId,
          raised: 0,
          beneficiaries: 0,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        alert('Campaign created successfully!');
        onSuccess();
      } else {
        alert('Demo mode - Firebase not configured');
        onClose();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="e.g., Flood Relief for Kerala"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              rows="4"
              placeholder="Describe the disaster and relief needs..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Funding Goal (USD) *</label>
              <input
                type="number"
                required
                min="100"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Disaster Type *</label>
              <select
                required
                value={formData.disasterType}
                onChange={(e) => setFormData({ ...formData, disasterType: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
                <option value="fire">Fire</option>
                <option value="hurricane">Hurricane</option>
                <option value="drought">Drought</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Beneficiaries *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.expectedBeneficiaries}
                onChange={(e) => setFormData({ ...formData, expectedBeneficiaries: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="100"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BeneficiaryCard({ beneficiary, campaign, onApprove, onReject }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">{beneficiary.name}</h3>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-purple-100 text-purple-700">
              🤝 BENEFICIARY
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            Applied for: <span className="font-semibold text-indigo-600">{campaign?.title || 'Unknown Campaign'}</span>
          </p>
        </div>
      </div>

      {/* Application Details */}
      <div className="bg-gray-50 rounded-lg p-5 mb-4">
        <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          Application Details
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Email Address</span>
            <p className="text-gray-900 font-medium">{beneficiary.email}</p>
          </div>

          {/* Organization */}
          {beneficiary.organization && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Organization</span>
              <p className="text-gray-900 font-medium">{beneficiary.organization}</p>
            </div>
          )}

          {/* Application Date */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Applied On</span>
            <p className="text-gray-900 font-medium">{formatDate(beneficiary.createdAt)}</p>
          </div>

          {/* Campaign */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Campaign Location</span>
            <p className="text-gray-900 font-medium">{campaign?.location || 'N/A'}</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 mt-4">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Stellar Wallet Address</span>
          <p className="text-gray-900 font-mono text-sm break-all">{beneficiary.id || beneficiary.walletAddress}</p>
        </div>

        {/* Description/Reason */}
        {beneficiary.description && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 mt-4">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">
              Why They Need Relief Funds
            </span>
            <p className="text-gray-900 leading-relaxed">{beneficiary.description}</p>
          </div>
        )}

        {/* Verification Document */}
        {beneficiary.documentUrl && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-lg p-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-700 uppercase block">Verification Document</span>
                  <p className="text-sm text-blue-900 font-medium">PDF Document Uploaded</p>
                </div>
              </div>
              <a
                href={beneficiary.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                VIEW DOCUMENT
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
        <button
          onClick={() => onApprove(beneficiary.id)}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          APPROVE FOR CAMPAIGN
        </button>
        <button
          onClick={() => onReject(beneficiary.id)}
          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          REJECT APPLICATION
        </button>
      </div>
    </div>
  );
}
