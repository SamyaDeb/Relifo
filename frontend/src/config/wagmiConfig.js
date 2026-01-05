import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';

// Alchemy RPC with fallback RPCs
const RPC_URLS = [
  'https://polygon-amoy.g.alchemy.com/v2/cLU2TJhufqp-aIR2sXjXt',  // Alchemy (Primary - Best)
  'https://rpc-amoy.polygon.technology',                           // Official Polygon (Fallback 1)
  'https://polygon-amoy-bor-rpc.publicnode.com',                   // PublicNode (Fallback 2)
];

// Define Polygon Amoy with Official RPC
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
      http: RPC_URLS,
    },
    public: {
      http: RPC_URLS,
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
    // Use official Polygon RPC with fallback and retry logic
    [customPolygonAmoy.id]: http(RPC_URLS[0], {
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
