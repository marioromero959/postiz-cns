'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

export type AdsProviderConfig = {
  enabled: boolean;
  accountId: string;
  accountName: string;
  notes: string;
  customerId?: string;
  developerToken?: string;
  adAccountId?: string;
  businessId?: string;
  pixelId?: string;
};

export type AdsClientSettings = {
  google: AdsProviderConfig;
  meta: AdsProviderConfig;
  instagram: AdsProviderConfig;
};

export type AdsSettingsFile = {
  /** Ads config keyed by channel-group (customer) id */
  byCustomer: Record<string, AdsClientSettings>;
};

type CustomerGroup = {
  id: string;
  name: string;
  integrations?: Array<{ id: string; name: string; identifier?: string }>;
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

const emptyClient = (): AdsClientSettings => ({
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
        <span className="opacity-80">Notas</span>
        <textarea
          className="bg-newBgColorInner border border-fifth rounded-[6px] px-3 py-2 outline-none min-h-[80px]"
          value={value.notes}
          placeholder="Ej: Campaña awareness Q2"
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
  const [file, setFile] = useState<AdsSettingsFile>({ byCustomer: {} });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    return (await fetch('/integrations/customers')).json();
  }, [fetch]);

  const loadIntegrations = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, [fetch]);

  const { data: customers, isLoading: loadingCustomers } = useSWR<
    CustomerGroup[]
  >('/integrations/customers', loadCustomers);

  const { data: integrations } = useSWR('/integrations/list-ads', loadIntegrations);

  const channelsForClient = useMemo(() => {
    if (!selectedCustomerId || !integrations) return [];
    return (integrations as any[]).filter(
      (i) => i.customer?.id === selectedCustomerId
    );
  }, [integrations, selectedCustomerId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/ads-settings');
      if (res.ok) {
        const data = await res.json();
        // Migrate legacy flat { google, meta, instagram } → byCustomer
        if (data?.byCustomer && typeof data.byCustomer === 'object') {
          setFile({ byCustomer: data.byCustomer });
        } else if (data?.google || data?.meta || data?.instagram) {
          setFile({ byCustomer: {} });
        } else {
          setFile({ byCustomer: {} });
        }
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

  useEffect(() => {
    if (!selectedCustomerId && customers?.length) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers?.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const clientSettings: AdsClientSettings = useMemo(() => {
    const existing = file.byCustomer[selectedCustomerId];
    if (!existing) return emptyClient();
    return {
      google: { ...emptyProvider(), ...existing.google },
      meta: { ...emptyProvider(), ...existing.meta },
      instagram: { ...emptyProvider(), ...existing.instagram },
    };
  }, [file, selectedCustomerId]);

  const updateClient = (patch: Partial<AdsClientSettings>) => {
    if (!selectedCustomerId) return;
    setFile((prev) => ({
      byCustomer: {
        ...prev.byCustomer,
        [selectedCustomerId]: {
          ...emptyClient(),
          ...prev.byCustomer[selectedCustomerId],
          ...patch,
        },
      },
    }));
  };

  const save = async () => {
    if (!selectedCustomerId) {
      toast.show(t('select_client', 'Selecciona un cliente'), 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/ads-settings', {
        method: 'POST',
        body: JSON.stringify(file),
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

  if (loading || loadingCustomers) {
    return <div className="p-6 opacity-70">Cargando Ads…</div>;
  }

  return (
    <div className="flex flex-col gap-[20px] p-[20px] max-w-[1100px]">
      <div>
        <h2 className="text-[24px] font-semibold">
          {t('ads_by_client', 'Ads por cliente')}
        </h2>
        <p className="text-sm opacity-70 mt-2 max-w-[720px]">
          {t(
            'ads_by_client_desc',
            'Cada cliente es un grupo de canales (los mismos grupos de Canales). Configurá Google, Meta e Instagram Ads por cliente.'
          )}
        </p>
      </div>

      {!customers?.length ? (
        <div className="border border-fifth rounded-[8px] p-[20px] text-sm opacity-80">
          {t(
            'ads_no_clients',
            'Todavía no hay grupos de clientes. Creá un grupo en Canales y asigná canales.'
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-[8px] max-w-[420px]">
            <label className="text-[13px] font-semibold">
              {t('client', 'Cliente')}
            </label>
            <select
              className="bg-newBgColorInner border border-fifth rounded-[6px] px-3 py-2 outline-none"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {channelsForClient.length > 0 && (
              <div className="flex flex-wrap gap-[6px]">
                {channelsForClient.map((ch: any) => (
                  <span
                    key={ch.id}
                    className={clsx(
                      'text-[11px] px-[8px] py-[4px] rounded-full bg-newColColor border border-newTableBorder'
                    )}
                  >
                    {ch.name}
                    {ch.identifier || ch.providerIdentifier
                      ? ` · ${ch.identifier || ch.providerIdentifier}`
                      : ''}
                  </span>
                ))}
              </div>
            )}

          <ProviderCard
            title="Google Ads"
            subtitle={`Campañas Search, Display, YouTube — ${selectedCustomer?.name || ''}`}
            managerUrl="https://ads.google.com/"
            value={clientSettings.google}
            onChange={(google) => updateClient({ google })}
            fields={[
              {
                key: 'accountName',
                label: 'Nombre de la cuenta',
                placeholder: `${selectedCustomer?.name || 'Cliente'} — Google Ads`,
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
            subtitle={`Ads Manager — ${selectedCustomer?.name || ''}`}
            managerUrl="https://business.facebook.com/adsmanager/"
            value={clientSettings.meta}
            onChange={(meta) => updateClient({ meta })}
            fields={[
              {
                key: 'accountName',
                label: 'Nombre',
                placeholder: `${selectedCustomer?.name || 'Cliente'} — Meta Ads`,
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
            subtitle={`Placements IG vía Meta Ads — ${selectedCustomer?.name || ''}`}
            managerUrl="https://business.facebook.com/adsmanager/"
            value={clientSettings.instagram}
            onChange={(instagram) => updateClient({ instagram })}
            fields={[
              {
                key: 'accountName',
                label: 'Nombre / marca',
                placeholder: selectedCustomer?.name || 'marca',
              },
              {
                key: 'adAccountId',
                label: 'Ad Account ID (mismo que Meta)',
                placeholder: 'act_1234567890',
              },
              {
                key: 'accountId',
                label: 'Instagram Business Account ID',
                placeholder: 'Desde Graph API',
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
              {t('save_client_ads', 'Guardar Ads del cliente')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
