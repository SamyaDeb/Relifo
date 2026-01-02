import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { USER_STATUS, ROLES } from '../../firebase/constants';
import { freighterService } from '../../services/freighterService';

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    donors: 0,
    organizers: 0,
    beneficiaries: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!db) {
      // Demo mode
      setPendingUsers([
        { id: '1', name: 'John Doe', role: 'organizer', organization: 'Red Cross', status: 'pending' },
        { id: '2', name: 'Jane Smith', role: 'beneficiary', status: 'pending' }
      ]);
      setStats({ total: 2, pending: 2, approved: 0, donors: 0, organizers: 1, beneficiaries: 1 });
      setLoading(false);
      return;
    }

    try {
      // Realtime listener for all users
      const usersRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const pending = users.filter(u => u.status === USER_STATUS.PENDING);
        setPendingUsers(pending);
        setAllUsers(users);

        // Calculate stats in realtime
        setStats({
          total: users.length,
          pending: pending.length,
          approved: users.filter(u => u.status === USER_STATUS.APPROVED).length,
          donors: users.filter(u => u.role === ROLES.DONOR).length,
          organizers: users.filter(u => u.role === ROLES.ORGANIZER).length,
          beneficiaries: users.filter(u => u.role === ROLES.BENEFICIARY).length
        });
      });

      setLoading(false);

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!db) {
      alert('Demo mode - Firebase not configured');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: USER_STATUS.APPROVED,
        updatedAt: new Date().toISOString()
      });
      alert('User approved successfully!');
      loadUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    if (!db) {
      alert('Demo mode - Firebase not configured');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: USER_STATUS.REJECTED,
        updatedAt: new Date().toISOString()
      });
      alert('User rejected');
      loadUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">Super Admin Dashboard</h1>
          <p className="text-indigo-100">Manage users and oversee platform operations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <StatCard title="Total Users" value={stats.total} icon="👥" color="bg-blue-500" />
          <StatCard title="Pending" value={stats.pending} icon="⏳" color="bg-yellow-500" />
          <StatCard title="Approved" value={stats.approved} icon="✅" color="bg-green-500" />
          <StatCard title="Donors" value={stats.donors} icon="💝" color="bg-emerald-500" />
          <StatCard title="Organizers" value={stats.organizers} icon="🏢" color="bg-indigo-500" />
          <StatCard title="Beneficiaries" value={stats.beneficiaries} icon="🤝" color="bg-purple-500" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approvals ({pendingUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'all'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Users ({allUsers.length})
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      All caught up!
                    </h3>
                    <p className="text-gray-600">No pending approvals at the moment</p>
                  </div>
                ) : (
                  pendingUsers.map(user => (
                    <UserCard key={user.id} user={user} onApprove={handleApprove} onReject={handleReject} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'all' && (
              <div className="space-y-4">
                {allUsers.map(user => (
                  <UserCard key={user.id} user={user} showActions={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`${color} text-white px-2 py-1 rounded text-sm font-bold`}>
          {value}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
}

function UserCard({ user, onApprove, onReject, showActions = true }) {
  const getRoleBadge = (role) => {
    const badges = {
      [ROLES.DONOR]: { color: 'bg-green-100 text-green-700', icon: '💝' },
      [ROLES.ORGANIZER]: { color: 'bg-blue-100 text-blue-700', icon: '🏢' },
      [ROLES.BENEFICIARY]: { color: 'bg-purple-100 text-purple-700', icon: '🤝' }
    };
    return badges[role] || badges[ROLES.DONOR];
  };

  const getStatusBadge = (status) => {
    const badges = {
      [USER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-700',
      [USER_STATUS.APPROVED]: 'bg-green-100 text-green-700',
      [USER_STATUS.REJECTED]: 'bg-red-100 text-red-700'
    };
    return badges[status] || badges[USER_STATUS.PENDING];
  };

  const badge = getRoleBadge(user.role);
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
      {/* Header with Role and Status */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${badge.color}`}>
              {badge.icon} {user.role.toUpperCase()}
            </span>
          </div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(user.status)}`}>
            Status: {user.status.toUpperCase()}
          </span>
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
            <p className="text-gray-900 font-medium">{user.email}</p>
          </div>

          {/* Organization */}
          {user.organization && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Organization</span>
              <p className="text-gray-900 font-medium">{user.organization}</p>
            </div>
          )}

          {/* Application Date */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Applied On</span>
            <p className="text-gray-900 font-medium">{formatDate(user.createdAt)}</p>
          </div>

          {/* Last Updated */}
          {user.updatedAt && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Last Updated</span>
              <p className="text-gray-900 font-medium">{formatDate(user.updatedAt)}</p>
            </div>
          )}
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 mt-4">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Stellar Wallet Address</span>
          <p className="text-gray-900 font-mono text-sm break-all">{user.id || user.walletAddress}</p>
        </div>

        {/* Description/Reason */}
        {user.description && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 mt-4">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">
              Why They Need This Role
            </span>
            <p className="text-gray-900 leading-relaxed">{user.description}</p>
          </div>
        )}

        {/* Verification Document */}
        {user.documentUrl && (
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
                href={user.documentUrl}
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
      {showActions && user.status === USER_STATUS.PENDING && (
        <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
          <button
            onClick={() => onApprove(user.id)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            APPROVE APPLICATION
          </button>
          <button
            onClick={() => onReject(user.id)}
            className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            REJECT APPLICATION
          </button>
        </div>
      )}
    </div>
  );
}
