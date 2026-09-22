import { AdsSettingsComponent } from '@gitroom/frontend/components/ads/ads.settings.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ads — Postiz CNS',
  description: 'Configuración de Google Ads, Meta Ads e Instagram Ads',
};

export default async function AdsPage() {
  return <AdsSettingsComponent />;
}
