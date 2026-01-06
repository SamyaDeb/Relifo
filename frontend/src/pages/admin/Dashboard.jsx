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
import { encodeFunctionData } from 'viem';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    activeCampaigns: 0,
    totalDonations: 0,
    organizers: 0,
    beneficiaries: 0,
    pendingMerchants: 0,
    verifiedMerchants: 0
  });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [revoking, setRevoking] = useState(null);
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

        const pending = usersData.filter(u => u.status === USER_STATUS.PENDING && u.role !== ROLES.BENEFICIARY).length;
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

      // Realtime listener for merchants
      const merchantsRef = collection(db, 'merchant_profile');
      const unsubscribeMerchants = onSnapshot(merchantsRef, async (snapshot) => {
        const merchantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Check blockchain verification status for each merchant
        const publicClient = getPublicClient(config, { chainId: 80002 });
        const merchantsWithStatus = await Promise.all(
          merchantsData.map(async (merchant) => {
            if (!merchant.walletAddress) {
              return { ...merchant, blockchainVerified: false };
            }
            try {
              const isVerified = await publicClient.readContract({
                address: CONTRACTS.campaignFactory,
                abi: CampaignFactoryABI.abi,
                functionName: 'isVerifiedMerchant',
                args: [merchant.walletAddress]
              });
              return { ...merchant, blockchainVerified: isVerified };
            } catch (error) {
              console.error('Error checking merchant verification:', error);
              return { ...merchant, blockchainVerified: false };
            }
          })
        );
        
        setMerchants(merchantsWithStatus);
        
        const pending = merchantsWithStatus.filter(m => !m.blockchainVerified).length;
        const verified = merchantsWithStatus.filter(m => m.blockchainVerified).length;
        
        setStats(prev => ({
          ...prev,
          pendingMerchants: pending,
          verifiedMerchants: verified
        }));
      });

      setLoading(false);

      return () => {
        unsubscribeUsers();
        unsubscribeCampaigns();
        unsubscribeMerchants();
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
      
      // If user is a merchant, use merchant verification flow
      if (user?.role === ROLES.MERCHANT) {
        if (!user?.walletAddress) {
          alert('❌ Merchant wallet address not found');
          return;
        }
        if (!walletClient) {
          alert('❌ Please connect your admin wallet first');
          return;
        }
        
        try {
          console.log('🏪 Verifying merchant on blockchain:', user.walletAddress);
          console.log('📝 Contract:', CONTRACTS.campaignFactory);
          console.log('👤 Admin wallet:', address);
          
          // Check if connected wallet is the owner
          const publicClient = getPublicClient(config, { chainId: 80002 });
          
          // First, check chain ID
          const chainId = await publicClient.getChainId();
          console.log('🔗 Current chain ID:', chainId);
          if (chainId !== 80002) {
            alert('❌ Please switch to Polygon Amoy network (Chain ID: 80002)');
            return;
          }
          
          // Check if merchant is already verified
          console.log('📋 Checking if merchant already verified...');
          const isAlreadyVerified = await publicClient.readContract({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'isVerifiedMerchant',
            args: [user.walletAddress]
          });
          
          if (isAlreadyVerified) {
            console.log('✅ Merchant already verified on blockchain');
            // Just update Firebase
            await updateDoc(doc(db, 'users', userId), {
              status: USER_STATUS.APPROVED
            });
            alert(`✅ Merchant already verified on blockchain!\n\nUpdated Firebase status.`);
            loadData();
            return;
          }
          
          console.log('⏳ Simulating transaction...');
          setApproving(userId);
          
          // Step 1: Simulate the transaction (more reliable than gas estimation)
          let simulationResult;
          try {
            simulationResult = await publicClient.simulateContract({
              address: CONTRACTS.campaignFactory,
              abi: CampaignFactoryABI.abi,
              functionName: 'verifyMerchant',
              args: [user.walletAddress],
              account: address
            });
            console.log('✅ Simulation successful:', simulationResult);
          } catch (simError) {
            console.error('❌ Transaction simulation failed:', simError);
            
            // Check owner
            try {
              const owner = await publicClient.readContract({
                address: CONTRACTS.campaignFactory,
                abi: CampaignFactoryABI.abi,
                functionName: 'owner',
                args: []
              });
              console.log('📋 Contract owner:', owner);
              console.log('📋 Your address:', address);
              if (owner.toLowerCase() !== address.toLowerCase()) {
                alert(`❌ You are not the contract owner!\n\nContract owner: ${owner}\nYour wallet: ${address}\n\nPlease connect with the admin wallet.`);
                setApproving(null);
                return;
              }
            } catch (e) {
              console.error('Error checking owner:', e);
            }
            
            alert('❌ Transaction would fail. Reason: ' + (simError.shortMessage || simError.message));
            setApproving(null);
            return;
          }
          
          // Step 2: Estimate gas with buffer
          console.log('⏳ Estimating gas...');
          const gasEstimate = await publicClient.estimateContractGas({
            address: CONTRACTS.campaignFactory,
            abi: CampaignFactoryABI.abi,
            functionName: 'verifyMerchant',
            args: [user.walletAddress],
            account: address
          });
          
          // Add 20% buffer to gas estimate
          const gasLimit = BigInt(Math.floor(Number(gasEstimate) * 1.2));
          console.log('⛽ Gas estimate:', gasEstimate.toString());
          console.log('⛽ Gas limit (with buffer):', gasLimit.toString());
          
          console.log('⏳ Sending transaction...');
          
          let tx;
          try {
            // Try with wagmi first (with gas limit)
            tx = await walletClient.writeContract({
              address: CONTRACTS.campaignFactory,
              abi: CampaignFactoryABI.abi,
              functionName: 'verifyMerchant',
              args: [user.walletAddress],
              account: address,
              gas: gasLimit
            });
          } catch (wagmiError) {
            console.log('⚠️ Wagmi failed, trying MetaMask directly...', wagmiError);
            
            // Fallback to MetaMask direct call
            if (window.ethereum) {
              try {
                // Check/switch network first
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                const targetChainId = '0x13882'; // 80002 in hex
                
                if (currentChainId !== targetChainId) {
                  console.log('🔄 Switching to Polygon Amoy...');
                  try {
                    await window.ethereum.request({
                      method: 'wallet_switchEthereumChain',
                      params: [{ chainId: targetChainId }],
                    });
                  } catch (switchError) {
                    // Network not added, try adding it
                    if (switchError.code === 4902) {
                      await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                          chainId: targetChainId,
                          chainName: 'Polygon Amoy',
                          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                          rpcUrls: ['https://rpc-amoy.polygon.technology'],
                          blockExplorerUrls: ['https://amoy.polygonscan.com']
                        }]
                      });
                    } else {
                      throw switchError;
                    }
                  }
                }
                
                // Encode function data
                const data = encodeFunctionData({
                  abi: CampaignFactoryABI.abi,
                  functionName: 'verifyMerchant',
                  args: [user.walletAddress]
                });
                
                console.log('📝 Encoded data:', data);
                
                // Send transaction via MetaMask with proper gas limit
                const txHash = await window.ethereum.request({
                  method: 'eth_sendTransaction',
                  params: [{
                    from: address,
                    to: CONTRACTS.campaignFactory,
                    data: data,
                    gas: '0x' + gasLimit.toString(16), // Use calculated gas limit
                  }],
                });
                
                tx = txHash;
                console.log('✅ MetaMask transaction sent:', tx);
              } catch (mmError) {
                console.error('❌ MetaMask direct call also failed:', mmError);
                throw mmError;
              }
            } else {
              throw wagmiError;
            }
          }
          
          console.log('✅ Transaction hash:', tx);
          console.log('⌛ Waiting for confirmation...');
          
          // Wait for transaction confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
          
          console.log('✅ Transaction confirmed!', receipt);
          console.log('🔗 PolygonScan:', `https://amoy.polygonscan.com/tx/${tx}`);
          
          // Update Firebase status
          await updateDoc(doc(db, 'users', userId), {
            status: USER_STATUS.APPROVED
          });
          
          alert(`✅ Merchant verified on blockchain!\n\nMerchant: ${user.name}\nWallet: ${user.walletAddress}\n\n🔗 View on PolygonScan:\nhttps://amoy.polygonscan.com/tx/${tx}`);
          loadData(); // Reload to update merchant verification status
        } catch (error) {
          console.error('Error verifying merchant:', error);
          const errorMsg = parseContractError(error);
          alert(`❌ Failed to verify merchant on blockchain: ${errorMsg}\n\nPlease make sure:\n1. You're connected with the admin wallet\n2. You have enough POL for gas\n3. You're on Polygon Amoy network`);
        } finally {
          setApproving(null);
        }
        return;
      }
      
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

  const handleApproveMerchant = async (merchant) => {
    if (!merchant || !merchant.walletAddress) {
      alert('❌ Merchant wallet address not found');
      return;
    }

    try {
      console.log('🏪 Approving merchant on blockchain:', merchant.walletAddress);
      
      if (!walletClient) {
        alert('❌ Please connect your admin wallet first');
        return;
      }

      setApproving(merchant.id);

      // Verify merchant on blockchain
      const tx = await walletClient.writeContract({
        address: CONTRACTS.campaignFactory,
        abi: CampaignFactoryABI.abi,
        functionName: 'verifyMerchant',
        args: [merchant.walletAddress],
        account: address
      });

      console.log('✅ Transaction sent:', tx);
      alert(`✅ Merchant verified on blockchain!\n\nMerchant: ${merchant.businessName}\nWallet: ${merchant.walletAddress}\n\nTx: ${tx.slice(0, 10)}...`);
      
      // Reload merchants to update status
      loadData();
    } catch (error) {
      console.error('Error approving merchant:', error);
      const errorMsg = parseContractError(error);
      alert(`❌ Failed to verify merchant on blockchain: ${errorMsg}\n\nPlease make sure:\n1. You're connected with the admin wallet\n2. You have enough POL for gas\n3. You're on Polygon Amoy network`);
    } finally {
      setApproving(null);
    }
  };

  const handleRevokeMerchant = async (merchant) => {
    if (!merchant || !merchant.walletAddress) {
      alert('❌ Merchant wallet address not found');
      return;
    }

    if (!confirm(`Are you sure you want to revoke merchant verification for ${merchant.businessName}?`)) {
      return;
    }

    try {
      if (!walletClient) {
        alert('❌ Please connect your admin wallet first');
        return;
      }

      setRevoking(merchant.id);

      const tx = await walletClient.writeContract({
        address: CONTRACTS.campaignFactory,
        abi: CampaignFactoryABI.abi,
        functionName: 'revokeMerchant',
        args: [merchant.walletAddress],
        account: address
      });

      console.log('✅ Merchant revoked:', tx);
      alert(`✅ Merchant verification revoked!\n\nTx: ${tx.slice(0, 10)}...`);
      loadData();
    } catch (error) {
      console.error('Error revoking merchant:', error);
      alert('Failed to revoke merchant verification');
    } finally {
      setRevoking(null);
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

  const pendingUsers = users.filter(u => u.status === USER_STATUS.PENDING && u.role !== ROLES.BENEFICIARY);
  const approvedUsers = users.filter(u => u.status === USER_STATUS.APPROVED);
  const pendingMerchants = merchants.filter(m => !m.blockchainVerified);
  const verifiedMerchants = merchants.filter(m => m.blockchainVerified);

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

          {/* Connect Wallet Button */}
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

        {/* Pending Organizer & Merchant Approvals */}
        <div className="glass-card border border-white/20 rounded-3xl p-5 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all mb-4 flex-shrink-0 overflow-hidden h-[200px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Pending Organizer & Merchant Approvals</h2>
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
                        {user.description && <p className="text-white/50 text-xs italic mt-1">{user.description.substring(0, 80)}{user.description.length > 80 ? '...' : ''}</p>}
                      </div>
                      <div className="flex gap-2">
                        {user.documentUrl && (
                          <button
                            onClick={() => window.open(user.documentUrl, '_blank')}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-1 rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                            title="View submitted document"
                          >
                            📄 View Doc
                          </button>
                        )}
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
