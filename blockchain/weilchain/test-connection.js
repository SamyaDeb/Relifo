/**
 * Test WeilChain Connection
 * 
 * Verifies that the wallet and sentinel connection work.
 */

const { WeilWallet } = require('@weilliptic/weil-sdk');

const SENTINEL_URL = 'https://sentinel.unweil.me';
const PRIVATE_KEY = 'ba9b62186e52bd8c831a3850a3c639d0f0ca109e56956160c274bdf124b0a5f4';

async function testConnection() {
  console.log('🔗 Testing WeilChain Connection\n');
  console.log('='.repeat(50));
  
  try {
    // Create wallet
    const wallet = new WeilWallet({
      privateKey: PRIVATE_KEY,
      sentinelEndpoint: SENTINEL_URL
    });
    
    console.log('✅ Wallet created successfully');
    console.log('🌐 Sentinel URL:', SENTINEL_URL);
    
    // Test pod listing to verify connection
    console.log('\n⏳ Testing sentinel connection by listing pods...');
    
    const pods = await wallet.pods.list();
    console.log('✅ Connected to WeilChain!');
    console.log('📊 Total Pods found:', pods.length);
    
    if (pods.length > 0) {
      console.log('\n📋 Available Pods:');
      pods.forEach((pod, i) => {
        console.log(`   ${i + 1}. ${pod.podId}`);
        console.log(`      Active Nodes: ${pod.activeNodes.length}`);
      });
    }
    
    // Find SENATE pod
    const senatePods = await wallet.pods.listSenate();
    if (senatePods.length > 0) {
      console.log('\n🏛️  SENATE Pod:', senatePods[0].podId);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 WeilChain connection test PASSED!');
    console.log('='.repeat(50));
    
    console.log('\n📋 Your Wallet Info:');
    console.log('   Private Key: ba9b62...b0a5f4 (hidden for security)');
    console.log('   Network: WeilChain Testnet');
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. You need WADK (WeilChain Application Development Kit) to compile the contract');
    console.log('   2. Contact WeilChain team or check their docs for WADK installation');
    console.log('   3. Once you have WADK, run the compile command from the docs');
    console.log('   4. Then run: node deploy-contract.js');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testConnection();
