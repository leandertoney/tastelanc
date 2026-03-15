'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  last_seen_at: string | null;
  created_at: string;
  platform: string | null;
  favorites_count: number;
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

export default function AdminAppUsersPage() {
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
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showAnonymous, setShowAnonymous] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/app-users');
      const data = await response.json();
      setUsers(data.users || []);
      setStats(data.stats || {});
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching app users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/app-users?format=csv', '_blank');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = showAnonymous
    ? users
    : users.filter((u) => !u.is_anonymous);

  return (
    <div>
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary">App Users</h1>
          <p className="text-tastelanc-text-muted mt-1 text-sm md:text-base">
            Everyone who has downloaded and opened the app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-tastelanc-accent/20 rounded-lg text-tastelanc-accent hover:bg-tastelanc-accent/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-tastelanc-surface-light rounded-lg text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

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

        {isLoading ? (
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
                    <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Platform</th>
                    <th className="text-left py-4 px-6 text-tastelanc-text-muted font-medium">Favorites</th>
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
                        {user.platform ? (
                          <Badge variant={user.platform === 'ios' ? 'default' : 'accent'}>
                            {user.platform === 'ios' ? 'iOS' : 'Android'}
                          </Badge>
                        ) : (
                          <span className="text-tastelanc-text-faint">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-tastelanc-text-muted">
                        {user.favorites_count > 0 ? user.favorites_count : '-'}
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
    </div>
  );
}
