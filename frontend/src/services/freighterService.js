import * as freighterApi from '@stellar/freighter-api';

export const freighterService = {
  // Check if Freighter is installed
  async isInstalled() {
    try {
      const result = await freighterApi.isConnected();
      return result.isConnected;
    } catch (error) {
      console.error('Error checking Freighter installation:', error);
      return false;
    }
  },

  // Request permission to connect
  async requestAccess() {
    try {
      const result = await freighterApi.requestAccess();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.address;
    } catch (error) {
      console.error('Error requesting access:', error);
      throw new Error('Failed to get wallet permission');
    }
  },

  // Get user's public key
  async getPublicKey() {
    try {
      const result = await freighterApi.getAddress();
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('📍 Freighter returned public key:', result.address);
      return result.address;
    } catch (error) {
      console.error('❌ Error getting public key:', error);
      if (error.message && error.message.includes('User declined')) {
        throw new Error('You cancelled the wallet connection');
      }
      if (error.message && error.message.includes('not installed')) {
        throw new Error('Freighter wallet not installed');
      }
      throw new Error('Failed to connect wallet: ' + error.message);
    }
  },

  // Get network info
  async getNetwork() {
    try {
      const result = await freighterApi.getNetwork();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error('Error getting network:', error);
      return null;
    }
  },

  // Sign transaction
  async signTransaction(xdr, network = 'TESTNET') {
    try {
      const networkPassphrase = network === 'TESTNET' 
        ? 'Test SDF Network ; September 2015'
        : 'Public Global Stellar Network ; September 2015';

      const result = await freighterApi.signTransaction(xdr, {
        networkPassphrase: networkPassphrase
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result.signedTxXdr;
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw new Error('Failed to sign transaction');
    }
  },

  // Check connection status
  async checkConnection() {
    const installed = await this.isInstalled();
    
    if (!installed) {
      return {
        connected: false,
        error: 'Freighter wallet not installed'
      };
    }

    try {
      const allowedResult = await freighterApi.isAllowed();
      
      if (!allowedResult.isAllowed) {
        return {
          connected: false,
          error: 'Permission not granted'
        };
      }

      const publicKey = await this.getPublicKey();
      
      return {
        connected: true,
        publicKey
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
};
