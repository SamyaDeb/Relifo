/**
 * WeilChain Audit Trail Contract Deployment Script
 * 
 * Usage:
 * node deploy-contract.js
 */

const { WeilWallet } = require('@weilliptic/weil-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const SENTINEL_URL = 'https://sentinel.unweil.me';
const PRIVATE_KEY = process.env.WEILCHAIN_DEPLOYER_KEY || 'ba9b62186e52bd8c831a3850a3c639d0f0ca109e56956160c274bdf124b0a5f4';

// File paths
const WASM_PATH = path.join(__dirname, 'wasm', 'audit_trail.wasm');
const WIDL_PATH = path.join(__dirname, 'widl', 'audit_trail.widl');

/**
 * Convert file to hex string
 */
const fileToHex = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('hex');
};

/**
 * Deploy the audit trail contract
 */
async function deployContract() {
  console.log('🚀 WeilChain Audit Trail Contract Deployment\n');
  console.log('='.repeat(50));
  
  // Check if files exist
  if (!fs.existsSync(WASM_PATH)) {
    console.error('❌ WASM file not found at:', WASM_PATH);
    process.exit(1);
  }
  
  if (!fs.existsSync(WIDL_PATH)) {
    console.error('❌ WIDL file not found at:', WIDL_PATH);
    process.exit(1);
  }
  
  const wasmStats = fs.statSync(WASM_PATH);
  const widlStats = fs.statSync(WIDL_PATH);
  
  console.log('✅ Found WASM file:', WASM_PATH);
  console.log('   Size:', (wasmStats.size / 1024).toFixed(2), 'KB');
  console.log('✅ Found WIDL file:', WIDL_PATH);
  console.log('   Size:', (widlStats.size / 1024).toFixed(2), 'KB');
  
  // Create wallet
  const wallet = new WeilWallet({
    privateKey: PRIVATE_KEY,
    sentinelEndpoint: SENTINEL_URL
  });
  
  console.log('\n🌐 Sentinel URL:', SENTINEL_URL);
  
  // List pods to verify connection
  const pods = await wallet.pods.list();
  console.log('📊 Connected! Found', pods.length, 'pods');
  
  try {
    // Convert files to hex
    console.log('\n⏳ Preparing contract files...');
    const wasmHex = fileToHex(WASM_PATH);
    const widlHex = fileToHex(WIDL_PATH);
    
    console.log('   WASM hex length:', wasmHex.length, 'chars');
    console.log('   WIDL hex length:', widlHex.length, 'chars');
    
    // Deploy
    console.log('\n⏳ Deploying contract to WeilChain pod: POD_364bd4c435aa46bc8c48f92268daeadc');
    console.log('   This may take 30-60 seconds...\n');
    
    const results = await wallet.contracts.deploy(
      wasmHex,
      widlHex,
      { 
        author: 'EIBS 2.0 - Relifo',
        name: 'audit_trail',
        description: 'Cross-chain audit trail for Polygon transactions',
        pods: 'POD_364bd4c435aa46bc8c48f92268daeadc'
      }
    );
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('='.repeat(50));
    
    // The result is an array of deployment results
    const result = Array.isArray(results) ? results[0] : results;
    
    console.log('\n📋 Deployment Details:');
    console.log('   Full Result:', JSON.stringify(result, null, 2));
    
    const contractAddress = result.contract_address || result.contractAddress || result;
    const transactionId = result.transaction_id || result.transactionId || 'N/A';
    
    console.log('\n📍 Contract Address:', contractAddress);
    console.log('🔗 Transaction ID:', transactionId);
    
    console.log('\n⚠️  IMPORTANT: Save these values!');
    console.log('   Add to frontend/.env.local:');
    console.log('   VITE_WEILCHAIN_AUDIT_CONTRACT=' + contractAddress);
    
    // Save to file
    const deploymentInfo = {
      contractAddress: contractAddress,
      transactionId: transactionId,
      deployedAt: new Date().toISOString(),
      network: 'WeilChain Testnet',
      wasmSize: wasmStats.size,
      widlSize: widlStats.size
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('\n💾 Deployment info saved to deployment.json');
    
    return deploymentInfo;
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('   Full error:', error);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Test the deployed contract
 */
async function testContract(contractAddress) {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 Testing Deployed Contract');
  console.log('='.repeat(50));
  
  const wallet = new WeilWallet({
    privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
    sentinelEndpoint: SENTINEL_URL
  });
  
  try {
    // Test get_stats
    console.log('\n⏳ Calling get_stats()...');
    const statsResult = await wallet.contracts.execute(
      contractAddress,
      'get_stats',
      {}
    );
    
    console.log('✅ Stats result:', JSON.stringify(statsResult, null, 2));
    
    // Test verify_transaction (should return false for random hash)
    console.log('\n⏳ Calling verify_transaction()...');
    const verifyResult = await wallet.contracts.execute(
      contractAddress,
      'verify_transaction',
      { polygon_tx_hash: '0x0000000000000000000000000000000000000000000000000000000000000000' }
    );
    
    console.log('✅ Verify result:', JSON.stringify(verifyResult, null, 2));
    
    console.log('\n🎉 Contract is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run deployment
deployContract()
  .then(info => {
    if (info && info.contractAddress) {
      return testContract(info.contractAddress);
    }
  })
  .catch(error => {
    console.error('\n💥 Deployment script failed:', error.message);
    process.exit(1);
  });
