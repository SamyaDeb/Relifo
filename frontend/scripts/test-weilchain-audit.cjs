/**
 * WeilChain Audit Service Test Script
 * 
 * Tests the WeilChain audit trail integration to ensure:
 * - Connection to WeilChain works
 * - Read-only operations succeed
 * - Signer can log transactions
 * - Verification works correctly
 * 
 * Usage:
 * node scripts/test-weilchain-audit.cjs
 */

const { WeilWallet } = require('@weilliptic/weil-sdk');

// Load from environment or use defaults
const SENTINEL_URL = process.env.VITE_WEILCHAIN_SENTINEL_URL || 'https://sentinel.unweil.me';
const AUDIT_CONTRACT = process.env.VITE_WEILCHAIN_AUDIT_CONTRACT || 'aaaaaasmrquobjshwok2uyfz7gcgg6dbuhvusublvgyrimskqkwws5udqu';
const SIGNER_KEY = process.env.VITE_WEILCHAIN_SIGNER_KEY || 'ba9b62186e52bd8c831a3850a3c639d0f0ca109e56956160c274bdf124b0a5f4';

console.log('🧪 WeilChain Audit Service Test\n');
console.log('='.repeat(60));
console.log('Configuration:');
console.log('  Sentinel URL:', SENTINEL_URL);
console.log('  Contract:', AUDIT_CONTRACT);
console.log('  Signer Key:', SIGNER_KEY ? '✓ Configured' : '✗ Not configured');
console.log('='.repeat(60));

/**
 * Parse WeilChain result
 */
const parseResult = (result) => {
  if (!result || !result.txn_result) return null;
  try {
    const parsed = JSON.parse(result.txn_result);
    if (parsed.Ok !== undefined) {
      if (typeof parsed.Ok === 'string') {
        try {
          return JSON.parse(parsed.Ok);
        } catch {
          return parsed.Ok;
        }
      }
      return parsed.Ok;
    }
    if (parsed.Err !== undefined) {
      throw new Error(parsed.Err);
    }
    return parsed;
  } catch (error) {
    console.error('Parse error:', error);
    return result.txn_result;
  }
};

/**
 * Test 1: Read-Only Connection
 */
async function testReadOnlyConnection() {
  console.log('\n📖 Test 1: Read-Only Connection');
  console.log('-'.repeat(60));
  
  try {
    const wallet = new WeilWallet({
      privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
      sentinelEndpoint: SENTINEL_URL
    });
    
    console.log('⏳ Fetching audit statistics...');
    const result = await wallet.contracts.execute(
      AUDIT_CONTRACT,
      'get_stats',
      {}
    );
    
    const stats = parseResult(result);
    console.log('✅ Successfully connected to WeilChain!');
    console.log('   Total Entries:', stats.total_entries);
    console.log('   Total Donations:', stats.total_donations_logged);
    console.log('   Total Amount:', stats.total_amount_tracked);
    
    return true;
  } catch (error) {
    console.error('❌ Read-only connection failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Signer Connection
 */
async function testSignerConnection() {
  console.log('\n🔐 Test 2: Signer Connection');
  console.log('-'.repeat(60));
  
  try {
    const wallet = new WeilWallet({
      privateKey: SIGNER_KEY,
      sentinelEndpoint: SENTINEL_URL
    });
    
    console.log('⏳ Testing signer wallet...');
    const pods = await wallet.pods.list();
    console.log('✅ Signer wallet connected!');
    console.log('   Available pods:', pods.length);
    
    return true;
  } catch (error) {
    console.error('❌ Signer connection failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Log Test Transaction
 */
async function testLogTransaction() {
  console.log('\n📝 Test 3: Log Test Transaction');
  console.log('-'.repeat(60));
  
  try {
    const wallet = new WeilWallet({
      privateKey: SIGNER_KEY,
      sentinelEndpoint: SENTINEL_URL
    });
    
    // Generate a test transaction hash
    const testTxHash = '0xtest' + Date.now().toString(16) + Math.random().toString(16).slice(2, 18);
    
    console.log('⏳ Logging test transaction...');
    console.log('   Test TX Hash:', testTxHash);
    
    const result = await wallet.contracts.execute(
      AUDIT_CONTRACT,
      'log_transaction',
      {
        polygon_tx_hash: testTxHash,
        from_address: '0x1111111111111111111111111111111111111111',
        to_address: '0x2222222222222222222222222222222222222222',
        amount: 1000000000000000000,
        transaction_type: 'Donation',
        campaign_id: 'test_campaign_' + Date.now(),
        block_number: 123456,
        metadata: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      }
    );
    
    const entryId = parseResult(result);
    console.log('✅ Transaction logged successfully!');
    console.log('   Entry ID:', entryId);
    
    return { success: true, txHash: testTxHash };
  } catch (error) {
    console.error('❌ Failed to log transaction:', error.message);
    return { success: false };
  }
}

/**
 * Test 4: Verify Transaction
 */
async function testVerifyTransaction(txHash) {
  console.log('\n🔍 Test 4: Verify Transaction');
  console.log('-'.repeat(60));
  
  try {
    const wallet = new WeilWallet({
      privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
      sentinelEndpoint: SENTINEL_URL
    });
    
    console.log('⏳ Verifying transaction:', txHash);
    
    // Wait a bit for the transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = await wallet.contracts.execute(
      AUDIT_CONTRACT,
      'verify_transaction',
      { polygon_tx_hash: txHash }
    );
    
    const isVerified = parseResult(result);
    
    if (isVerified === true || isVerified === 'true') {
      console.log('✅ Transaction verified on WeilChain!');
      return true;
    } else {
      console.log('⚠️  Transaction not yet verified (may need more time)');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Retrieve Audit Entry
 */
async function testGetAuditEntry(txHash) {
  console.log('\n📋 Test 5: Retrieve Audit Entry');
  console.log('-'.repeat(60));
  
  try {
    const wallet = new WeilWallet({
      privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
      sentinelEndpoint: SENTINEL_URL
    });
    
    console.log('⏳ Fetching audit entry...');
    
    const result = await wallet.contracts.execute(
      AUDIT_CONTRACT,
      'get_entry_by_tx_hash',
      { polygon_tx_hash: txHash }
    );
    
    const entry = parseResult(result);
    
    if (entry) {
      console.log('✅ Audit entry retrieved!');
      console.log('   Entry ID:', entry.id);
      console.log('   Transaction Type:', entry.transaction_type);
      console.log('   Amount:', entry.amount);
      console.log('   From:', entry.from_address);
      console.log('   To:', entry.to_address);
      console.log('   Block:', entry.block_number);
      console.log('   Campaign:', entry.campaign_id);
      return true;
    } else {
      console.log('⚠️  Entry not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to retrieve entry:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting WeilChain Audit Trail Tests...\n');
  
  const results = {
    readOnly: false,
    signer: false,
    log: false,
    verify: false,
    retrieve: false
  };
  
  try {
    // Test 1: Read-only connection
    results.readOnly = await testReadOnlyConnection();
    if (!results.readOnly) {
      throw new Error('Read-only connection failed. Check SENTINEL_URL and CONTRACT address.');
    }
    
    // Test 2: Signer connection
    results.signer = await testSignerConnection();
    if (!results.signer) {
      throw new Error('Signer connection failed. Check SIGNER_KEY.');
    }
    
    // Test 3: Log transaction
    const logResult = await testLogTransaction();
    results.log = logResult.success;
    
    if (results.log) {
      // Test 4: Verify transaction
      results.verify = await testVerifyTransaction(logResult.txHash);
      
      // Test 5: Retrieve entry
      results.retrieve = await testGetAuditEntry(logResult.txHash);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Read-Only Connection:  ${results.readOnly ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Signer Connection:     ${results.signer ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Log Transaction:       ${results.log ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Verify Transaction:    ${results.verify ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Retrieve Entry:        ${results.retrieve ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  if (passCount === totalTests) {
    console.log('\n🎉 All tests passed! WeilChain audit trail is ready to use.');
  } else {
    console.log(`\n⚠️  ${passCount}/${totalTests} tests passed. Review failed tests above.`);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Integrate weilchainAuditService.js into your donation flow');
  console.log('   2. Add WeilChainBadge component to your transaction displays');
  console.log('   3. Add WeilChainAuditStats component to your dashboard');
}

// Run the tests
runAllTests()
  .then(() => {
    console.log('\n✨ Test complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
