import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Music, CheckCircle, Plus, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface SelfPromoter {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  genre: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  stripe_subscription_id: string | null;
  created_at: string;
}

async function getSelfPromoters(): Promise<SelfPromoter[]> {
  const supabase = await createClient();

  const { data: selfPromoters, error } = await supabase
    .from('self_promoters')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching self-promoters:', error);
    return [];
  }

  return selfPromoters || [];
}

export default async function AdminSelfPromotersPage() {
  const selfPromoters = await getSelfPromoters();
  const activeCount = selfPromoters.filter((sp) => sp.is_active).length;
  const paidCount = selfPromoters.filter((sp) => sp.stripe_subscription_id).length;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Self-Promoters</h1>
            <p className="text-gray-400 mt-1">
              {selfPromoters.length} total • {activeCount} active • {paidCount} subscribed
            </p>
          </div>
          <Link
            href="/admin/self-promoters/new"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Self-Promoter
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Music className="w-5 h-5 text-purple-500" />
            <span className="text-gray-400 text-sm">Total</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{selfPromoters.length}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-400 text-sm">Active</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{activeCount}</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-tastelanc-accent" />
            <span className="text-gray-400 text-sm">Subscribed</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{paidCount}</p>
        </Card>
      </div>

      {/* Self-Promoter List */}
      <Card className="overflow-hidden">
        {selfPromoters.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No self-promoters yet</p>
            <Link
              href="/admin/self-promoters/new"
              className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
            >
              Sign up your first self-promoter →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-tastelanc-surface-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Artist</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Genre</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Contact</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {selfPromoters.map((sp) => (
                  <tr key={sp.id} className="hover:bg-tastelanc-surface-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {sp.profile_image_url ? (
                          <img
                            src={sp.profile_image_url}
                            alt={sp.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Music className="w-5 h-5 text-purple-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{sp.name}</p>
                          <p className="text-gray-500 text-sm">/{sp.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{sp.genre || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {sp.email && (
                          <a href={`mailto:${sp.email}`} className="text-blue-400 hover:text-blue-300 block">
                            {sp.email}
                          </a>
                        )}
                        {sp.phone && <span className="text-gray-400">{sp.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {sp.is_active ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Inactive</span>
                        )}
                        {sp.stripe_subscription_id && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">Subscribed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(sp.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
