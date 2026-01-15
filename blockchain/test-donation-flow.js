/**
 * Comprehensive Test Suite for USDC Migration
 * Phase 5.2: Contract Testing (USDC → RELIEF → Campaign)
 * 
 * Run: node test-donation-flow.js
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const RPC_URL = process.env.VITE_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USDC_ADDRESS = process.env.VITE_USDC_ADDRESS || '0x41E94Ca92cD8d48f89F8059FfC125265Ce440722';
const RELIEF_TOKEN_ADDRESS = process.env.VITE_RELIEF_TOKEN_ADDRESS || '0xA19dfE0a1fCDf819b073A36875374Db23B12A953';
const RELIEF_TOKEN_SALE_ADDRESS = process.env.VITE_RELIEF_TOKEN_SALE_ADDRESS || '0xe9fd2a5c3a07cBC76bC24180265f10eC38c44e3f';
const CAMPAIGN_FACTORY_ADDRESS = process.env.VITE_CAMPAIGN_FACTORY_ADDRESS || '0xB60eAe36f87F16D1BC1A7173F28FAf8061C531DE';

// ABIs
const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const RELIEF_SALE_ABI = [
  'function buyTokens(uint256 usdcAmount) external',
  'function calculateTokenAmount(uint256 usdcAmount) external pure returns (uint256)'
];

const CAMPAIGN_FACTORY_ABI = [
  'function campaigns(uint256 index) external view returns (address)',
  'function getCampaignCount() external view returns (uint256)'
];

const CAMPAIGN_ABI = [
  'function donate(uint256 amount) external',
  'function campaignInfo() external view returns (tuple(string title, string description, uint256 goalAmount, uint256 raisedAmount, string location, string disasterType, address organizer, address admin, uint8 status, uint256 createdAt))'
];

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runTests() {
  console.log('\n🧪 Phase 5.2: Donation Flow Testing\n');
  console.log('='.repeat(60));
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`\n📋 Test Configuration:`);
    console.log(`Network: Polygon Amoy Testnet`);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`USDC: ${USDC_ADDRESS}`);
    console.log(`RELIEF Token: ${RELIEF_TOKEN_ADDRESS}`);
    console.log(`RELIEF Sale: ${RELIEF_TOKEN_SALE_ADDRESS}`);
    console.log(`Campaign Factory: ${CAMPAIGN_FACTORY_ADDRESS}\n`);
    
    // Test 1: Check USDC balance
    console.log('\n--- Test 1: USDC Balance Check ---');
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
    
    logTest(
      'User has USDC for testing',
      parseFloat(usdcFormatted) >= 1,
      `Balance: ${usdcFormatted} USDC`
    );
    
    if (parseFloat(usdcFormatted) < 1) {
      console.log('\n⚠️  Run test-pol-swap.js first to get USDC');
      return;
    }
    
    // Test 2: Check initial RELIEF balance
    console.log('\n--- Test 2: RELIEF Balance (Before) ---');
    const reliefContract = new ethers.Contract(RELIEF_TOKEN_ADDRESS, ERC20_ABI, wallet);
    const reliefBalanceBefore = await reliefContract.balanceOf(wallet.address);
    const reliefBeforeFormatted = ethers.formatEther(reliefBalanceBefore);
    console.log(`   Initial RELIEF Balance: ${reliefBeforeFormatted} RELIEF`);
    
    // Test 3: Approve USDC for ReliefTokenSale
    console.log('\n--- Test 3: USDC Approval ---');
    const usdcAmount = ethers.parseUnits('1', 6); // 1 USDC
    
    try {
      console.log(`   Approving 1 USDC for ReliefTokenSale...`);
      const approveTx = await usdcContract.approve(RELIEF_TOKEN_SALE_ADDRESS, usdcAmount);
      console.log(`   Transaction: ${approveTx.hash}`);
      await approveTx.wait();
      
      const allowance = await usdcContract.allowance(wallet.address, RELIEF_TOKEN_SALE_ADDRESS);
      
      logTest(
        'USDC approval successful',
        allowance >= usdcAmount,
        `Approved: ${ethers.formatUnits(allowance, 6)} USDC`
      );
    } catch (error) {
      logTest('USDC approval successful', false, `Error: ${error.message}`);
      return;
    }
    
    // Test 4: Buy RELIEF tokens
    console.log('\n--- Test 4: Buy RELIEF Tokens ---');
    const saleContract = new ethers.Contract(RELIEF_TOKEN_SALE_ADDRESS, RELIEF_SALE_ABI, wallet);
    
    try {
      console.log(`   Buying RELIEF with 1 USDC...`);
      const buyTx = await saleContract.buyTokens(usdcAmount, { gasLimit: 300000 });
      console.log(`   Transaction: ${buyTx.hash}`);
      const receipt = await buyTx.wait();
      
      logTest(
        'RELIEF purchase successful',
        receipt.status === 1,
        `Gas used: ${receipt.gasUsed.toString()}`
      );
      
      // Check RELIEF balance after purchase
      await new Promise(resolve => setTimeout(resolve, 3000));
      const reliefBalanceAfter = await reliefContract.balanceOf(wallet.address);
      const reliefAfterFormatted = ethers.formatEther(reliefBalanceAfter);
      const reliefReceived = reliefBalanceAfter - reliefBalanceBefore;
      const reliefReceivedFormatted = ethers.formatEther(reliefReceived);
      
      console.log(`   RELIEF Balance After: ${reliefAfterFormatted} RELIEF`);
      console.log(`   RELIEF Received: ${reliefReceivedFormatted} RELIEF`);
      
      logTest(
        'RELIEF tokens received',
        reliefReceived > 0,
        `Received ${reliefReceivedFormatted} RELIEF`
      );
      
      // Verify 1:1 ratio (1 USDC should give 1 RELIEF)
      const expectedRELIEF = 1.0;
      const actualRELIEF = parseFloat(reliefReceivedFormatted);
      const ratio = Math.abs(expectedRELIEF - actualRELIEF);
      
      logTest(
        '1:1 USDC to RELIEF ratio correct',
        ratio < 0.01,
        `Expected: ${expectedRELIEF}, Got: ${actualRELIEF}`
      );
      
    } catch (error) {
      logTest('RELIEF purchase successful', false, `Error: ${error.message}`);
      return;
    }
    
    // Test 5: Get a campaign to donate to
    console.log('\n--- Test 5: Find Campaign ---');
    const factoryContract = new ethers.Contract(CAMPAIGN_FACTORY_ADDRESS, CAMPAIGN_FACTORY_ABI, provider);
    
    try {
      const campaignCount = await factoryContract.getCampaignCount();
      console.log(`   Total Campaigns: ${campaignCount.toString()}`);
      
      if (campaignCount > 0) {
        const campaignAddress = await factoryContract.campaigns(0);
        console.log(`   Using Campaign: ${campaignAddress}`);
        
        logTest(
          'Campaign found for testing',
          true,
          `Address: ${campaignAddress}`
        );
        
        // Test 6: Get campaign info
        console.log('\n--- Test 6: Campaign Info ---');
        const campaignContract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, provider);
        const campaignInfo = await campaignContract.campaignInfo();
        
        console.log(`   Title: ${campaignInfo.title}`);
        console.log(`   Goal: ${ethers.formatEther(campaignInfo.goalAmount)} RELIEF`);
        console.log(`   Raised: ${ethers.formatEther(campaignInfo.raisedAmount)} RELIEF`);
        
        // Test 7: Approve RELIEF for campaign
        console.log('\n--- Test 7: Approve RELIEF for Campaign ---');
        const donationAmount = ethers.parseEther('0.5'); // 0.5 RELIEF
        
        const approveTx = await reliefContract.approve(campaignAddress, donationAmount);
        console.log(`   Transaction: ${approveTx.hash}`);
        await approveTx.wait();
        
        const allowance = await reliefContract.allowance(wallet.address, campaignAddress);
        
        logTest(
          'RELIEF approved for campaign',
          allowance >= donationAmount,
          `Approved: ${ethers.formatEther(allowance)} RELIEF`
        );
        
        // Test 8: Donate to campaign
        console.log('\n--- Test 8: Donate to Campaign ---');
        const campaignContractSigner = campaignContract.connect(wallet);
        
        const raisedBefore = campaignInfo.raisedAmount;
        
        const donateTx = await campaignContractSigner.donate(donationAmount, { gasLimit: 300000 });
        console.log(`   Transaction: ${donateTx.hash}`);
        const donateReceipt = await donateTx.wait();
        
        logTest(
          'Donation transaction successful',
          donateReceipt.status === 1,
          `Donated 0.5 RELIEF`
        );
        
        // Test 9: Verify campaign received donation
        console.log('\n--- Test 9: Verify Campaign Balance ---');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const updatedInfo = await campaignContract.campaignInfo();
        const raisedAfter = updatedInfo.raisedAmount;
        const increase = raisedAfter - raisedBefore;
        
        console.log(`   Raised Before: ${ethers.formatEther(raisedBefore)} RELIEF`);
        console.log(`   Raised After: ${ethers.formatEther(raisedAfter)} RELIEF`);
        console.log(`   Increase: ${ethers.formatEther(increase)} RELIEF`);
        
        logTest(
          'Campaign received donation',
          increase >= donationAmount,
          `Campaign balance increased by ${ethers.formatEther(increase)} RELIEF`
        );
        
        console.log(`\n   View on Explorer: https://amoy.polygonscan.com/address/${campaignAddress}`);
        
      } else {
        logTest('Campaign found for testing', false, 'No campaigns exist - create one first');
      }
      
    } catch (error) {
      logTest('Campaign operations', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    testResults.failed++;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📋 Total: ${testResults.tests.length}`);
  console.log(`\n${testResults.passed === testResults.tests.length ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}`);
      if (t.details) console.log(`     ${t.details}`);
    });
  }
  
  console.log('\n');
}

runTests().catch(console.error);
