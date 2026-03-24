'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Badge } from '@/components/ui';
import {
  Users,
  Smartphone,
  Activity,
  Mail,
  Download,
  Search,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Send,
  Eye,
} from 'lucide-react';

interface PlatformContact {
  id: string;
  email: string;
  name: string | null;
  source_label: string;
  market_id: string | null;
  market_name: string | null;
  is_unsubscribed: boolean;
  created_at: string;
  has_app: boolean;
  is_signed_in: boolean;
}

interface PlatformStats {
  total: number;
  withApp: number;
  signedIn: number;
  subscribed: number;
}

interface PlatformCampaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  audience_source: string | null;
  audience_market_id: string | null;
  market_name: string | null;
  status: string;
  recipient_count: number;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}

const MARKET_OPTIONS = [
  { value: '', label: 'All Markets' },
  { value: 'f7e72800-3d4c-4f68-af22-40b1d52dc2e5', label: 'Lancaster County' },
  { value: '0602afe2-fae2-4e46-af2c-7b374bfc9d45', label: 'Cumberland County' },
  { value: 'c7b79d18-0bb6-434d-926a-0f8cdf420acb', label: 'Fayetteville' },
];

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [sourceLabel, setSourceLabel] = useState('');
  const [marketId, setMarketId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file || !sourceLabel.trim()) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_label', sourceLabel.trim());
    if (marketId) formData.append('market_id', marketId);

    try {
      const res = await fetch('/api/admin/platform-contacts/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data);
        onImported();
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-tastelanc-surface rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-tastelanc-accent" />
            <h3 className="text-lg font-bold text-tastelanc-text-primary">Import Contact List</h3>
          </div>
          <button onClick={onClose} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-tastelanc-text-primary font-bold text-lg mb-1">{result.imported} contacts imported</p>
            {result.skipped > 0 && (
              <p className="text-tastelanc-text-faint text-sm">{result.skipped} rows skipped (invalid email)</p>
            )}
            <button
              onClick={onClose}
              className="mt-6 w-full py-2 bg-tastelanc-accent text-black font-medium rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-tastelanc-text-muted mb-1">
                Source Label <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Partner Business Name"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                className="w-full px-3 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
              />
              <p className="text-tastelanc-text-faint text-xs mt-1">Who provided this list?</p>
            </div>

            <div>
              <label className="block text-sm text-tastelanc-text-muted mb-1">Market (optional)</label>
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="w-full px-3 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
              >
                {MARKET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-tastelanc-text-muted mb-1">
                CSV File <span className="text-red-400">*</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-tastelanc-surface-light rounded-xl p-4 text-center cursor-pointer hover:border-tastelanc-accent/50 transition-colors"
              >
                {file ? (
                  <p className="text-tastelanc-text-primary text-sm">{file.name}</p>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-tastelanc-text-faint mx-auto mb-1" />
                    <p className="text-tastelanc-text-muted text-sm">Click to select CSV</p>
                    <p className="text-tastelanc-text-faint text-xs mt-1">Must have an &quot;email&quot; column. Name column optional.</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || !sourceLabel.trim() || isUploading}
              className="w-full py-3 bg-tastelanc-accent hover:bg-tastelanc-accent/90 text-black font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : (
                'Import Contacts'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Platform Contacts Tab ────────────────────────────────────────────────────

export default function PlatformContactsTab() {
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [campaigns, setCampaigns] = useState<PlatformCampaign[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<PlatformCampaign | null>(null);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (sourceFilter) params.set('source', sourceFilter);
      const res = await fetch(`/api/admin/platform-contacts?${params.toString()}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setStats(data.stats || null);
      setSources(data.sources || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching platform contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, sourceFilter]);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/admin/platform-campaigns');
    const data = await res.json();
    setCampaigns((data.campaigns || []).map((c: PlatformCampaign & { market?: { name: string } }) => ({
      ...c,
      market_name: c.market?.name || null,
    })));
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchCampaigns();
  }, [fetchContacts, fetchCampaigns]);

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (sourceFilter) params.set('source', sourceFilter);
    window.open(`/api/admin/platform-contacts?${params.toString()}`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-tastelanc-text-primary">Platform Contacts</h2>
          <p className="text-tastelanc-text-muted text-sm mt-0.5">
            TasteLanc&apos;s master contact list — direct uploads + all restaurant uploads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-tastelanc-accent/20 rounded-lg text-tastelanc-accent hover:bg-tastelanc-accent/30 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 bg-tastelanc-accent rounded-lg text-black font-medium hover:bg-tastelanc-accent/90 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
          <Card className="p-4 md:p-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{stats.total}</p>
            <p className="text-tastelanc-text-muted text-xs mt-0.5">Total Contacts</p>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
              <Smartphone className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{stats.withApp}</p>
            <p className="text-tastelanc-text-muted text-xs mt-0.5">
              Have the App
              {stats.total > 0 && (
                <span className="ml-1 text-tastelanc-text-faint">
                  ({Math.round((stats.withApp / stats.total) * 100)}%)
                </span>
              )}
            </p>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{stats.signedIn}</p>
            <p className="text-tastelanc-text-muted text-xs mt-0.5">Signed In</p>
          </Card>
          <Card className="p-4 md:p-6">
            <div className="w-8 h-8 bg-tastelanc-accent/20 rounded-lg flex items-center justify-center mb-3">
              <Activity className="w-4 h-4 text-tastelanc-accent" />
            </div>
            <p className="text-2xl font-bold text-tastelanc-text-primary">{stats.subscribed}</p>
            <p className="text-tastelanc-text-muted text-xs mt-0.5">Subscribed</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchContacts()}
            className="w-full pl-9 pr-4 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
          />
        </div>
        {sources.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
          >
            <option value="">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="p-4 md:p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-tastelanc-text-primary">All Contacts</h3>
            <Badge variant="default">{total}</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-tastelanc-accent mx-auto mb-4 animate-spin" />
            <p className="text-tastelanc-text-muted">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
            <h3 className="text-lg font-medium text-tastelanc-text-primary mb-2">No contacts yet</h3>
            <p className="text-tastelanc-text-muted text-sm mb-4">
              Import a CSV to add your first contacts, or they&apos;ll appear automatically when restaurants upload their lists.
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-tastelanc-accent text-black font-medium rounded-lg text-sm"
            >
              Import CSV
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tastelanc-surface-light">
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Contact</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Source</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Has App</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Added</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30"
                  >
                    <td className="py-3 px-6">
                      <p className="text-tastelanc-text-primary font-medium text-sm">{c.name || c.email}</p>
                      {c.name && <p className="text-tastelanc-text-faint text-xs">{c.email}</p>}
                    </td>
                    <td className="py-3 px-6">
                      <span className="text-tastelanc-text-muted text-sm">{c.source_label}</span>
                      {c.market_name && (
                        <span className="ml-2 text-tastelanc-text-faint text-xs">· {c.market_name}</span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      {c.has_app ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Yes {c.is_signed_in ? '· Signed In' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tastelanc-surface-light text-tastelanc-text-faint">
                          Not yet
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      {c.is_unsubscribed ? (
                        <span className="text-red-400 text-xs">Unsubscribed</span>
                      ) : (
                        <span className="text-tastelanc-text-faint text-xs">Subscribed</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-tastelanc-text-faint text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <Card className="overflow-hidden mt-6">
          <div className="p-4 md:p-6 border-b border-tastelanc-surface-light">
            <h3 className="text-base font-semibold text-tastelanc-text-primary">Email Campaigns</h3>
            <p className="text-tastelanc-text-muted text-sm mt-0.5">Draft and sent campaigns for your platform contacts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tastelanc-surface-light">
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Campaign</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Audience</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-6 text-tastelanc-text-muted font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30">
                    <td className="py-3 px-6">
                      <p className="text-tastelanc-text-primary font-medium text-sm">{c.name}</p>
                      <p className="text-tastelanc-text-faint text-xs">{c.subject}</p>
                    </td>
                    <td className="py-3 px-6 text-tastelanc-text-muted text-sm">
                      {c.audience_source || 'All Contacts'}
                      {c.market_name && <span className="text-tastelanc-text-faint text-xs ml-1">· {c.market_name}</span>}
                    </td>
                    <td className="py-3 px-6">
                      {c.status === 'draft' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Draft</span>
                      ) : c.status === 'sent' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Sent</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tastelanc-surface-light text-tastelanc-text-faint">{c.status}</span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewCampaign(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-surface-light text-tastelanc-text-muted rounded-lg text-xs hover:text-tastelanc-text-primary transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                        {c.status === 'draft' && (
                          <button
                            disabled
                            title="Coming soon — send when ready"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-accent/20 text-tastelanc-accent rounded-lg text-xs opacity-50 cursor-not-allowed"
                          >
                            <Send className="w-3 h-3" />
                            Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Campaign Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-tastelanc-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-tastelanc-surface-light">
              <div>
                <h3 className="text-base font-bold text-tastelanc-text-primary">{previewCampaign.name}</h3>
                <p className="text-tastelanc-text-faint text-xs mt-0.5">Email preview</p>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-tastelanc-text-faint text-xs uppercase tracking-wide mb-1">Subject</p>
                <p className="text-tastelanc-text-primary font-medium">{previewCampaign.subject}</p>
              </div>
              {previewCampaign.preview_text && (
                <div>
                  <p className="text-tastelanc-text-faint text-xs uppercase tracking-wide mb-1">Preview text</p>
                  <p className="text-tastelanc-text-muted text-sm">{previewCampaign.preview_text}</p>
                </div>
              )}
              <div>
                <p className="text-tastelanc-text-faint text-xs uppercase tracking-wide mb-1">Body</p>
                <div className="bg-tastelanc-surface-light rounded-lg p-4">
                  {previewCampaign.body.split('\n').map((line, i) => (
                    <p key={i} className="text-tastelanc-text-primary text-sm mb-2 last:mb-0">{line || <>&nbsp;</>}</p>
                  ))}
                </div>
              </div>
              {previewCampaign.cta_text && (
                <div>
                  <p className="text-tastelanc-text-faint text-xs uppercase tracking-wide mb-1">Call to action</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent/20 text-tastelanc-accent rounded-lg text-sm font-medium">
                    {previewCampaign.cta_text}
                  </div>
                  {previewCampaign.cta_url && (
                    <p className="text-tastelanc-text-faint text-xs mt-1">{previewCampaign.cta_url}</p>
                  )}
                </div>
              )}
              <div className="pt-2 border-t border-tastelanc-surface-light">
                <p className="text-tastelanc-text-faint text-xs">
                  Audience: <span className="text-tastelanc-text-muted">{previewCampaign.audience_source || 'All platform contacts'}</span>
                  {previewCampaign.market_name && <span> · {previewCampaign.market_name}</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}
