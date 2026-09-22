'use client';

import type { ReactElement } from 'react';

/**
 * Solana wallet login removed in Postiz CNS — auth is Google/OAuth only.
 */
export default function WalletProvider(): ReactElement | null {
  return null;
}
