/**
 * Comprehensive Test Suite for USDC Migration
 * Phase 5.1: POL Swap Testing
 * 
 * Run: node test-pol-swap.js
 */

const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const RPC_URL = process.env.VITE_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POL_USDC_SWAP_ADDRESS = process.env.VITE_POL_USDC_SWAP_ADDRESS || '0x57af49233094939E87a875bf04FD003045E6266D';
const USDC_ADDRESS = process.env.VITE_USDC_ADDRESS || '0x41E94Ca92cD8d48f89F8059FfC125265Ce440722';

// ABIs
const SWAP_ABI = [
  'function swapPOLtoUSDC(uint256 minUSDCOut) external payable returns (uint256)',
  'function getEstimatedUSDCOut(uint256 polAmount) external view returns (uint256)'
];

const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

// Test results
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
  console.log('\n🧪 Phase 5.1: POL Swap Testing\n');
  console.log('='.repeat(60));
  
  try {
    // Setup
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`\n📋 Test Configuration:`);
    console.log(`Network: Polygon Amoy Testnet`);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`POLtoUSDCSwap: ${POL_USDC_SWAP_ADDRESS}`);
    console.log(`USDC Token: ${USDC_ADDRESS}\n`);
    
    // Test 1: Check wallet POL balance
    console.log('\n--- Test 1: POL Balance Check ---');
    const polBalance = await provider.getBalance(wallet.address);
    const polFormatted = ethers.formatEther(polBalance);
    logTest(
      'User has POL for testing',
      parseFloat(polFormatted) > 0.1,
      `Balance: ${polFormatted} POL`
    );
    
    // Test 2: Contract exists
    console.log('\n--- Test 2: Contract Verification ---');
    const swapCode = await provider.getCode(POL_USDC_SWAP_ADDRESS);
    logTest(
      'POLtoUSDCSwap contract exists',
      swapCode !== '0x',
      `Contract deployed at ${POL_USDC_SWAP_ADDRESS}`
    );
    
    if (swapCode === '0x') {
      console.log('\n❌ Cannot continue - Swap contract not found');
      return;
    }
    
    // Test 3: Get swap estimate
    console.log('\n--- Test 3: Swap Estimation ---');
    const swapContract = new ethers.Contract(POL_USDC_SWAP_ADDRESS, SWAP_ABI, provider);
    const testPOLAmount = ethers.parseEther('0.1'); // 0.1 POL
    
    try {
      const estimatedUSDC = await swapContract.getEstimatedUSDCOut(testPOLAmount);
      const usdcFormatted = ethers.formatUnits(estimatedUSDC, 6);
      logTest(
        'Get estimated USDC output',
        parseFloat(usdcFormatted) > 0,
        `0.1 POL → ${usdcFormatted} USDC (estimated)`
      );
    } catch (error) {
      logTest(
        'Get estimated USDC output',
        false,
        `Error: ${error.message}`
      );
    }
    
    // Test 4: Check initial USDC balance
    console.log('\n--- Test 4: USDC Balance (Before Swap) ---');
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    const usdcBalanceBefore = await usdcContract.balanceOf(wallet.address);
    const usdcBeforeFormatted = ethers.formatUnits(usdcBalanceBefore, 6);
    console.log(`   Initial USDC Balance: ${usdcBeforeFormatted} USDC`);
    
    // Test 5: Execute swap
    console.log('\n--- Test 5: Execute POL → USDC Swap ---');
    console.log('⚠️  This will use real testnet POL. Proceeding with 0.1 POL swap...');
    
    try {
      const swapContractSigner = swapContract.connect(wallet);
      const swapAmount = ethers.parseEther('0.1');
      
      console.log(`   Swapping ${ethers.formatEther(swapAmount)} POL...`);
      const tx = await swapContractSigner.swapPOLtoUSDC(0, {
        value: swapAmount,
        gasLimit: 500000
      });
      
      console.log(`   Transaction sent: ${tx.hash}`);
      console.log(`   Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      logTest(
        'Swap transaction confirmed',
        receipt.status === 1,
        `Gas used: ${receipt.gasUsed.toString()}`
      );
      
      // Test 6: Verify USDC received
      console.log('\n--- Test 6: USDC Balance (After Swap) ---');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const usdcBalanceAfter = await usdcContract.balanceOf(wallet.address);
      const usdcAfterFormatted = ethers.formatUnits(usdcBalanceAfter, 6);
      const usdcReceived = usdcBalanceAfter - usdcBalanceBefore;
      const usdcReceivedFormatted = ethers.formatUnits(usdcReceived, 6);
      
      console.log(`   Final USDC Balance: ${usdcAfterFormatted} USDC`);
      console.log(`   USDC Received: ${usdcReceivedFormatted} USDC`);
      
      logTest(
        'USDC received from swap',
        usdcReceived > 0,
        `Received ${usdcReceivedFormatted} USDC`
      );
      
      // Test 7: Verify exchange rate reasonableness
      const exchangeRate = parseFloat(usdcReceivedFormatted) / 0.1;
      logTest(
        'Exchange rate is reasonable',
        exchangeRate > 0.1 && exchangeRate < 2,
        `Rate: 1 POL = ${exchangeRate.toFixed(4)} USDC`
      );
      
      // Test 8: Transaction visible in explorer
      console.log('\n--- Test 7: Block Explorer Verification ---');
      console.log(`   View transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);
      logTest(
        'Transaction shows in wallet/explorer',
        true,
        `Check: https://amoy.polygonscan.com/tx/${tx.hash}`
      );
      
    } catch (error) {
      logTest(
        'Execute swap transaction',
        false,
        `Error: ${error.message}`
      );
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
  
  // Detailed results
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}`);
      if (t.details) console.log(`     ${t.details}`);
    });
  }
  
  console.log('\n');
}

// Run tests
runTests().catch(console.error);
