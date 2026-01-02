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

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
              {badge.icon} {user.role}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(user.status)}`}>
              {user.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="text-gray-900">{user.email}</p>
            </div>
            {user.organization && (
              <div>
                <span className="text-gray-500">Organization:</span>
                <p className="text-gray-900">{user.organization}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-500">Wallet:</span>
              <p className="text-gray-900 font-mono text-xs">{user.id || user.walletAddress}</p>
            </div>
            {user.description && (
              <div className="col-span-2">
                <span className="text-gray-500">Description:</span>
                <p className="text-gray-900">{user.description}</p>
              </div>
            )}
          </div>
        </div>

        {showActions && user.status === USER_STATUS.PENDING && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onApprove(user.id)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onReject(user.id)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
