'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from '@/components/ui';
import {
  Users,
  UserCheck,
  Activity,
  Smartphone,
  RefreshCw,
  Loader2,
  Download,
  Eye,
  EyeOff,
  Search,
  Trophy,
  Mail,
  X,
  BookUser,
} from 'lucide-react';
import PlatformContactsTab from './PlatformContactsTab';

// ─── App Users types ────────────────────────────────────────────────────────

interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  last_seen_at: string | null;
  created_at: string;
  platform: string | null;
  app_slug: string | null;
  favorites_count: number;
  checkins_count: number;
  has_push_token: boolean;
}

interface Stats {
  total: number;
  signedIn: number;
  anonymous: number;
  withEmail: number;
  activeLast7: number;
  activeLast30: number;
  pushTokens: number;
  iosTokens: number;
  androidTokens: number;
}

// ─── Contact Lists types ─────────────────────────────────────────────────────

interface RestaurantContactSummary {
  restaurant_id: string;
  restaurant_name: string;
  market_id: string | null;
  total_contacts: number;
  with_app: number;
  signed_in: number;
  emailed: number;
}

interface ContactWithCrossRef {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  email: string;
  name: string | null;
  has_app: boolean;
  is_signed_in: boolean;
  has_push_token: boolean;
  emailed: boolean;
}

interface ContactStats {
  total_contacts: number;
  with_app: number;
  signed_in: number;
  emailed: number;
  restaurants: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

const APP_SLUG_LABELS: Record<string, string> = {
  tastelanc: 'Lancaster',
  'taste-cumberland': 'Cumberland',
  'taste-fayetteville': 'Fayetteville',
};

const MARKET_OPTIONS = [
  { value: '', label: 'All Markets' },
  { value: 'tastelanc', label: 'TasteLanc (Lancaster)' },
  { value: 'taste-cumberland', label: 'TasteCumberland' },
  { value: 'taste-fayetteville', label: 'TasteFayetteville' },
];

// ─── Winner Picker Modal ──────────────────────────────────────────────────────

function WinnerPickerModal({
  restaurant,
  contacts,
  onClose,
}: {
  restaurant: RestaurantContactSummary;
  contacts: ContactWithCrossRef[];
  onClose: () => void;
}) {
  const eligible = contacts.filter(
    (c) => c.restaurant_id === restaurant.restaurant_id && c.is_signed_in && c.has_push_token
  );
  const [winner, setWinner] = useState<ContactWithCrossRef | null>(null);
  const [drawn, setDrawn] = useState(false);

  const drawWinner = () => {
    if (eligible.length === 0) return;
    const idx = Math.floor(Math.random() * eligible.length);
    setWinner(eligible[idx]);
    setDrawn(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-tastelanc-surface rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-tastelanc-text-primary">Pick a Winner</h3>
          </div>
          <button onClick={onClose} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-tastelanc-text-muted text-sm mb-1">
          <span className="text-tastelanc-text-primary font-medium">{restaurant.restaurant_name}</span>
        </p>
        <p className="text-tastelanc-text-faint text-xs mb-6">
          {eligible.length} eligible entries — signed-in app users with push notifications enabled
        </p>

        {eligible.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-tastelanc-text-muted text-sm">
              No eligible entries yet. Contacts must be signed into the app with push notifications enabled.
            </p>
          </div>
        ) : !drawn ? (
          <button
            onClick={drawWinner}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
          >
            Draw Winner
          </button>
        ) : winner ? (
          <div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-tastelanc-text-primary font-bold text-lg">
                {winner.name || winner.email}
              </p>
              {winner.name && (
                <p className="text-tastelanc-text-muted text-sm">{winner.email}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={drawWinner}
                className="flex-1 py-2 bg-tastelanc-surface-light text-tastelanc-text-muted rounded-lg text-sm hover:text-tastelanc-text-primary transition-colors"
              >
                Re-draw
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-tastelanc-accent text-black font-medium rounded-lg text-sm hover:bg-tastelanc-accent/90 transition-colors"
              >
                Confirm Winner
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAppUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'contacts' | 'platform'>('users');

  // App Users state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    signedIn: 0,
    anonymous: 0,
    withEmail: 0,
    activeLast7: 0,
    activeLast30: 0,
    pushTokens: 0,
    iosTokens: 0,
    androidTokens: 0,
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [marketFilter, setMarketFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Contact Lists state
  const [contactSummaries, setContactSummaries] = useState<RestaurantContactSummary[]>([]);
  const [allContacts, setAllContacts] = useState<ContactWithCrossRef[]>([]);
  const [contactStats, setContactStats] = useState<ContactStats | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Winner picker state
  const [winnerRestaurant, setWinnerRestaurant] = useState<RestaurantContactSummary | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (marketFilter) params.set('market', marketFilter);
      if (searchQuery) params.set('search', searchQuery);
      const response = await fetch(`/api/admin/app-users?${params.toString()}`);
      const data = await response.json();
      setUsers(data.users || []);
      setStats(data.stats || {});
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching app users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [marketFilter, searchQuery]);

  const fetchContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch('/api/admin/app-users/contacts-crossref');
      const data = await response.json();
      setContactSummaries(data.restaurantSummaries || []);
      setAllContacts(data.contacts || []);
      setContactStats(data.stats || null);
      setContactsLoaded(true);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load contacts lazily when tab is first opened
  useEffect(() => {
    if (activeTab === 'contacts' && !contactsLoaded) {
      fetchContacts();
    }
  }, [activeTab, contactsLoaded, fetchContacts]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (marketFilter) params.set('market', marketFilter);
    window.open(`/api/admin/app-users?${params.toString()}`, '_blank');
  };

  const filteredUsers = users.filter((u) => {
    if (!showAnonymous && u.is_anonymous) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">Users & Contacts</h1>
          <p className="text-tastelanc-text-muted mt-1 text-sm md:text-base">
            App users, restaurant contact lists, and giveaway tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-tastelanc-accent/20 rounded-lg text-tastelanc-accent hover:bg-tastelanc-accent/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          {activeTab !== 'platform' && (
            <button
              onClick={activeTab === 'users' ? fetchUsers : fetchContacts}
              disabled={activeTab === 'users' ? isLoadingUsers : isLoadingContacts}
              className="flex items-center gap-2 px-3 py-2 bg-tastelanc-surface-light rounded-lg text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${(activeTab === 'users' ? isLoadingUsers : isLoadingContacts) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 bg-tastelanc-surface-light/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-tastelanc-surface text-tastelanc-text-primary shadow-sm'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            App Users
            {stats.total > 0 && (
              <span className="text-xs bg-tastelanc-accent/20 text-tastelanc-accent px-1.5 py-0.5 rounded-full">
                {stats.total}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'bg-tastelanc-surface text-tastelanc-text-primary shadow-sm'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact Lists
            {contactStats && (
              <span className="text-xs bg-tastelanc-accent/20 text-tastelanc-accent px-1.5 py-0.5 rounded-full">
                {contactStats.total_contacts}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'platform'
              ? 'bg-tastelanc-surface text-tastelanc-text-primary shadow-sm'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          <span className="flex items-center gap-2">
            <BookUser className="w-4 h-4" />
            Our Contacts
          </span>
        </button>
      </div>

      {/* ── TAB: APP USERS ── */}
      {activeTab === 'users' && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{stats.total}</p>
              <p className="text-tastelanc-text-muted text-xs md:text-sm">Total App Users</p>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{stats.signedIn}</p>
              <p className="text-tastelanc-text-muted text-xs md:text-sm">Signed In (with email)</p>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{stats.activeLast7}</p>
              <p className="text-tastelanc-text-muted text-xs md:text-sm">Active Last 7 Days</p>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-tastelanc-accent/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-tastelanc-accent" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{stats.pushTokens}</p>
              <p className="text-tastelanc-text-muted text-xs md:text-sm">
                Push Tokens ({stats.iosTokens} iOS, {stats.androidTokens} Android)
              </p>
            </Card>
          </div>

          {/* Breakdown */}
          <Card className="p-4 md:p-6 mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-tastelanc-text-primary mb-4 md:mb-6">User Breakdown</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                <span className="text-tastelanc-text-muted text-sm block mb-1">Signed In</span>
                <span className="text-tastelanc-text-primary text-xl font-bold">{stats.signedIn}</span>
                <span className="text-tastelanc-text-faint text-xs block">
                  {stats.total > 0 ? Math.round((stats.signedIn / stats.total) * 100) : 0}% of total
                </span>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                <span className="text-tastelanc-text-muted text-sm block mb-1">Anonymous</span>
                <span className="text-tastelanc-text-primary text-xl font-bold">{stats.anonymous}</span>
                <span className="text-tastelanc-text-faint text-xs block">
                  {stats.total > 0 ? Math.round((stats.anonymous / stats.total) * 100) : 0}% of total
                </span>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                <span className="text-tastelanc-text-muted text-sm block mb-1">Active (30d)</span>
                <span className="text-tastelanc-text-primary text-xl font-bold">{stats.activeLast30}</span>
                <span className="text-tastelanc-text-faint text-xs block">
                  {stats.total > 0 ? Math.round((stats.activeLast30 / stats.total) * 100) : 0}% retention
                </span>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                <span className="text-tastelanc-text-muted text-sm block mb-1">With Email</span>
                <span className="text-tastelanc-text-primary text-xl font-bold">{stats.withEmail}</span>
                <span className="text-tastelanc-text-faint text-xs block">Exportable contacts</span>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full pl-9 pr-4 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
              />
            </div>
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="px-3 py-2 bg-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-1 focus:ring-tastelanc-accent/50"
            >
              {MARKET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* User List */}
          <Card className="overflow-hidden">
            <div className="p-4 md:p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-tastelanc-text-primary">
                  {showAnonymous ? 'All Users' : 'Signed-In Users'}
                </h2>
                <Badge variant="default">{filteredUsers.length}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAnonymous(!showAnonymous)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-tastelanc-text-muted hover:text-tastelanc-text-primary bg-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light transition-colors"
                >
                  {showAnonymous ? (
                    <><EyeOff className="w-3 h-3" /> Hide Anonymous</>
                  ) : (
                    <><Eye className="w-3 h-3" /> Show Anonymous</>
                  )}
                </button>
                <span className="text-xs text-tastelanc-text-faint hidden sm:inline">
                  Updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="p-8 md:p-12 text-center">
                <Loader2 className="w-8 h-8 text-tastelanc-accent mx-auto mb-4 animate-spin" />
                <p className="text-tastelanc-text-muted">Loading app users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 md:p-12 text-center">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-tastelanc-text-faint mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-tastelanc-text-primary mb-2">No users found</h3>
                <p className="text-tastelanc-text-muted text-sm">
                  {showAnonymous ? 'No app users yet.' : 'No signed-in users yet. Try showing anonymous users.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-tastelanc-surface-light">
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">User</th>
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Status</th>
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Last Seen</th>
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">App</th>
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Favs / Check-ins</th>
                        <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30"
                        >
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-tastelanc-text-primary font-medium block">
                                {user.display_name || user.email || 'Anonymous User'}
                              </span>
                              {user.email && user.display_name && (
                                <span className="text-tastelanc-text-faint text-sm">{user.email}</span>
                              )}
                              {!user.email && !user.display_name && (
                                <span className="text-tastelanc-text-faint text-xs">{user.id.slice(0, 8)}...</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {user.is_anonymous ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-tastelanc-surface-light/50 text-tastelanc-text-muted">
                                Anonymous
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                Signed In
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-tastelanc-text-muted">
                            {user.last_seen_at ? timeAgo(user.last_seen_at) : 'Never'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              {user.platform ? (
                                <Badge variant={user.platform === 'ios' ? 'default' : 'accent'}>
                                  {user.platform === 'ios' ? 'iOS' : 'Android'}
                                </Badge>
                              ) : (
                                <span className="text-tastelanc-text-faint">-</span>
                              )}
                              {user.app_slug && (
                                <span className="text-tastelanc-text-faint text-xs">
                                  {APP_SLUG_LABELS[user.app_slug] || user.app_slug}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-tastelanc-text-muted">
                            <span>{user.favorites_count > 0 ? `♥ ${user.favorites_count}` : '—'}</span>
                            {user.checkins_count > 0 && (
                              <span className="ml-2 text-tastelanc-text-faint text-xs">· {user.checkins_count} check-ins</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-tastelanc-text-muted">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-tastelanc-surface-light/50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <span className="text-tastelanc-text-primary font-medium text-sm block truncate">
                            {user.display_name || user.email || 'Anonymous User'}
                          </span>
                          {user.email && user.display_name && (
                            <span className="text-tastelanc-text-faint text-xs truncate block">{user.email}</span>
                          )}
                        </div>
                        {user.is_anonymous ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tastelanc-surface-light/50 text-tastelanc-text-muted flex-shrink-0">
                            Anonymous
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 flex-shrink-0">
                            Signed In
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {user.platform && (
                            <Badge variant={user.platform === 'ios' ? 'default' : 'accent'} className="text-xs">
                              {user.platform === 'ios' ? 'iOS' : 'Android'}
                            </Badge>
                          )}
                          <span className="text-tastelanc-text-faint">
                            {user.last_seen_at ? timeAgo(user.last_seen_at) : 'Never seen'}
                          </span>
                        </div>
                        <span className="text-tastelanc-text-muted">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {/* ── TAB: CONTACT LISTS ── */}
      {activeTab === 'contacts' && (
        <>
          {isLoadingContacts ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-tastelanc-accent mx-auto mb-4 animate-spin" />
              <p className="text-tastelanc-text-muted">Cross-referencing contact lists with app users...</p>
            </div>
          ) : (
            <>
              {/* Contact Stats */}
              {contactStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                  <Card className="p-4 md:p-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{contactStats.total_contacts}</p>
                    <p className="text-tastelanc-text-muted text-xs md:text-sm">Total Contacts Uploaded</p>
                  </Card>
                  <Card className="p-4 md:p-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{contactStats.with_app}</p>
                    <p className="text-tastelanc-text-muted text-xs md:text-sm">
                      Have the App
                      {contactStats.total_contacts > 0 && (
                        <span className="ml-1 text-tastelanc-text-faint">
                          ({Math.round((contactStats.with_app / contactStats.total_contacts) * 100)}%)
                        </span>
                      )}
                    </p>
                  </Card>
                  <Card className="p-4 md:p-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{contactStats.signed_in}</p>
                    <p className="text-tastelanc-text-muted text-xs md:text-sm">Eligible for Giveaway</p>
                  </Card>
                  <Card className="p-4 md:p-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Activity className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">{contactStats.restaurants}</p>
                    <p className="text-tastelanc-text-muted text-xs md:text-sm">Restaurants with Lists</p>
                  </Card>
                </div>
              )}

              {/* Restaurant Contact Summaries */}
              <Card className="overflow-hidden">
                <div className="p-4 md:p-6 border-b border-tastelanc-surface-light">
                  <h2 className="text-lg md:text-xl font-semibold text-tastelanc-text-primary">Restaurant Contact Lists</h2>
                  <p className="text-tastelanc-text-muted text-sm mt-1">
                    Each row shows contacts a restaurant uploaded and how many have downloaded the app
                  </p>
                </div>

                {contactSummaries.length === 0 ? (
                  <div className="p-8 md:p-12 text-center">
                    <Mail className="w-10 h-10 md:w-12 md:h-12 text-tastelanc-text-faint mx-auto mb-4" />
                    <h3 className="text-base md:text-lg font-medium text-tastelanc-text-primary mb-2">No contact lists yet</h3>
                    <p className="text-tastelanc-text-muted text-sm">
                      Contacts appear here when restaurant owners upload email lists from their dashboard.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-tastelanc-surface-light">
                          <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Restaurant</th>
                          <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Contacts</th>
                          <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Has App</th>
                          <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Emailed</th>
                          <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Giveaway</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactSummaries.map((r) => {
                          const appPct = r.total_contacts > 0
                            ? Math.round((r.with_app / r.total_contacts) * 100)
                            : 0;
                          const eligibleCount = r.signed_in;
                          return (
                            <tr
                              key={r.restaurant_id}
                              className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30"
                            >
                              <td className="py-4 px-6">
                                <span className="text-tastelanc-text-primary font-medium">{r.restaurant_name}</span>
                              </td>
                              <td className="py-4 px-6 text-tastelanc-text-muted">{r.total_contacts}</td>
                              <td className="py-4 px-6">
                                <span className="text-green-400 font-medium">{r.with_app}</span>
                                <span className="text-tastelanc-text-faint text-xs ml-1">({appPct}%)</span>
                              </td>
                              <td className="py-4 px-6 text-tastelanc-text-muted">{r.emailed}</td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => setWinnerRestaurant(r)}
                                  disabled={eligibleCount === 0}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Trophy className="w-3 h-3" />
                                  Pick Winner
                                  {eligibleCount > 0 && (
                                    <span className="text-yellow-400/70">({eligibleCount})</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* ── TAB: OUR CONTACTS (PLATFORM) ── */}
      {activeTab === 'platform' && <PlatformContactsTab />}

      {/* Winner Picker Modal */}
      {winnerRestaurant && (
        <WinnerPickerModal
          restaurant={winnerRestaurant}
          contacts={allContacts}
          onClose={() => setWinnerRestaurant(null)}
        />
      )}
    </div>
  );
}
