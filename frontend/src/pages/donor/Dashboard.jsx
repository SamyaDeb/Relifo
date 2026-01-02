import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { freighterService } from '../../services/freighterService';

export default function DonorDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ totalDonated: 0, campaignsSupported: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const publicKey = await freighterService.getPublicKey();

      if (!db) {
        // Demo mode
        setCampaigns([
          { id: '1', title: 'Flood Relief - Kerala', goal: 50000, raised: 25000, location: 'Kerala, India' },
          { id: '2', title: 'Earthquake Recovery - Nepal', goal: 100000, raised: 75000, location: 'Kathmandu, Nepal' }
        ]);
        setDonations([
          { id: '1', campaign: 'Flood Relief - Kerala', amount: 500, date: '2025-12-20' }
        ]);
        setStats({ totalDonated: 500, campaignsSupported: 1 });
        setLoading(false);
        return;
      }

      // Realtime listener for active campaigns
      const campaignsRef = collection(db, 'campaigns');
      const campaignsQuery = query(campaignsRef, where('status', '==', 'active'));
      const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
        const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(campaignsData);
      });

      // Realtime listener for user's donations
      const donationsRef = collection(db, 'donations');
      const donationsQuery = query(donationsRef, where('donorId', '==', publicKey));
      const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
        const donationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDonations(donationsData);

        // Calculate stats in realtime
        const totalDonated = donationsData.reduce((sum, d) => sum + d.amount, 0);
        const uniqueCampaigns = new Set(donationsData.map(d => d.campaignId));
        setStats({ totalDonated, campaignsSupported: uniqueCampaigns.size });
      });

      setLoading(false);

      // Cleanup listeners on unmount
      return () => {
        unsubscribeCampaigns();
        unsubscribeDonations();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">Donor Dashboard</h1>
          <p className="text-green-100">Support relief campaigns and make a difference</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Donated" value={`$${stats.totalDonated.toLocaleString()}`} icon="💰" color="bg-green-500" />
          <StatCard title="Campaigns Supported" value={stats.campaignsSupported} icon="🎯" color="bg-blue-500" />
          <StatCard title="Impact Score" value="⭐⭐⭐⭐⭐" icon="🌟" color="bg-yellow-500" />
        </div>

        {/* Available Campaigns */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Available Campaigns</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active campaigns at the moment
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {campaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Donations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">My Donation History</h2>
          </div>
          <div className="p-6">
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💝</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No donations yet
                </h3>
                <p className="text-gray-600">Start making a difference by donating to a campaign above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map(donation => (
                  <DonationCard key={donation.id} donation={donation} />
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
        <span className="text-3xl">{icon}</span>
        <span className={`${color} text-white px-3 py-1 rounded text-sm font-bold`}>
          {value}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
}

function CampaignCard({ campaign }) {
  const progress = (campaign.raised / campaign.goal) * 100;

  const handleDonate = () => {
    alert('Donation feature coming soon! Will integrate Stellar payment.');
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{campaign.title}</h3>
      <p className="text-gray-600 text-sm mb-4">📍 {campaign.location}</p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Raised</p>
          <p className="text-lg font-bold text-gray-900">${(campaign.raised || 0).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Goal</p>
          <p className="text-lg font-bold text-gray-900">${campaign.goal.toLocaleString()}</p>
        </div>
      </div>

      <button
        onClick={handleDonate}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
      >
        💝 Donate Now
      </button>
    </div>
  );
}

function DonationCard({ donation }) {
  return (
    <div className="border rounded-lg p-4 flex justify-between items-center">
      <div>
        <h4 className="font-semibold text-gray-900">{donation.campaign || 'Campaign'}</h4>
        <p className="text-sm text-gray-500">{new Date(donation.date || donation.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold text-green-600">${donation.amount.toLocaleString()}</p>
        <p className="text-xs text-gray-500">✓ Confirmed</p>
      </div>
    </div>
  );
}
