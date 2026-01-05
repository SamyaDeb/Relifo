import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { USER_STATUS } from '../../firebase/constants';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
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
              {isConnected && address && (
                <p className="text-blue-200 text-sm mt-1">
                  Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ConnectButton />
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 shadow-lg"
              >
                + Create Campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <StatCard title="Total Campaigns" value={campaigns.length} icon="📋" />
          <StatCard title="Active" value={campaigns.filter(c => c.status === 'active').length} icon="✅" />
          <StatCard title="Total Raised" value={`$${campaigns.reduce((sum, c) => sum + (c.raised || 0), 0).toLocaleString()}`} icon="💰" />
          <StatCard title="Total Beneficiaries" value={approvedBeneficiaries.length} icon="👥" />
          <StatCard title="Pending Approvals" value={pendingBeneficiaries.length} icon="⏳" color="bg-yellow-500" />
          <StatCard title="Approved" value={approvedBeneficiaries.length} icon="✅" color="bg-green-500" />
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
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Beneficiaries ({pendingBeneficiaries.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'approved'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Approved Beneficiaries ({approvedBeneficiaries.length})
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No approved beneficiaries yet
                    </h3>
                    <p className="text-gray-600">Approved beneficiaries will appear here</p>
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

        {/* Campaigns - Legacy section kept for backward compatibility, can be removed */}
        {/* Old campaigns section removed as it's now in tabs */}
      </div>

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
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{campaign.title}</h3>
          </div>
          <p className="text-gray-600">{campaign.description}</p>
          {campaign.blockchainAddress && (
            <p className="text-xs text-gray-500 mt-2 font-mono">
              📍 {campaign.blockchainAddress.slice(0, 10)}...{campaign.blockchainAddress.slice(-8)}
            </p>
          )}
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
            <p className="text-lg font-bold text-gray-900">{(campaign.raised || 0).toLocaleString()} RELIEF</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="text-lg font-bold text-gray-900">{campaign.goal.toLocaleString()} RELIEF</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Available Beneficiaries</p>
            <p className="text-lg font-bold text-gray-900">{approvedBeneficiaries.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <button 
            onClick={() => onAllocateFunds(campaign)}
            disabled={!campaign.blockchainAddress || approvedBeneficiaries.length === 0 || (campaign.raised || 0) === 0}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💰 Allocate Funds
          </button>
          {campaign.txHash && (
            <a
              href={getPolygonScanUrl(campaign.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-semibold text-center"
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
    <div className="border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">{beneficiary.name}</h3>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-700">
              ✅ APPROVED ON-CHAIN
            </span>
            {beneficiary.hasWallet ? (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                💰 {beneficiary.allocatedAmount || '0'} RELIEF ALLOCATED
              </span>
            ) : (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-100 text-yellow-700">
                ⏳ AWAITING FUND ALLOCATION
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Campaign: <span className="font-semibold text-indigo-600">{beneficiary.campaignTitle || campaign?.title || 'Unknown Campaign'}</span>
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-gray-50 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization */}
          {beneficiary.organization && beneficiary.organization !== 'N/A' && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Organization</span>
              <p className="text-gray-900 font-medium">{beneficiary.organization}</p>
            </div>
          )}

          {/* Campaign */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Campaign</span>
            <p className="text-gray-900 font-medium">{beneficiary.campaignTitle || campaign?.title || 'N/A'}</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 mt-4">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Polygon Wallet Address</span>
          <p className="text-gray-900 font-mono text-sm break-all">{beneficiary.walletAddress || beneficiary.id}</p>
        </div>

        {/* Beneficiary Wallet Contract (if exists) */}
        {beneficiary.hasWallet && beneficiary.walletContract && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-4">
            <span className="text-xs font-semibold text-green-700 uppercase block mb-1">Beneficiary Wallet Contract</span>
            <p className="text-green-900 font-mono text-sm break-all">{beneficiary.walletContract}</p>
            <p className="text-green-700 text-sm mt-2">
              <strong>Allocated:</strong> {beneficiary.allocatedAmount} RELIEF tokens
            </p>
          </div>
        )}
      </div>

      {/* Allocate Funds Button (only if no wallet yet) */}
      {!beneficiary.hasWallet && (
        <div className="pt-4 border-t-2 border-gray-100">
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
    <div className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">{beneficiary.name}</h3>
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-purple-100 text-purple-700">
              🤝 BENEFICIARY
            </span>
            {beneficiary.isApprovedOnChain && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-700">
                ✅ ON-CHAIN APPROVED
              </span>
            )}
            {beneficiary.hasWallet && (
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                💰 {beneficiary.allocatedAmount || '0'} RELIEF
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Applied for: <span className="font-semibold text-indigo-600">{beneficiary.campaignTitle || campaign?.title || 'Unknown Campaign'}</span>
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
          Application Details (On-Chain)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization */}
          {beneficiary.organization && beneficiary.organization !== 'N/A' && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Organization</span>
              <p className="text-gray-900 font-medium">{beneficiary.organization}</p>
            </div>
          )}

          {/* Campaign */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Campaign</span>
            <p className="text-gray-900 font-medium">{beneficiary.campaignTitle || campaign?.title || 'N/A'}</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 mt-4">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Polygon Wallet Address</span>
          <p className="text-gray-900 font-mono text-sm break-all">{beneficiary.walletAddress || beneficiary.id}</p>
        </div>

        {/* Beneficiary Wallet Contract (if exists) */}
        {beneficiary.hasWallet && beneficiary.walletContract && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-4">
            <span className="text-xs font-semibold text-green-700 uppercase block mb-1">Beneficiary Wallet Contract</span>
            <p className="text-green-900 font-mono text-sm break-all">{beneficiary.walletContract}</p>
          </div>
        )}

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
      {showActions && (
        <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
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
