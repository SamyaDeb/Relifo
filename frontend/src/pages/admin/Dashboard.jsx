import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { USER_STATUS, ROLES } from '../../firebase/constants';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { getCampaignFactoryContract, parseContractError, CONTRACTS } from '../../services/polygonService';
import { getPublicClient } from '@wagmi/core';
import { config } from '../../config/wagmiConfig';
import CampaignFactoryABI from '../../contracts/CampaignFactory.json';
import deployment from '../../contracts/addresses.json';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    activeCampaigns: 0,
    totalDonations: 0,
    organizers: 0,
    beneficiaries: 0
  });
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!db) {
      // Demo mode
      setUsers([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'organizer', status: 'pending', organization: 'Red Cross' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'beneficiary', status: 'approved' }
      ]);
      setCampaigns([
        { id: '1', title: 'Relief Campaign', status: 'active', raised: 5000, goal: 10000 }
      ]);
      setStats({
        totalUsers: 2,
        pendingApprovals: 1,
        activeCampaigns: 1,
        totalDonations: 5000,
        organizers: 1,
        beneficiaries: 1
      });
      setLoading(false);
      return;
    }

    try {
      // Realtime listener for users
      const usersRef = collection(db, 'users');
      const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        const pending = usersData.filter(u => u.status === USER_STATUS.PENDING).length;
        const organizers = usersData.filter(u => u.role === ROLES.ORGANIZER && u.status === USER_STATUS.APPROVED).length;
        const beneficiaries = usersData.filter(u => u.role === ROLES.BENEFICIARY && u.status === USER_STATUS.APPROVED).length;

        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
          pendingApprovals: pending,
          organizers,
          beneficiaries
        }));
      });

      // Realtime listener for campaigns
      const campaignsRef = collection(db, 'campaigns');
      const unsubscribeCampaigns = onSnapshot(campaignsRef, (snapshot) => {
        const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(campaignsData);

        const active = campaignsData.filter(c => c.status === 'active').length;
        const totalRaised = campaignsData.reduce((sum, c) => sum + (c.raised || 0), 0);

        setStats(prev => ({
          ...prev,
          activeCampaigns: active,
          totalDonations: totalRaised
        }));
      });

      setLoading(false);

      return () => {
        unsubscribeUsers();
        unsubscribeCampaigns();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const scrollToSection = (sectionId) => {
    navigate('/', { state: { scrollTo: sectionId } });
  };

  const handleApproveUser = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      console.log('Approving user:', user);
      console.log('Admin wallet connected:', address);
      
      // If user is an organizer, check blockchain status FIRST before updating Firebase
      if (user?.role === ROLES.ORGANIZER && user?.walletAddress && walletClient) {
        try {
          console.log('Checking blockchain approval for organizer:', user.walletAddress);
          console.log('Using admin wallet:', address);
          
          const publicClient = getPublicClient(config, { chainId: 80002 });
          
          // First check if already approved on blockchain
          console.log('Checking if already approved on blockchain...');
          const isAlreadyApproved = await publicClient.readContract({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'isApprovedOrganizer',
            args: [user.walletAddress]
          });
          
          if (isAlreadyApproved) {
            console.log('✅ Organizer already approved on blockchain');
            
            // Update Firebase status to approved
            await updateDoc(doc(db, 'users', userId), {
              status: USER_STATUS.APPROVED
            });
            
            alert(`✅ User approved successfully!\n\n✓ This organizer is already approved on blockchain and can create campaigns:\n${user.walletAddress}`);
            return;
          }
          
          console.log('Organizer not yet approved on blockchain, will approve now...');
          
          // Try to estimate gas first to get better error messages
          console.log('Estimating gas for approval...');
          const campaignFactory = getCampaignFactoryContract(walletClient);
          const publicClient = getPublicClient(config, { chainId: 80002 });
          
          try {
            const gasEstimate = await publicClient.estimateContractGas({
              address: CONTRACTS.campaignFactory,
              abi: CampaignFactoryABI.abi,
              functionName: 'approveOrganizer',
              args: [user.walletAddress],
              account: address
            });
            console.log('Gas estimate:', gasEstimate);
          } catch (estimateError) {
            console.error('❌ Gas estimation failed!');
            console.error('Estimate error:', estimateError);
            if (estimateError.shortMessage) {
              console.error('Short message:', estimateError.shortMessage);
            }
            if (estimateError.details) {
              console.error('Details:', estimateError.details);
            }
            if (estimateError.cause) {
              console.error('Cause:', estimateError.cause);
            }
            throw new Error('Transaction would fail: ' + (estimateError.shortMessage || estimateError.message));
          }
          
          console.log('Sending approval transaction...');
          const tx = await campaignFactory.write.approveOrganizer(
            [user.walletAddress],
            {
              account: address,
            }
          );
          
          console.log('Approval transaction hash:', tx);
          console.log('Waiting for confirmation...');
          const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
          console.log('Organizer approved on blockchain!', receipt);
          
          // Update Firebase AFTER successful blockchain approval
          await updateDoc(doc(db, 'users', userId), {
            status: USER_STATUS.APPROVED
          });
          
          alert(`✅ User approved successfully!\n\nOrganizer approved on blockchain:\n${user.walletAddress}\n\nTx: ${tx.slice(0, 10)}...`);
        } catch (blockchainError) {
          console.error('Blockchain approval error:', blockchainError);
          console.error('Error details:', {
            message: blockchainError.message,
            shortMessage: blockchainError.shortMessage,
            details: blockchainError.details,
            metaMessages: blockchainError.metaMessages
          });
          
          const errorMsg = parseContractError(blockchainError);
          alert(`⚠️ Blockchain approval failed: ${errorMsg}\n\nPlease make sure:\n1. You're connected with the admin wallet (${deployment.deployer})\n2. You have enough POL for gas\n3. You're on Polygon Amoy network\n\nThe organizer was NOT approved.`);
          throw blockchainError; // Don't update Firebase if blockchain fails
        }
      } else {
        // For non-organizers, just update Firebase
        await updateDoc(doc(db, 'users', userId), {
          status: USER_STATUS.APPROVED
        });
        if (user?.role === ROLES.ORGANIZER && !user?.walletAddress) {
          console.warn('Organizer has no wallet address');
          alert('✅ User approved successfully!\n\n⚠️ Note: This organizer has no wallet address stored.');
        } else if (user?.role === ROLES.ORGANIZER && !walletClient) {
          console.warn('Admin wallet not connected');
          alert('✅ User approved successfully!\n\n⚠️ Note: Admin wallet not connected. Organizer not approved on blockchain.');
        } else {
          alert('User approved successfully!');
        }
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: USER_STATUS.REJECTED
      });
      alert('User rejected');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'paused'
      });
      alert('Campaign paused');
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const handleResumeCampaign = async (campaignId) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'active'
      });
      alert('Campaign resumed');
    } catch (error) {
      console.error('Error resuming campaign:', error);
      alert('Failed to resume campaign');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === USER_STATUS.PENDING);
  const approvedUsers = users.filter(u => u.status === USER_STATUS.APPROVED);

  return (
    <div className="min-h-screen h-screen bg-black relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Round Green Glowing Orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-green-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-12 right-12 w-80 h-80 bg-green-500/18 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-16 w-64 h-64 bg-emerald-500/12 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-52 w-80 h-80 bg-green-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
        
        {/* 100 Small Round Floating Dots */}
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-float"
            style={{
              width: '3px',
              height: '3px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.2 + 0.05,
              animationDuration: `${Math.random() * 8 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <div className="fixed top-[25px] left-0 right-0 z-50 py-4 pointer-events-none px-4">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between gap-[3px] relative pointer-events-auto">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl pointer-events-none"></div>
          
          {/* Logo */}
          <div className="flex items-center space-x-2 w-[150px] ml-[5px]">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Relifo</span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center space-x-5 -ml-[10px] relative z-10">
            <button onClick={() => navigate('/')} className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">Home</span>
            </button>
            <button onClick={() => scrollToSection('about')} className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">About</span>
            </button>
            <button className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer">
              <span className="hidden sm:block text-base text-white font-medium">Admin</span>
            </button>
          </div>

          {/* Disconnect Button */}
          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={handleDisconnect}
              className="group relative flex cursor-pointer items-center justify-center whitespace-nowrap border border-white/10 px-6 py-3 text-white bg-black rounded-[100px] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px w-[150px] overflow-visible"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
                <div className="absolute aspect-square bg-gradient-to-l from-[#10b981] to-transparent animate-border-orbit opacity-90" style={{width: '51px', offsetPath: 'rect(0px auto auto 0px round 40px)'}}></div>
              </div>
              <span className="relative z-20">Disconnect</span>
              <div className="pointer-events-none insert-0 absolute size-full rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"></div>
              <div className="pointer-events-none absolute -z-10 bg-black rounded-[100px] inset-[0.05em]"></div>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col pt-36 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Top Row - Platform Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
          {/* Total Users Card */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2">Platform Overview</h2>
            <div className="space-y-1">
              <p className="text-white/80 text-sm">Total Users: <span className="text-green-400 font-semibold">{stats.totalUsers}</span></p>
              <p className="text-white/80 text-sm">Organizers: <span className="text-green-400 font-semibold">{stats.organizers}</span></p>
              <p className="text-white/80 text-sm">Beneficiaries: <span className="text-green-400 font-semibold">{stats.beneficiaries}</span></p>
            </div>
          </div>

          {/* Campaigns Card */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2">Campaigns</h2>
            <div className="space-y-1">
              <p className="text-white/80 text-sm">Active: <span className="text-green-400 font-semibold">{stats.activeCampaigns}</span></p>
              <p className="text-white/80 text-sm">Total Raised: <span className="text-green-400 font-semibold">{stats.totalDonations.toFixed(1)} RELIEF</span></p>
            </div>
          </div>

          {/* Pending Approvals Card */}
          <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all h-[140px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-2">Pending Approvals</h2>
            <p className="text-4xl font-bold text-green-400 mt-2">{stats.pendingApprovals}</p>
            <p className="text-white/60 text-xs mt-1">Users awaiting approval</p>
          </div>
        </div>

        {/* Pending User Approvals */}
        <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0 overflow-hidden h-[200px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Pending User Approvals</h2>
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {pendingUsers.length === 0 ? (
              <p className="text-white/40 text-center py-8">No pending approvals</p>
            ) : (
              <div className="space-y-2">
                {pendingUsers.map(user => (
                  <div key={user.id} className="glass-card border border-white/10 rounded-2xl p-3 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm">{user.name || user.email}</h3>
                        <p className="text-white/60 text-xs">Role: {user.role}</p>
                        {user.organization && <p className="text-white/60 text-xs">Org: {user.organization}</p>}
                        {user.walletAddress && <p className="text-green-400 text-xs font-mono">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-1 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Campaigns Management */}
        <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all flex-shrink-0 overflow-hidden h-[200px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Campaign Management</h2>
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {campaigns.length === 0 ? (
              <p className="text-white/40 text-center py-8">No campaigns yet</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="glass-card border border-white/10 rounded-2xl p-3 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm">{campaign.title}</h3>
                        <p className="text-white/60 text-xs">
                          Status: <span className={`${campaign.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>{campaign.status}</span> | 
                          Raised: {campaign.raised?.toFixed(1) || 0} / {campaign.goal?.toFixed(1) || 0} RELIEF
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'active' ? (
                          <button
                            onClick={() => handlePauseCampaign(campaign.id)}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-3 py-1 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResumeCampaign(campaign.id)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(5px);
          }
          50% {
            transform: translateY(-40px) translateX(-5px);
          }
          75% {
            transform: translateY(-20px) translateX(5px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        @keyframes border-orbit {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        .animate-border-orbit {
          animation: border-orbit 3s linear infinite;
        }
        .glass-card {
          box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.15);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.7);
        }
      `}</style>
    </div>
  );
}
