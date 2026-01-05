/**
 * Helper function to add/switch to Polygon Amoy network in MetaMask
 * Call this function when user encounters RPC issues
 */
export async function addPolygonAmoyNetwork() {
  if (!window.ethereum) {
    alert('MetaMask is not installed!');
    return false;
  }

  try {
    // First, try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13882' }], // 80002 in hex
    });
    console.log('✅ Switched to Polygon Amoy');
    return true;
  } catch (switchError) {
    // If network doesn't exist (error code 4902), add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x13882', // 80002 in hex
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: {
                name: 'POL',
                symbol: 'POL',
                decimals: 18,
              },
              rpcUrls: [
                'https://rpc-amoy.polygon.technology',
                'https://polygon-amoy.blockpi.network/v1/rpc/public',
                'https://polygon-amoy-bor-rpc.publicnode.com',
              ],
              blockExplorerUrls: ['https://amoy.polygonscan.com'],
            },
          ],
        });
        console.log('✅ Added and switched to Polygon Amoy');
        return true;
      } catch (addError) {
        console.error('❌ Failed to add network:', addError);
        alert('Failed to add Polygon Amoy network. Please add it manually in MetaMask.');
        return false;
      }
    } else {
      console.error('❌ Failed to switch network:', switchError);
      alert('Failed to switch to Polygon Amoy network.');
      return false;
    }
  }
}

/**
 * Update RPC URL for Polygon Amoy if user is experiencing connection issues
 */
export async function updatePolygonAmoyRPC() {
  if (!window.ethereum) {
    alert('MetaMask is not installed!');
    return false;
  }

  try {
    // Remove and re-add the network with updated RPC
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: '0x13882',
          chainName: 'Polygon Amoy Testnet',
          nativeCurrency: {
            name: 'POL',
            symbol: 'POL',
            decimals: 18,
          },
          rpcUrls: ['https://rpc-amoy.polygon.technology'],
          blockExplorerUrls: ['https://amoy.polygonscan.com'],
        },
      ],
    });
    
    console.log('✅ Updated Polygon Amoy RPC');
    alert('✅ RPC Updated!\n\nPolygon Amoy network has been updated with a fresh RPC endpoint.\n\nPlease try your transaction again.');
    return true;
  } catch (error) {
    console.error('❌ Failed to update RPC:', error);
    return false;
  }
}
