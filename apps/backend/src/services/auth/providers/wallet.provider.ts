import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';

/** CNS: Solana wallet auth disabled. */
@AuthProvider({ provider: 'WALLET' })
export class WalletProvider extends AuthProviderAbstract {
  generateLink(_query?: any): string {
    return '';
  }

  async getToken(_code: string, _redirectUri?: string): Promise<string> {
    return '';
  }

  async getUser(_providerToken: string): Promise<{ email: string; id: string }> {
    return {
      id: '',
      email: '',
    };
  }
}
