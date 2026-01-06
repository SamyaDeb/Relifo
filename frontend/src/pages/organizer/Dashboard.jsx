import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { USER_STATUS } from '../../firebase/constants';
import { useAccount, useWalletClient, usePublicClient, useDisconnect } from 'wagmi';
import { parseEther, encodeFunctionData, formatEther } from 'viem';
import { getCampaignFactoryContract, parseContractError, getPolygonScanUrl, CONTRACTS } from '../../services/polygonService';
import { getPublicClient, getWalletClient } from '@wagmi/core';
import { config, customPolygonAmoy } from '../../config/wagmiConfig';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import AllocateFundsModal from '../../components/AllocateFundsModal';
import CampaignFactoryABI from '../../contracts/CampaignFactory.json';
import CampaignABI from '../../contracts/Campaign.json';

export default function OrganizerDashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [pendingBeneficiaries, setPendingBeneficiaries] = useState([]);
  const [approvedBeneficiaries, setApprovedBeneficiaries] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [processingBeneficiary, setProcessingBeneficiary] = useState(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

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
    const campaignsQuery = query(campaignsRef, where('organizerId', '==', address));
    
    const unsubscribeCampaigns = onSnapshot(campaignsQuery, async (snapshot) => {
      const campaignData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📋 Campaigns loaded:', campaignData);
      setCampaigns(campaignData);
      
      // Load pending beneficiaries from Firebase for all campaigns
      if (campaignData.length > 0) {
        await loadPendingBeneficiariesFromFirebase(campaignData);
      } else {
        setPendingBeneficiaries([]);
      }
      
      // Load approved beneficiaries from blockchain for campaigns with blockchainAddress
      const campaignsWithBlockchain = campaignData.filter(c => c.blockchainAddress);
      if (campaignsWithBlockchain.length > 0) {
        await loadApprovedBeneficiariesFromBlockchain(campaignsWithBlockchain);
      } else {
        setApprovedBeneficiaries([]);
      }
    });

    setLoading(false);

    // Cleanup
    return () => {
      unsubscribeCampaigns();
    };
  }, [address]);

  // Load PENDING beneficiaries from Firebase (not yet approved on-chain)
  const loadPendingBeneficiariesFromFirebase = async (campaignsList) => {
    try {
      console.log('📋 Loading pending beneficiaries from Firebase...');
      const pending = [];
      
      for (const campaign of campaignsList) {
        // Query users collection for beneficiaries with this campaign
        const usersRef = collection(db, 'users');
        const beneficiariesQuery = query(
          usersRef, 
          where('role', '==', 'beneficiary'),
          where('campaignId', '==', campaign.id),
          where('status', '==', 'pending')
        );
        
        const snapshot = await getDocs(beneficiariesQuery);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          pending.push({
            id: doc.id,
            walletAddress: data.walletAddress,
            name: data.name || 'Unknown',
            organization: data.organization || 'N/A',
            description: data.description || '',
            documentUrl: data.documentUrl,
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            campaignBlockchainAddress: campaign.blockchainAddress,
            status: data.status,
            createdAt: data.createdAt,
          });
        });
      }
      
      console.log('⏳ Pending beneficiaries (Firebase):', pending.length);
      setPendingBeneficiaries(pending);
    } catch (error) {
      console.error('Error loading pending beneficiaries:', error);
    }
  };

  // Load APPROVED beneficiaries (from Firebase with on-chain verification)
  const loadApprovedBeneficiariesFromBlockchain = async (campaignsWithBlockchain) => {
    console.log('🔍 Loading approved beneficiaries from Firebase and blockchain...');
    
    const publicClient = getPublicClient(config);
    const approved = [];
    const processedAddresses = new Set();

    for (const campaign of campaignsWithBlockchain) {
      try {
        // Get all users with status='approved' for this campaign from Firebase
        const usersRef = collection(db, 'users');
        const approvedQuery = query(
          usersRef,
          where('role', '==', 'beneficiary'),
          where('campaignId', '==', campaign.id),
          where('status', '==', 'approved')
        );
        
        const snapshot = await getDocs(approvedQuery);
        console.log(`📋 Campaign ${campaign.title}: ${snapshot.docs.length} approved beneficiaries in Firebase`);

        // For each approved beneficiary in Firebase, check on-chain status
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          const beneficiaryAddress = userData.walletAddress;

          if (!beneficiaryAddress || processedAddresses.has(beneficiaryAddress.toLowerCase())) {
            continue;
          }
          
          processedAddresses.add(beneficiaryAddress.toLowerCase());

          // Verify on-chain approval - THIS IS CRITICAL
          let isApprovedOnChain = false;
          try {
            isApprovedOnChain = await publicClient.readContract({
              address: campaign.blockchainAddress,
              abi: CampaignABI.abi,
              functionName: 'isBeneficiaryApproved',
              args: [beneficiaryAddress],
            });
            console.log(`🔍 Beneficiary ${userData.name} (${beneficiaryAddress}): On-chain approved = ${isApprovedOnChain}`);
          } catch (e) {
            console.warn('❌ Could not check on-chain approval:', e.message);
          }

          // ONLY add beneficiaries that are actually approved on-chain
          if (!isApprovedOnChain) {
            console.warn(`⚠️ Skipping ${userData.name} - approved in Firebase but NOT on-chain`);
            continue;
          }

          // Check if they have a wallet (funds allocated)
          let wallet = null;
          let allocation = BigInt(0);
          let hasWallet = false;

          try {
            wallet = await publicClient.readContract({
              address: campaign.blockchainAddress,
              abi: CampaignABI.abi,
              functionName: 'getBeneficiaryWallet',
              args: [beneficiaryAddress],
            });
            
            if (wallet && wallet !== '0x0000000000000000000000000000000000000000') {
              hasWallet = true;
              allocation = await publicClient.readContract({
                address: campaign.blockchainAddress,
                abi: CampaignABI.abi,
                functionName: 'beneficiaryAllocations',
                args: [beneficiaryAddress],
              });
            }
          } catch (e) {
            console.log('No wallet for beneficiary:', beneficiaryAddress);
          }

          approved.push({
            id: userDoc.id,
            walletAddress: beneficiaryAddress,
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            campaignBlockchainAddress: campaign.blockchainAddress,
            name: userData.name || beneficiaryAddress.slice(0, 10) + '...',
            organization: userData.organization || 'N/A',
            description: userData.description || '',
            walletContract: wallet,
            hasWallet: hasWallet,
            allocatedAmount: hasWallet ? formatEther(allocation) : '0',
            isApprovedOnChain: true, // Always true because we filtered above
          });
        }
      } catch (error) {
        console.warn(`Error loading beneficiaries for ${campaign.title}:`, error.message);
      }
    }

    console.log(`✅ Total approved beneficiaries (on-chain): ${approved.length}`);
    setApprovedBeneficiaries(approved);
  };

  // Approve beneficiary - ON-CHAIN transaction + Firebase update
  const handleApproveBeneficiary = async (beneficiary) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!beneficiary.campaignBlockchainAddress) {
      alert('This campaign does not have a blockchain address. Please wait for the campaign to be deployed on-chain.');
      return;
    }

    setProcessingBeneficiary(beneficiary.id);

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ APPROVING BENEFICIARY ON-CHAIN');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Beneficiary wallet:', beneficiary.walletAddress);
      console.log('Beneficiary name:', beneficiary.name);
      console.log('Campaign address:', beneficiary.campaignBlockchainAddress);
      console.log('Organizer address:', address);
      
      // Get wallet client dynamically
      const walletClient = await getWalletClient(config);
      if (!walletClient) {
        throw new Error('Failed to get wallet client. Please make sure your wallet is connected.');
      }
      
      console.log('📝 Calling approveBeneficiary on contract...');
      
      // Call approveBeneficiary on the Campaign contract
      const hash = await walletClient.writeContract({
        address: beneficiary.campaignBlockchainAddress,
        abi: CampaignABI.abi,
        functionName: 'approveBeneficiary',
        args: [beneficiary.walletAddress],
      });

      console.log('📤 Transaction hash:', hash);
      alert(`🔄 Approval transaction submitted!\n\nTx Hash: ${hash}\n\nWaiting for confirmation...`);

      // Wait for transaction confirmation
      const publicClient = getPublicClient(config);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ Transaction confirmed:', receipt);
      console.log('   Status:', receipt.status === 'success' ? 'SUCCESS' : 'FAILED');
      console.log('   Block:', receipt.blockNumber);

      // Verify the approval worked
      const isApproved = await publicClient.readContract({
        address: beneficiary.campaignBlockchainAddress,
        abi: CampaignABI.abi,
        functionName: 'isBeneficiaryApproved',
        args: [beneficiary.walletAddress],
      });
      console.log('🔍 Verification - isBeneficiaryApproved:', isApproved);

      if (!isApproved) {
        throw new Error('Transaction succeeded but beneficiary is still not approved on-chain. Please check the contract.');
      }

      // Update status in Firebase after successful on-chain approval
      await updateDoc(doc(db, 'users', beneficiary.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: address,
        approvalTxHash: hash
      });
      console.log('💾 Firebase updated with approval status');

      alert(`✅ Beneficiary approved on-chain!\n\nTransaction: ${hash}\n\nYou can now allocate funds to ${beneficiary.name}.`);

      // Reload beneficiaries
      await loadPendingBeneficiariesFromFirebase(campaigns);
      
      // Reload approved beneficiaries to show in Approved tab
      const campaignsWithBlockchain = campaigns.filter(c => c.blockchainAddress);
      if (campaignsWithBlockchain.length > 0) {
        await loadApprovedBeneficiariesFromBlockchain(campaignsWithBlockchain);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ APPROVAL ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const errorMessage = parseContractError(error);
      alert('Failed to approve beneficiary: ' + errorMessage);
    } finally {
      setProcessingBeneficiary(null);
    }
  };

  // Reject beneficiary - ON-CHAIN transaction + Firebase update
  const handleRejectBeneficiary = async (beneficiary) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    setProcessingBeneficiary(beneficiary.id);

    try {
      console.log('❌ Rejecting beneficiary:', beneficiary.walletAddress);

      // If campaign has blockchain address, reject on-chain too
      if (beneficiary.campaignBlockchainAddress) {
        // Get wallet client dynamically
        const walletClient = await getWalletClient(config);
        if (!walletClient) {
          throw new Error('Failed to get wallet client. Please make sure your wallet is connected.');
        }

        const hash = await walletClient.writeContract({
          address: beneficiary.campaignBlockchainAddress,
          abi: CampaignABI.abi,
          functionName: 'rejectBeneficiary',
          args: [beneficiary.walletAddress],
        });

        console.log('Rejection transaction hash:', hash);
        
        const publicClient = getPublicClient(config);
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      // Update status in Firebase
      await updateDoc(doc(db, 'users', beneficiary.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: address
      });

      alert('Beneficiary rejected.');

      // Reload pending beneficiaries
      await loadPendingBeneficiariesFromFirebase(campaigns);

    } catch (error) {
      console.error('Error rejecting beneficiary:', error);
      const errorMessage = parseContractError(error);
      alert('Failed to reject beneficiary: ' + errorMessage);
    } finally {
      setProcessingBeneficiary(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-400"></div>
      </div>
    );
  }

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Green Glowing Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-green-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[60%] right-[10%] w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[15%] left-[15%] w-[450px] h-[450px] bg-green-500/10 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] right-[25%] w-[400px] h-[400px] bg-emerald-400/15 rounded-full blur-[110px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-[40%] left-[40%] w-[550px] h-[550px] bg-green-300/10 rounded-full blur-[95px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-[5%] right-[5%] w-[350px] h-[350px] bg-emerald-500/20 rounded-full blur-[85px] animate-pulse" style={{ animationDelay: '2.5s' }}></div>
      </div>

      {/* Floating Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/30"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <div className="fixed top-[20px] left-0 right-0 z-50 py-4 pointer-events-none px-4">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between relative pointer-events-auto">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl"></div>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Relifo</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              About
            </button>
            <button
              className="text-white hover:text-white/80 transition cursor-pointer text-base font-medium"
            >
              Dashboard
            </button>
          </div>

          {/* Disconnect Button */}
          <div className="flex items-center">
            <button
              onClick={handleDisconnect}
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-full border border-white/10 transition-all"
            >
              Disconnect
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col pt-36 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Header Card */}
        <div className="glass-card border border-white/20 rounded-3xl p-6 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎯</div>
              <div>
                <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
                <p className="text-white/70">Create and manage relief campaigns</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              + Create Campaign
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 flex-shrink-0">
          <div className="glass-card border border-white/20 rounded-2xl p-4 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-2xl font-bold text-white">{campaigns.length}</div>
            <div className="text-white/70 text-sm">Total Campaigns</div>
          </div>
          <div className="glass-card border border-white/20 rounded-2xl p-4 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-white">{campaigns.filter(c => c.status === 'active').length}</div>
            <div className="text-white/70 text-sm">Active</div>
          </div>
          <div className="glass-card border border-white/20 rounded-2xl p-4 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-white">${campaigns.reduce((sum, c) => sum + (c.raised || 0), 0).toLocaleString()}</div>
            <div className="text-white/70 text-sm">Total Raised</div>
          </div>
          <div className="glass-card border border-white/20 rounded-2xl p-4 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-white">{approvedBeneficiaries.length}</div>
            <div className="text-white/70 text-sm">Total Beneficiaries</div>
          </div>
          <div className="glass-card border border-yellow-500/30 rounded-2xl p-4 backdrop-blur-md bg-yellow-500/10 hover:bg-yellow-500/20 transition-all">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-2xl font-bold text-yellow-300">{pendingBeneficiaries.length}</div>
            <div className="text-yellow-200/70 text-sm">Pending Approvals</div>
          </div>
          <div className="glass-card border border-green-500/30 rounded-2xl p-4 backdrop-blur-md bg-green-500/10 hover:bg-green-500/20 transition-all">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-300">{approvedBeneficiaries.length}</div>
            <div className="text-green-200/70 text-sm">Approved</div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="glass-card border border-white/20 rounded-3xl backdrop-blur-md bg-white/5 flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-white/20 px-6 flex-shrink-0">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'campaigns'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/30'
                }`}
              >
                My Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/30'
                }`}
              >
                Pending Beneficiaries ({pendingBeneficiaries.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'approved'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/30'
                }`}
              >
                Approved Beneficiaries ({approvedBeneficiaries.length})
              </button>
            </nav>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {activeTab === 'campaigns' && (
              <>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🚀</span>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-white/70 mb-6">Create your first relief campaign to start helping people</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-semibold hover:from-green-600 hover:to-emerald-600"
                    >
                      Create Campaign
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {campaigns.map(campaign => (
                      <CampaignCard 
                        key={campaign.id} 
                        campaign={campaign}
                        approvedBeneficiaries={approvedBeneficiaries.filter(b => b.campaignId === campaign.id)}
                        onAllocateFunds={(camp) => {
                          setSelectedCampaign(camp);
                          setShowAllocateModal(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-4">
                {pendingBeneficiaries.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      All caught up!
                    </h3>
                    <p className="text-white/70">No pending beneficiary applications at the moment</p>
                  </div>
                ) : (
                  pendingBeneficiaries.map(beneficiary => (
                    <BeneficiaryCard 
                      key={beneficiary.id} 
                      beneficiary={beneficiary}
                      campaign={campaigns.find(c => c.id === beneficiary.campaignId)}
                      onApprove={handleApproveBeneficiary}
                      onReject={handleRejectBeneficiary}
                      showActions={true}
                      isProcessing={processingBeneficiary === beneficiary.id}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'approved' && (
              <div className="space-y-4">
                {approvedBeneficiaries.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📋</span>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No approved beneficiaries yet
                    </h3>
                    <p className="text-white/70">Approved beneficiaries will appear here</p>
                  </div>
                ) : (
                  approvedBeneficiaries.map(beneficiary => (
                    <ApprovedBeneficiaryCard 
                      key={beneficiary.id} 
                      beneficiary={beneficiary}
                      campaign={campaigns.find(c => c.id === beneficiary.campaignId)}
                      onAllocateFunds={() => {
                        setSelectedCampaign(campaigns.find(c => c.id === beneficiary.campaignId));
                        setShowAllocateModal(true);
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.5);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.7);
        }

        .glass-card {
          box-shadow: 0 8px 32px 0 rgba(0, 255, 100, 0.1);
        }
      `}</style>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // No need to reload - real-time listener will update automatically
          }}
          organizerId={address}
        />
      )}

      {/* Allocate Funds Modal */}
      {showAllocateModal && selectedCampaign && (
        <AllocateFundsModal
          campaign={selectedCampaign}
          beneficiaries={approvedBeneficiaries.filter(b => b.campaignId === selectedCampaign.id && !b.hasWallet)}
          onClose={async () => {
            setShowAllocateModal(false);
            setSelectedCampaign(null);
            
            // Reload approved beneficiaries after allocation
            const campaignsWithBlockchain = campaigns.filter(c => c.blockchainAddress);
            if (campaignsWithBlockchain.length > 0) {
              await loadApprovedBeneficiariesFromBlockchain(campaignsWithBlockchain);
            }
          }}
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

function CampaignCard({ campaign, approvedBeneficiaries = [], onAllocateFunds }) {
  const progress = (campaign.raised / campaign.goal) * 100;

  return (
    <div className="border border-white/20 rounded-2xl p-6 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-white">{campaign.title}</h3>
          </div>
          <p className="text-white/70">{campaign.description}</p>
          {campaign.blockchainAddress && (
            <p className="text-xs text-green-400 mt-2 font-mono">
              📍 {campaign.blockchainAddress.slice(0, 10)}...{campaign.blockchainAddress.slice(-8)}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          campaign.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/10 text-white/70 border border-white/20'
        }`}>
          {campaign.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70">Progress</span>
            <span className="font-semibold text-white">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 border border-white/20">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <p className="text-sm text-white/70">Raised</p>
            <p className="text-lg font-bold text-white">{(campaign.raised || 0).toLocaleString()} RELIEF</p>
          </div>
          <div>
            <p className="text-sm text-white/70">Goal</p>
            <p className="text-lg font-bold text-white">{campaign.goal.toLocaleString()} RELIEF</p>
          </div>
          <div>
            <p className="text-sm text-white/70">Available Beneficiaries</p>
            <p className="text-lg font-bold text-white">{approvedBeneficiaries.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/20">
          <button 
            onClick={() => onAllocateFunds(campaign)}
            disabled={!campaign.blockchainAddress || approvedBeneficiaries.length === 0 || (campaign.raised || 0) === 0}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💰 Allocate Funds
          </button>
          {campaign.txHash && (
            <a
              href={getPolygonScanUrl(campaign.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/10 text-white py-2 rounded-lg hover:bg-white/20 font-semibold text-center border border-white/20"
            >
              View on PolygonScan ↗
            </a>
          )}
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
  const [txStatus, setTxStatus] = useState(''); // Status message for user
  const [isApprovedOrganizer, setIsApprovedOrganizer] = useState(null); // null = checking, true/false = result
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  // Check if organizer is approved on blockchain
  const checkApproval = async () => {
    if (!address) {
      console.log('No address connected');
      setIsApprovedOrganizer(null);
      return;
    }
    
    try {
      console.log('🔍 Checking approval for address:', address);
      console.log('📍 CampaignFactory address:', CONTRACTS.campaignFactory);
      
      const client = getPublicClient(config, { chainId: 80002 });
      
      // Retry logic for RPC calls
      let isApproved;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          isApproved = await client.readContract({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'isApprovedOrganizer',
            args: [address]
          });
          break; // Success
        } catch (rpcError) {
          retryCount++;
          console.warn(`Retry ${retryCount}/${maxRetries} - RPC call failed:`, rpcError.message);
          
          if (retryCount >= maxRetries) {
            throw rpcError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      console.log(isApproved ? '✅ Organizer is APPROVED' : '❌ Organizer is NOT APPROVED');
      setIsApprovedOrganizer(isApproved);
    } catch (error) {
      console.error('❌ Error checking organizer approval:', error);
      setIsApprovedOrganizer(false);
    }
  };
  
  useEffect(() => {
    checkApproval();
  }, [address]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verify user is connected with their registered wallet
    if (!address) {
      alert('❌ No wallet connected. Please connect your MetaMask wallet.');
      return;
    }
    
    console.log('📝 Form Data:', formData);
    console.log('🔐 Connected wallet:', address);
    console.log('📍 Organizer ID from Firebase:', organizerId);
    
    setLoading(true);
    setTxStatus('Checking organizer approval...');
    
    // Re-check approval status just before creating campaign
    try {
      console.log('🔍 Re-checking organizer approval on blockchain...');
      console.log('📍 Wallet address:', address);
      console.log('📍 CampaignFactory:', CONTRACTS.campaignFactory);
      
      const client = getPublicClient(config, { chainId: 80002 });
      
      // Verify we're on the correct network
      const chainId = await client.getChainId();
      console.log('📍 Chain ID:', chainId);
      
      if (chainId !== 80002) {
        setLoading(false);
        setTxStatus('');
        alert(`❌ Wrong Network!\n\nYou are on chain ID ${chainId}.\n\nPlease switch to Polygon Amoy Testnet (Chain ID: 80002) in MetaMask.`);
        return;
      }
      
      const isApproved = await client.readContract({
        address: CONTRACTS.campaignFactory,
        abi: CampaignFactoryABI.abi,
        functionName: 'isApprovedOrganizer',
        args: [address]
      });
      
      console.log('✅ Fresh approval status:', isApproved);
      
      if (!isApproved) {
        setLoading(false);
        setTxStatus('');
        alert(`❌ Wallet Not Approved as Organizer

Your wallet address is NOT approved on the blockchain.

Connected Wallet: ${address}

IMPORTANT: Make sure you're connected with the SAME wallet address you used during registration!

If this is your registered wallet:
1. Ask the admin to approve this address: ${address}
2. Wait 1-2 minutes for blockchain confirmation
3. Click "🔄 Refresh Status"
4. Try again

If you're connected with the wrong wallet:
1. Switch to your registered wallet in MetaMask
2. Refresh this page
3. Try again`);
        return;
      }
      
      console.log('✅ Organizer is approved! Proceeding with campaign creation...');
      
    } catch (approvalError) {
      console.error('❌ Error checking approval:', approvalError);
      setLoading(false);
      setTxStatus('');
      alert(`❌ Failed to verify organizer approval.\n\nError: ${approvalError.message}\n\nPlease check:\n• Your internet connection\n• You are on Polygon Amoy network\n• Try again in a few seconds`);
      return;
    }

    try {
      // Step 1: Deploy campaign to blockchain
      setTxStatus('Deploying campaign to Polygon blockchain...');
      
      if (!walletClient) {
        throw new Error('Please connect your wallet first');
      }

      // Check if MetaMask is on the correct chain
      if (window.ethereum) {
        const metamaskChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdNumber = parseInt(metamaskChainId, 16);
        console.log('📍 MetaMask chain ID:', chainIdNumber);
        
        if (chainIdNumber !== 80002) {
          setLoading(false);
          setTxStatus('');
          
          // Try to switch network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x138a2' }], // 80002 in hex
            });
            console.log('✅ Switched to Polygon Amoy');
          } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x138a2',
                    chainName: 'Polygon Amoy Testnet',
                    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                    rpcUrls: ['https://rpc-amoy.polygon.technology'],
                    blockExplorerUrls: ['https://amoy.polygonscan.com'],
                  }],
                });
              } catch (addError) {
                alert('❌ Please add Polygon Amoy network to MetaMask manually');
                return;
              }
            } else {
              alert(`❌ Please switch to Polygon Amoy Testnet (Chain ID: 80002) in MetaMask.`);
              return;
            }
          }
        }
      }

      // Get CampaignFactory contract
      const campaignFactory = getCampaignFactoryContract(walletClient);
      
      // Convert goal to wei (assuming goal is in USD, we'll use it as RELIEF tokens 1:1)
      const goalInWei = parseEther(formData.goal.toString());
      
      console.log('Creating campaign with params:');
      console.log('- CampaignFactory address:', CONTRACTS.campaignFactory);
      console.log('- Title:', formData.title);
      console.log('- Description:', formData.description);
      console.log('- Goal (RELIEF):', formData.goal);
      console.log('- Goal (Wei):', goalInWei.toString());
      console.log('- Location:', formData.location);
      console.log('- Disaster Type:', formData.disasterType);
      console.log('- Sender address:', address);
      console.log('- Chain ID:', config.chains[0].id);

      // Call createCampaign on blockchain
      setTxStatus('Please sign the transaction in MetaMask...');
      
      const publicClient = getPublicClient(config, { chainId: 80002 });
      
      console.log('📋 Final parameters check:');
      console.log('  Title:', formData.title, '(type:', typeof formData.title, ', length:', formData.title.length, ')');
      console.log('  Description:', formData.description, '(type:', typeof formData.description, ', length:', formData.description.length, ')');
      console.log('  Goal Wei:', goalInWei.toString());
      console.log('  Location:', formData.location, '(type:', typeof formData.location, ', length:', formData.location.length, ')');
      console.log('  Disaster Type:', formData.disasterType, '(type:', typeof formData.disasterType, ', length:', formData.disasterType.length, ')');
      console.log('  Account:', address);
      
      let tx;
      try {
        console.log('📤 Sending transaction to blockchain...');
        
        // First, simulate the contract call to catch any errors early
        console.log('🔍 Simulating transaction first...');
        let simulationPassed = false;
        try {
          const { request } = await publicClient.simulateContract({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'createCampaign',
            args: [
              formData.title,
              formData.description,
              goalInWei,
              formData.location,
              formData.disasterType
            ],
            account: address,
          });
          console.log('✅ Simulation passed, proceeding with transaction...');
          console.log('📋 Request object:', request);
          simulationPassed = true;
        } catch (simError) {
          console.error('❌ Simulation failed:', simError);
          console.error('Simulation error details:', {
            message: simError.message,
            cause: simError.cause,
            shortMessage: simError.shortMessage,
            metaMessages: simError.metaMessages,
          });
          
          // Try to extract a more meaningful error
          if (simError.cause?.reason) {
            setLoading(false);
            setTxStatus('');
            alert(`❌ Transaction would fail: ${simError.cause.reason}\n\nPlease check:\n• Your wallet is approved as organizer\n• All fields are filled correctly`);
            return;
          }
          // Continue anyway - MetaMask might still work
          console.log('⚠️ Simulation failed but continuing with direct call...');
        }
        
        // Encode the function data manually for better debugging
        const data = encodeFunctionData({
          abi: CampaignFactoryABI.abi,
          functionName: 'createCampaign',
          args: [
            formData.title,
            formData.description,
            goalInWei,
            formData.location,
            formData.disasterType
          ]
        });
        console.log('📋 Encoded transaction data:', data);
        
        // Try using walletClient.writeContract first
        try {
          tx = await walletClient.writeContract({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'createCampaign',
            args: [
              formData.title,
              formData.description,
              goalInWei,
              formData.location,
              formData.disasterType
            ],
            account: address,
            chain: customPolygonAmoy,
          });
          console.log('✅ Transaction hash:', tx);
        } catch (viemError) {
          console.error('⚠️ Viem writeContract failed:', viemError);
          console.log('🔄 Trying alternative method using window.ethereum...');
          
          // Fallback: Use MetaMask directly via eth_sendTransaction
          if (window.ethereum) {
            const txParams = {
              from: address,
              to: CONTRACTS.campaignFactory,
              data: data,
              chainId: '0x' + (80002).toString(16), // 0x138a2
            };
            
            console.log('📋 Sending via eth_sendTransaction:', txParams);
            
            tx = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [txParams],
            });
            console.log('✅ Transaction hash (via MetaMask):', tx);
          } else {
            throw viemError;
          }
        }
      } catch (writeError) {
        console.error('❌ Contract write error:', writeError);
        console.error('Error details:', {
          message: writeError.message,
          code: writeError.code,
          data: writeError.data,
          shortMessage: writeError.shortMessage,
          cause: writeError.cause
        });
        
        setLoading(false);
        setTxStatus('');
        
        // Provide specific error messages
        let errorMessage = 'Failed to create campaign on blockchain.\n\n';
        
        if (writeError.message?.includes('User rejected') || writeError.message?.includes('User denied') || writeError.code === 4001) {
          alert('❌ Transaction Cancelled\n\nYou cancelled the transaction in MetaMask.');
          return;
        }
        
        if (writeError.message?.includes('insufficient funds')) {
          alert('❌ Insufficient Funds\n\nYou don\'t have enough POL tokens to pay for gas.\n\nPlease get some POL from a faucet:\nhttps://faucet.polygon.technology/');
          return;
        }
        
        if (writeError.message?.includes('Internal JSON-RPC error')) {
          errorMessage += 'The blockchain returned an "Internal JSON-RPC error".\n\n';
          errorMessage += 'This could mean:\n';
          errorMessage += '1. Your wallet is not approved as an organizer\n';
          errorMessage += '2. Network connection issue\n';
          errorMessage += '3. Contract execution failed\n\n';
          errorMessage += `Connected wallet: ${address}\n\n`;
          errorMessage += 'Try:\n';
          errorMessage += '• Click "🔄 Refresh Status" to check approval\n';
          errorMessage += '• Check your internet connection\n';
          errorMessage += '• Try again in a few seconds\n';
          errorMessage += '• Contact admin if issue persists';
        } else {
          errorMessage += writeError.shortMessage || writeError.message || 'Unknown error';
        }
        
        alert('❌ ' + errorMessage);
        return;
      }

      setTxStatus('Transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      
      console.log('Transaction receipt:', receipt);
      
      // Extract campaign address from event logs
      let campaignAddress = null;
      
      // Parse the logs to find CampaignCreated event
      for (const log of receipt.logs) {
        try {
          // The first topic is the event signature, second is the campaign address
          if (log.topics.length > 1) {
            // Campaign address is typically the first indexed parameter
            campaignAddress = `0x${log.topics[1].slice(26)}`; // Remove padding
            break;
          }
        } catch (err) {
          console.error('Error parsing log:', err);
        }
      }

      if (!campaignAddress && receipt.logs.length > 0) {
        // Fallback: try to get from contract address in first log
        campaignAddress = receipt.logs[0].address;
      }

      setTxStatus('Campaign deployed! Saving to database...');

      // Step 2: Save to Firebase with blockchain data
      if (db) {
        const campaignDoc = await addDoc(collection(db, 'campaigns'), {
          ...formData,
          goal: parseFloat(formData.goal),
          expectedBeneficiaries: parseInt(formData.expectedBeneficiaries),
          organizerId: organizerId,
          raised: 0,
          beneficiaries: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          // Blockchain data - CRITICAL: used by beneficiary dashboard
          blockchainAddress: campaignAddress,
          contractAddress: campaignAddress, // Alias for compatibility
          txHash: tx,
          network: 'polygon-amoy',
          chainId: 80002
        });
        
        console.log('✅ Campaign saved to Firebase with ID:', campaignDoc.id);
        console.log('📝 Campaign data:', {
          title: formData.title,
          organizerId: organizerId,
          blockchainAddress: campaignAddress
        });
        
        alert(`✅ Campaign created successfully!\n\nBlockchain Address: ${campaignAddress}\n\nView on PolygonScan: ${getPolygonScanUrl(tx)}`);
        onSuccess();
      } else {
        alert('Demo mode - Firebase not configured');
        onClose();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        shortMessage: error.shortMessage,
        metaMessages: error.metaMessages
      });
      
      const errorMessage = parseContractError(error);
      
      // Check for specific error types
      if (error.message?.includes('user rejected')) {
        alert('❌ Transaction was rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        alert('❌ Insufficient funds for gas fee\n\nPlease make sure you have enough POL tokens for gas.');
      } else if (error.message?.includes('Not an approved organizer')) {
        alert('❌ Your wallet is not approved as an organizer\n\nPlease contact admin to approve your wallet address.');
      } else {
        alert(`Failed to create campaign: ${errorMessage}\n\nCheck console for more details.`);
      }
    } finally {
      setLoading(false);
      setTxStatus('');
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
          
          {/* Organizer Approval Status */}
          <div className="mt-4">
            {isApprovedOrganizer === null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800 text-sm">Checking organizer approval status...</span>
                </div>
                <button
                  onClick={checkApproval}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded transition"
                >
                  Refresh
                </button>
              </div>
            )}
            {isApprovedOrganizer === true && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 text-sm font-medium">✓ You are an approved organizer on blockchain</span>
                </div>
                <button
                  onClick={checkApproval}
                  className="text-green-600 hover:text-green-800 text-xs font-medium px-3 py-1 bg-green-100 hover:bg-green-200 rounded transition"
                >
                  Refresh
                </button>
              </div>
            )}
            {isApprovedOrganizer === false && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-800 text-sm font-medium">⚠️ Not approved as organizer</p>
                      <p className="text-red-700 text-xs mt-1">Your wallet address needs to be approved by the admin before you can create campaigns.</p>
                      <p className="text-red-600 text-xs mt-1 font-mono bg-red-100 px-2 py-1 rounded break-all">{address}</p>
                      <p className="text-red-600 text-xs mt-2 italic">Ask admin to approve this address on the blockchain.</p>
                    </div>
                  </div>
                  <button
                    onClick={checkApproval}
                    className="text-red-600 hover:text-red-800 text-xs font-medium px-3 py-1 bg-red-100 hover:bg-red-200 rounded transition ml-2 flex-shrink-0"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
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

          {/* Transaction Status */}
          {txStatus && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-800 font-medium">{txStatus}</p>
              </div>
            </div>
          )}

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
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating on Blockchain...
                </span>
              ) : (
                'Create Campaign on Blockchain'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovedBeneficiaryCard({ beneficiary, campaign, onAllocateFunds }) {
  return (
    <div className="border-2 border-green-500/30 rounded-xl p-6 hover:bg-white/10 transition-all bg-white/5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-white/10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-white">{beneficiary.name}</h3>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-500/20 text-green-300 border border-green-500/30">
              ✅ APPROVED ON-CHAIN
            </span>
            {beneficiary.hasWallet ? (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                💰 {beneficiary.allocatedAmount || '0'} RELIEF ALLOCATED
              </span>
            ) : (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                ⏳ AWAITING FUND ALLOCATION
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm">
            Campaign: <span className="font-semibold text-green-400">{beneficiary.campaignTitle || campaign?.title || 'Unknown Campaign'}</span>
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white/5 rounded-lg p-5 mb-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization */}
          {beneficiary.organization && beneficiary.organization !== 'N/A' && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/20">
              <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Organization</span>
              <p className="text-white font-medium">{beneficiary.organization}</p>
            </div>
          )}

          {/* Campaign */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20">
            <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Campaign</span>
            <p className="text-white font-medium">{beneficiary.campaignTitle || campaign?.title || 'N/A'}</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/20 mt-4">
          <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Polygon Wallet Address</span>
          <p className="text-green-400 font-mono text-sm break-all">{beneficiary.walletAddress || beneficiary.id}</p>
        </div>

        {/* Beneficiary Wallet Contract (if exists) */}
        {beneficiary.hasWallet && beneficiary.walletContract && (
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30 mt-4">
            <span className="text-xs font-semibold text-green-300 uppercase block mb-1">Beneficiary Wallet Contract</span>
            <p className="text-green-400 font-mono text-sm break-all">{beneficiary.walletContract}</p>
            <p className="text-green-300 text-sm mt-2">
              <strong>Allocated:</strong> {beneficiary.allocatedAmount} RELIEF tokens
            </p>
          </div>
        )}
      </div>

      {/* Allocate Funds Button (only if no wallet yet) */}
      {!beneficiary.hasWallet && (
        <div className="pt-4 border-t-2 border-white/10">
          <button
            onClick={onAllocateFunds}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            ALLOCATE FUNDS (ON-CHAIN)
          </button>
        </div>
      )}
    </div>
  );
}

function BeneficiaryCard({ beneficiary, campaign, onApprove, onReject, showActions = true, isProcessing = false }) {
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
    <div className="border-2 border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all bg-white/5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-white/10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-white">{beneficiary.name}</h3>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              🤝 BENEFICIARY
            </span>
            {beneficiary.isApprovedOnChain && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                ✅ ON-CHAIN APPROVED
              </span>
            )}
            {beneficiary.hasWallet && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                💰 {beneficiary.allocatedAmount || '0'} RELIEF
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm">
            Applied for: <span className="font-semibold text-green-400">{beneficiary.campaignTitle || campaign?.title || 'Unknown Campaign'}</span>
          </p>
        </div>
      </div>

      {/* Application Details */}
      <div className="bg-white/5 rounded-lg p-5 mb-4 border border-white/10">
        <h4 className="font-bold text-white mb-3 text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          Application Details (On-Chain)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization */}
          {beneficiary.organization && beneficiary.organization !== 'N/A' && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/20">
              <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Organization</span>
              <p className="text-white font-medium">{beneficiary.organization}</p>
            </div>
          )}

          {/* Campaign */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20">
            <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Campaign</span>
            <p className="text-white font-medium">{beneficiary.campaignTitle || campaign?.title || 'N/A'}</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/20 mt-4">
          <span className="text-xs font-semibold text-white/70 uppercase block mb-1">Polygon Wallet Address</span>
          <p className="text-green-400 font-mono text-sm break-all">{beneficiary.walletAddress || beneficiary.id}</p>
        </div>

        {/* Beneficiary Wallet Contract (if exists) */}
        {beneficiary.hasWallet && beneficiary.walletContract && (
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30 mt-4">
            <span className="text-xs font-semibold text-green-300 uppercase block mb-1">Beneficiary Wallet Contract</span>
            <p className="text-green-400 font-mono text-sm break-all">{beneficiary.walletContract}</p>
          </div>
        )}

        {/* Description/Reason */}
        {beneficiary.description && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/20 mt-4">
            <span className="text-xs font-semibold text-white/70 uppercase block mb-2">
              Why They Need Relief Funds
            </span>
            <p className="text-white leading-relaxed">{beneficiary.description}</p>
          </div>
        )}

        {/* Verification Document */}
        {beneficiary.documentUrl && (
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg p-4 border-2 border-blue-500/30 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-lg p-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-300 uppercase block">Verification Document</span>
                  <p className="text-sm text-blue-200 font-medium">PDF Document Uploaded</p>
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
      {showActions && (
        <div className="flex gap-3 pt-4 border-t-2 border-white/10">
          <button
            onClick={() => onApprove(beneficiary)}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                APPROVE ON-CHAIN
              </>
            )}
          </button>
          <button
            onClick={() => onReject(beneficiary)}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                REJECT ON-CHAIN
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
