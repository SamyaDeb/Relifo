/**
 * Phase 5.1: Test POL to USDC Swap via Uniswap
 */

const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const USDC_ADDRESS = '0xBc03f5c495d594304052824924461A24fa6d4163';
const SWAP_ADDRESS = '0x8ec5e071B3688bd53913C9FE6BCdD175138782C4';

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const SWAP_ABI = [
  'function swapPOLtoUSDC() payable returns (uint256)',
  'function getEstimatedUSDCOut(uint256) view returns (uint256)'
];

async function testPOLSwap() {
  console.log('\n🧪 Testing POL → USDC Swap\n');
  console.log('='.repeat(70));
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`\nWallet: ${wallet.address}`);
  
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
  const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);
  
  // Check balances before
  const polBefore = await provider.getBalance(wallet.address);
  const usdcBefore = await usdc.balanceOf(wallet.address);
  
  console.log(`\n📊 Balances Before:`);
  console.log(`  POL: ${ethers.formatEther(polBefore)}`);
  console.log(`  USDC: ${ethers.formatUnits(usdcBefore, 6)}`);
  
  // Get estimate
  const polAmount = ethers.parseEther('0.1'); // 0.1 POL
  console.log(`\n💰 Swapping: ${ethers.formatEther(polAmount)} POL`);
  
  try {
    const estimatedUSDC = await swap.getEstimatedUSDCOut(polAmount);
    console.log(`📈 Estimated USDC: ${ethers.formatUnits(estimatedUSDC, 6)} USDC`);
    
    console.log(`\n⏳ Executing swap...`);
    const tx = await swap.swapPOLtoUSDC({ value: polAmount });
    console.log(`Transaction: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
    
    // Check balances after
    await new Promise(r => setTimeout(r, 3000));
    const polAfter = await provider.getBalance(wallet.address);
    const usdcAfter = await usdc.balanceOf(wallet.address);
    
    console.log(`\n📊 Balances After:`);
    console.log(`  POL: ${ethers.formatEther(polAfter)}`);
    console.log(`  USDC: ${ethers.formatUnits(usdcAfter, 6)}`);
    
    const usdcReceived = usdcAfter - usdcBefore;
    console.log(`\n✨ USDC Received: ${ethers.formatUnits(usdcReceived, 6)} USDC`);
    
    if (usdcReceived > 0) {
      console.log('\n🎉 POL → USDC SWAP WORKING!');
    } else {
      console.log('\n❌ No USDC received');
    }
    
  } catch (error) {
    console.error('\n❌ Swap failed:', error.message);
    
    if (error.message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
      console.log('\n⚠️  This may be due to low liquidity in Uniswap pool on Amoy testnet');
      console.log('💡 Recommendation: Use USDC faucet for testing instead');
    }
  }
  
  console.log('\n');
}

testPOLSwap().catch(console.error);
