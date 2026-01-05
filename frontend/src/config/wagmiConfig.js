import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';

// Use only Infura RPC
const INFURA_RPC = 'https://polygon-amoy.infura.io/v3/a58ad7faa33f46e595aa0cc376f22dc1';

// Define Polygon Amoy with Infura RPC
const customPolygonAmoy = {
  ...polygonAmoy,
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [INFURA_RPC],
    },
    public: {
      http: [INFURA_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://amoy.polygonscan.com',
    },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'Relifo',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [customPolygonAmoy],
  transports: {
    // Use Infura RPC with retry logic
    [customPolygonAmoy.id]: http(INFURA_RPC, {
      batch: false, // Disable batching to avoid RPC errors
      retryCount: 5, // Retry failed requests 5 times
      retryDelay: 200, // Wait 200ms between retries
      timeout: 20000, // 20 second timeout for slow testnets
    }),
  },
  ssr: false,
});

// Export the chain for use in other files
export { customPolygonAmoy };
