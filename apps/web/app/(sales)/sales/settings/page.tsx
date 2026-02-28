'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Loader2,
  Save,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { toast } from 'sonner';

interface PaymentSettings {
  name: string | null;
  email: string | null;
  phone: string | null;
  payment_cashapp: string | null;
  payment_venmo: string | null;
  payment_zelle: string | null;
  payment_applepay: string | null;
  payment_cashapp_enabled: boolean;
  payment_venmo_enabled: boolean;
  payment_zelle_enabled: boolean;
  payment_applepay_enabled: boolean;
}

interface PaymentMethod {
  key: 'cashapp' | 'venmo' | 'zelle' | 'applepay';
  label: string;
  placeholder: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { key: 'cashapp', label: 'Cash App', placeholder: '$cashtag', icon: '💵', color: 'bg-green-600' },
  { key: 'venmo', label: 'Venmo', placeholder: '@username', icon: '💙', color: 'bg-blue-600' },
  { key: 'applepay', label: 'Apple Pay', placeholder: 'Phone or email', icon: '🍎', color: 'bg-gray-700' },
  { key: 'zelle', label: 'Zelle', placeholder: 'Phone or email', icon: '💜', color: 'bg-purple-600', comingSoon: true },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [form, setForm] = useState({
    payment_cashapp: '',
    payment_venmo: '',
    payment_zelle: '',
    payment_applepay: '',
    payment_cashapp_enabled: false,
    payment_venmo_enabled: false,
    payment_zelle_enabled: false,
    payment_applepay_enabled: false,
  });

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/sales/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(data.settings);
            setForm({
              payment_cashapp: data.settings.payment_cashapp || '',
              payment_venmo: data.settings.payment_venmo || '',
              payment_zelle: data.settings.payment_zelle || '',
              payment_applepay: data.settings.payment_applepay || '',
              payment_cashapp_enabled: data.settings.payment_cashapp_enabled || false,
              payment_venmo_enabled: data.settings.payment_venmo_enabled || false,
              payment_zelle_enabled: data.settings.payment_zelle_enabled || false,
              payment_applepay_enabled: data.settings.payment_applepay_enabled || false,
            });
          }
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetch_();
  }, []);

  const handleToggle = (key: PaymentMethod['key']) => {
    const enabledKey = `payment_${key}_enabled` as keyof typeof form;
    setForm((prev) => ({
      ...prev,
      [enabledKey]: !prev[enabledKey],
    }));
  };

  const handleDetailChange = (key: PaymentMethod['key'], value: string) => {
    setForm((prev) => ({
      ...prev,
      [`payment_${key}`]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/sales/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();
      setSettings(data.settings);
      toast.success('Payment settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-tastelanc-accent" />
            Settings
          </h1>
          <p className="text-gray-400 mt-1">Payment methods and preferences</p>
        </div>
      </div>

      {/* Rep Info */}
      {settings && (
        <Card className="p-4 mb-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Info</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-500">Name</span>
              <p className="text-sm text-white">{settings.name || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Email</span>
              <p className="text-sm text-white">{settings.email || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Phone</span>
              <p className="text-sm text-white">{settings.phone || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Methods */}
      <Card className="p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-tastelanc-accent" />
          <h3 className="text-sm font-semibold text-white">Payment Methods</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Enable the payment methods you accept. Commission payouts are sent via your preferred method.
        </p>

        <div className="space-y-4">
          {PAYMENT_METHODS.map((method) => {
            const enabledKey = `payment_${method.key}_enabled` as keyof typeof form;
            const detailKey = `payment_${method.key}` as keyof typeof form;
            const isEnabled = form[enabledKey] as boolean;
            const detail = form[detailKey] as string;

            return (
              <div
                key={method.key}
                className={`p-4 rounded-lg border transition-colors ${
                  isEnabled
                    ? 'border-tastelanc-accent bg-tastelanc-accent/5'
                    : 'border-tastelanc-surface-light bg-tastelanc-bg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <span className="text-sm font-medium text-white">{method.label}</span>
                      {method.comingSoon && (
                        <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(method.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-tastelanc-accent' : 'bg-tastelanc-surface-light'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isEnabled && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={detail}
                      onChange={(e) => handleDetailChange(method.key, e.target.value)}
                      placeholder={method.placeholder}
                      className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
