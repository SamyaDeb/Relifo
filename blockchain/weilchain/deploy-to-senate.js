const { WeilWallet } = require('@weilliptic/weil-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const PRIVATE_KEY = 'ba9b62186e52bd8c831a3850a3c639d0f0ca109e56956160c274bdf124b0a5f4';
const SENTINEL_URL = 'https://sentinel.unweil.me';
const WASM_PATH = path.join(__dirname, 'wasm', 'audit_trail.wasm');
const DEPLOYMENT_FILE = path.join(__dirname, 'deployment.json');
const ENV_FILE = path.join(__dirname, '../../frontend/.env.local');

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_DELAY = 5000; // 5 seconds
const MAX_DELAY = 60000; // 60 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deployWithRetry() {
  console.log('🚀 Starting WeilChain Contract Deployment');
  console.log('=' .repeat(60));
  console.log('Target: SENATE Pod');
  console.log('Sentinel:', SENTINEL_URL);
  console.log('WASM File:', WASM_PATH);
  console.log('=' .repeat(60));

  // Check if WASM file exists
  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(`WASM file not found: ${WASM_PATH}`);
  }

  const wasmSize = fs.statSync(WASM_PATH).size;
  console.log(`\n📦 WASM file size: ${(wasmSize / 1024).toFixed(2)} KB`);

  // Read WASM file
  const wasmBuffer = fs.readFileSync(WASM_PATH);
  const wasmBase64 = wasmBuffer.toString('base64');

  console.log('\n🔑 Initializing wallet...');
  const wallet = new WeilWallet({
    privateKey: PRIVATE_KEY,
    sentinelEndpoint: SENTINEL_URL
  });

  console.log('✅ Wallet initialized');
  console.log('📍 Wallet address:', wallet.publicKey);

  // Attempt deployment with exponential backoff
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`\n🎯 Deployment attempt ${attempt}/${MAX_RETRIES}...`);
      console.log('⏳ This may take 30-60 seconds...');

      const startTime = Date.now();

      // Deploy to SENATE pod
      const result = await wallet.contracts.deploy({
        wasm: wasmBase64,
        pods: 'SENATE', // Using SENATE pod instead of regional pod
        init_args: {}
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n⏱️  Deployment took ${duration} seconds`);

      // Check result
      if (result && result.contract_address) {
        console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY! 🎉');
        console.log('=' .repeat(60));
        console.log('Contract Address:', result.contract_address);
        console.log('Transaction Hash:', result.transaction_id || result.txn_hash || 'N/A');
        console.log('Status:', result.status || 'Finalized');
        console.log('=' .repeat(60));

        // Save deployment info
        const deploymentInfo = {
          contract_address: result.contract_address,
          transaction_hash: result.transaction_id || result.txn_hash,
          deployed_at: new Date().toISOString(),
          deployer: wallet.publicKey,
          pod: 'SENATE',
          wasm_size_kb: (wasmSize / 1024).toFixed(2),
          deployment_attempt: attempt,
          full_result: result
        };

        fs.writeFileSync(
          DEPLOYMENT_FILE,
          JSON.stringify(deploymentInfo, null, 2)
        );
        console.log('\n💾 Deployment info saved to:', DEPLOYMENT_FILE);

        // Update frontend .env.local
        await updateEnvFile(result.contract_address);

        return result;

      } else {
        throw new Error('Deployment succeeded but no contract address returned');
      }

    } catch (error) {
      lastError = error;
      const errorMsg = error.response?.data?.message || error.message;
      const errorStatus = error.response?.status;

      console.error(`\n❌ Attempt ${attempt} failed:`);
      console.error(`   Status: ${errorStatus || 'N/A'}`);
      console.error(`   Error: ${errorMsg}`);

      if (attempt < MAX_RETRIES) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          INITIAL_DELAY * Math.pow(2, attempt - 1),
          MAX_DELAY
        );
        console.log(`\n⏸️  Waiting ${(delay / 1000).toFixed(0)} seconds before retry...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  console.error('\n💥 DEPLOYMENT FAILED AFTER ALL RETRIES');
  console.error('=' .repeat(60));
  console.error('Last error:', lastError.message);
  if (lastError.response?.data) {
    console.error('Response data:', JSON.stringify(lastError.response.data, null, 2));
  }
  console.error('=' .repeat(60));
  
  console.log('\n📝 Troubleshooting suggestions:');
  console.log('1. Check WeilChain network status at https://www.unweil.me');
  console.log('2. Verify the SENATE pod is operational');
  console.log('3. Try again later if network is congested');
  console.log('4. Contact WeilChain support if issue persists');
  
  throw lastError;
}

async function updateEnvFile(contractAddress) {
  console.log('\n📝 Updating frontend .env.local...');
  
  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8');
  }

  const envVar = `VITE_WEILCHAIN_AUDIT_CONTRACT=${contractAddress}`;
  const envVarRegex = /^VITE_WEILCHAIN_AUDIT_CONTRACT=.*/m;

  if (envVarRegex.test(envContent)) {
    // Update existing entry
    envContent = envContent.replace(envVarRegex, envVar);
    console.log('   ✅ Updated existing VITE_WEILCHAIN_AUDIT_CONTRACT');
  } else {
    // Add new entry
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `\n# WeilChain Audit Trail Contract (deployed ${new Date().toISOString()})\n`;
    envContent += envVar + '\n';
    console.log('   ✅ Added VITE_WEILCHAIN_AUDIT_CONTRACT');
  }

  fs.writeFileSync(ENV_FILE, envContent);
  console.log('   💾 Saved to:', ENV_FILE);
}

// Run deployment
deployWithRetry()
  .then(() => {
    console.log('\n🏁 Deployment process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n🔴 Deployment process failed!');
    process.exit(1);
  });
