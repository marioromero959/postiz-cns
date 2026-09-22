import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';

/** CNS: Solana wallet auth disabled. */
@AuthProvider({ provider: 'WALLET' })
export class WalletProvider extends AuthProviderAbstract {
  async generateLink(_params?: { publicKey?: string }) {
    return;
  }

  async getToken(_code: string, _redirectUri?: string) {
    return '';
  }

  async getUser(_providerToken: string) {
    return {
      id: '',
      email: '',
    };
  }
}
