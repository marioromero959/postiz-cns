'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export type AdsProviderConfig = {
  enabled: boolean;
  accountId: string;
  accountName: string;
  notes: string;
  // Google Ads
  customerId?: string;
  developerToken?: string;
  // Meta / Instagram (Marketing API)
  adAccountId?: string;
  businessId?: string;
  pixelId?: string;
};

export type AdsSettings = {
  google: AdsProviderConfig;
  meta: AdsProviderConfig;
  instagram: AdsProviderConfig;
};

const emptyProvider = (): AdsProviderConfig => ({
  enabled: false,
  accountId: '',
  accountName: '',
  notes: '',
  customerId: '',
  developerToken: '',
  adAccountId: '',
  businessId: '',
  pixelId: '',
});

const defaultSettings = (): AdsSettings => ({
  google: emptyProvider(),
  meta: emptyProvider(),
  instagram: emptyProvider(),
});

function ProviderCard({
  title,
  subtitle,
  managerUrl,
  value,
  onChange,
  fields,
}: {
  title: string;
  subtitle: string;
  managerUrl: string;
  value: AdsProviderConfig;
  onChange: (next: AdsProviderConfig) => void;
  fields: Array<{
    key: keyof AdsProviderConfig;
    label: string;
    placeholder?: string;
  }>;
}) {
  return (
    <div className="border border-fifth rounded-[8px] bg-sixth p-[20px] flex flex-col gap-[14px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[18px] font-semibold">{title}</h3>
          <p className="text-sm opacity-70 mt-1">{subtitle}</p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          Activo
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
        {fields.map((f) => (
          <label key={String(f.key)} className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">{f.label}</span>
            <input
              className="bg-newBgColorInner border border-fifth rounded-[6px] px-3 py-2 outline-none"
              value={String(value[f.key] ?? '')}
              placeholder={f.placeholder}
              onChange={(e) =>
                onChange({ ...value, [f.key]: e.target.value } as AdsProviderConfig)
              }
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-80">Notas / cliente</span>
        <textarea
          className="bg-newBgColorInner border border-fifth rounded-[6px] px-3 py-2 outline-none min-h-[80px]"
          value={value.notes}
          placeholder="Ej: Cliente Óptica — campaña awareness Q2"
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </label>

      <a
        href={managerUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm underline opacity-80 hover:opacity-100 w-fit"
      >
        Abrir Ads Manager →
      </a>
    </div>
  );
}

export const AdsSettingsComponent = () => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const [settings, setSettings] = useState<AdsSettings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/ads-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          google: { ...emptyProvider(), ...(data.google || {}) },
          meta: { ...emptyProvider(), ...(data.meta || {}) },
          instagram: { ...emptyProvider(), ...(data.instagram || {}) },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/ads-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('save failed');
      toast.show(t('ads_saved', 'Configuración de Ads guardada'));
    } catch (e) {
      console.error(e);
      toast.show('No se pudo guardar', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 opacity-70">Cargando Ads…</div>;
  }

  return (
    <div className="flex flex-col gap-[20px] p-[20px] max-w-[1100px]">
      <div>
        <h2 className="text-[24px] font-semibold">Ads — Google, Meta e Instagram</h2>
        <p className="text-sm opacity-70 mt-2 max-w-[720px]">
          Configurá las cuentas publicitarias por plataforma. Postiz gestiona el
          contenido orgánico; acá guardás IDs y accesos para abrir Ads Manager y
          (próximo paso) crear campañas desde CNS.
        </p>
      </div>

      <ProviderCard
        title="Google Ads"
        subtitle="Campañas Search, Display, YouTube y Performance Max."
        managerUrl="https://ads.google.com/"
        value={settings.google}
        onChange={(google) => setSettings((s) => ({ ...s, google }))}
        fields={[
          {
            key: 'accountName',
            label: 'Nombre de la cuenta',
            placeholder: 'CNS — Google Ads',
          },
          {
            key: 'customerId',
            label: 'Customer ID (xxx-xxx-xxxx)',
            placeholder: '123-456-7890',
          },
          {
            key: 'developerToken',
            label: 'Developer Token (API)',
            placeholder: 'Opcional por ahora',
          },
          {
            key: 'accountId',
            label: 'Manager / MCC ID',
            placeholder: 'Si usás cuenta manager',
          },
        ]}
      />

      <ProviderCard
        title="Meta Ads (Facebook)"
        subtitle="Ads Manager de Facebook. Misma app Meta que usás para conectar Páginas."
        managerUrl="https://business.facebook.com/adsmanager/"
        value={settings.meta}
        onChange={(meta) => setSettings((s) => ({ ...s, meta }))}
        fields={[
          {
            key: 'accountName',
            label: 'Nombre',
            placeholder: 'CNS — Meta Ads',
          },
          {
            key: 'adAccountId',
            label: 'Ad Account ID (act_…)',
            placeholder: 'act_1234567890',
          },
          {
            key: 'businessId',
            label: 'Business Manager ID',
            placeholder: '1284526860426328',
          },
          {
            key: 'pixelId',
            label: 'Meta Pixel ID',
            placeholder: 'Opcional',
          },
        ]}
      />

      <ProviderCard
        title="Instagram Ads"
        subtitle="Las ads de Instagram se gestionan con la misma cuenta Meta Ads (placements IG)."
        managerUrl="https://business.facebook.com/adsmanager/"
        value={settings.instagram}
        onChange={(instagram) => setSettings((s) => ({ ...s, instagram }))}
        fields={[
          {
            key: 'accountName',
            label: 'Nombre / marca',
            placeholder: 'codigo.norte.soluciones',
          },
          {
            key: 'adAccountId',
            label: 'Ad Account ID (mismo que Meta)',
            placeholder: 'act_1234567890',
          },
          {
            key: 'accountId',
            label: 'Instagram Business Account ID',
            placeholder: 'Desde Graph API /me/accounts',
          },
          {
            key: 'businessId',
            label: 'Business Manager ID',
            placeholder: 'Opcional',
          },
        ]}
      />

      <div className="flex gap-3">
        <Button loading={saving} onClick={save}>
          Guardar configuración
        </Button>
      </div>
    </div>
  );
};
