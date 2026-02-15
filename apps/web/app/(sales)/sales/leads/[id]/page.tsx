'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Loader2,
  Save,
  ShoppingCart,
  Clock,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  category: string | null;
  status: string;
  source: string;
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  restaurant_id: string | null;
  google_place_id: string | null;
  restaurants: {
    id: string;
    name: string;
    is_active: boolean;
    tier_id: string | null;
    tiers: { name: string } | null;
  } | null;
}

interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'interested', label: 'Interested', color: 'bg-green-500/20 text-green-400' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-500/20 text-red-400' },
  { value: 'converted', label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold' },
];

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'follow_up', label: 'Follow-up', icon: CalendarCheck },
];

const ACTIVITY_ICONS: Record<string, typeof PhoneCall> = {
  call: PhoneCall,
  email: Mail,
  meeting: Video,
  note: FileText,
  follow_up: CalendarCheck,
  status_change: CheckCircle,
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState<string>('');
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState('call');
  const [activityDescription, setActivityDescription] = useState('');
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    params.then((p) => setLeadId(p.id));
  }, [params]);

  useEffect(() => {
    if (!leadId) return;

    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/sales/leads/${leadId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        setLead(data.lead);
        setActivities(data.activities || []);
        setEditForm(data.lead);
      } catch (error) {
        console.error('Error fetching lead:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLead();
  }, [leadId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;

    try {
      const res = await fetch(`/api/sales/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        // Refresh activities to show status change
        const actRes = await fetch(`/api/sales/leads/${leadId}/activities`);
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sales/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogActivity = async () => {
    if (!activityDescription.trim()) return;

    setIsLoggingActivity(true);
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          description: activityDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActivities((prev) => [data.activity, ...prev]);
        setActivityDescription('');

        // Refresh lead to get updated last_contacted_at
        const leadRes = await fetch(`/api/sales/leads/${leadId}`);
        const leadData = await leadRes.json();
        setLead(leadData.lead);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    } finally {
      setIsLoggingActivity(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Lead not found</h2>
        <button onClick={() => router.back()} className="text-tastelanc-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const currentStatusConfig = STATUS_OPTIONS.find((s) => s.value === lead.status);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge className={currentStatusConfig?.color || ''}>
              {currentStatusConfig?.label || lead.status}
            </Badge>
            {lead.category && (
              <Badge className="bg-tastelanc-surface-light text-gray-300">{lead.category}</Badge>
            )}
            {lead.source && (
              <span className="text-xs text-gray-500">Source: {lead.source}</span>
            )}
          </div>
        </div>
        <Link
          href={`/sales/checkout?email=${encodeURIComponent(lead.email)}&name=${encodeURIComponent(lead.contact_name || lead.business_name)}&phone=${encodeURIComponent(lead.phone || '')}`}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          Create Sale
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Lead Details */}
        <div className="md:col-span-1 space-y-4">
          {/* Contact Info */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Contact</h2>
              <button
                onClick={() => {
                  if (editMode) {
                    handleSaveEdit();
                  } else {
                    setEditMode(true);
                  }
                }}
                className="text-xs text-tastelanc-accent hover:underline flex items-center gap-1"
              >
                {editMode ? (
                  isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3" /> Save</>
                ) : 'Edit'}
              </button>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Contact Name</label>
                  <input
                    type="text"
                    value={editForm.contact_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Website</label>
                  <input
                    type="text"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
                  />
                </div>
                <button
                  onClick={() => { setEditMode(false); setEditForm(lead); }}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lead.contact_name && (
                  <p className="text-white font-medium">{lead.contact_name}</p>
                )}
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                  <Mail className="w-4 h-4" /> {lead.email}
                </a>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                    <Phone className="w-4 h-4" /> {lead.phone}
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                  >
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
                {(lead.address || lead.city) && (
                  <p className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {[lead.address, lead.city, lead.state, lead.zip_code].filter(Boolean).join(', ')}
                  </p>
                )}
                {lead.notes && (
                  <div className="pt-3 border-t border-tastelanc-surface-light">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-300">{lead.notes}</p>
                  </div>
                )}
                <div className="pt-3 border-t border-tastelanc-surface-light text-xs text-gray-500">
                  <p>Added {new Date(lead.created_at).toLocaleDateString()}</p>
                  {lead.last_contacted_at && (
                    <p>Last contact {new Date(lead.last_contacted_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Status Pipeline */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Status</h2>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    lead.status === status.value
                      ? `${status.color} font-medium`
                      : 'text-gray-400 hover:bg-tastelanc-surface-light'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Linked Business */}
          {(lead.restaurant_id || lead.google_place_id) && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Linked Business</h2>
              {lead.restaurants ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium">{lead.restaurants.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-500/20 text-green-400">In Directory</Badge>
                    {lead.restaurants.tiers?.name && (
                      <Badge className="bg-lancaster-gold/20 text-lancaster-gold">{lead.restaurants.tiers.name}</Badge>
                    )}
                    <Badge className={lead.restaurants.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                      {lead.restaurants.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ) : lead.google_place_id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{lead.business_name}</span>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">Google Places</Badge>
                  <p className="text-xs text-gray-500">Not yet in directory</p>
                </div>
              ) : null}
            </Card>
          )}
        </div>

        {/* Right Column: Activity Log */}
        <div className="md:col-span-2 space-y-4">
          {/* Log Activity Form */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Log Activity</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setActivityType(type.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      activityType === type.value
                        ? 'bg-tastelanc-accent text-white'
                        : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                rows={2}
                placeholder={`Describe the ${ACTIVITY_TYPES.find(t => t.value === activityType)?.label.toLowerCase()}...`}
                className="flex-1 px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-none"
              />
              <button
                onClick={handleLogActivity}
                disabled={isLoggingActivity || !activityDescription.trim()}
                className="self-end px-4 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isLoggingActivity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Log'
                )}
              </button>
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Activity History</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No activity logged yet</p>
            ) : (
              <div className="space-y-0">
                {activities.map((activity, index) => {
                  const Icon = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
                  const isLast = index === activities.length - 1;

                  return (
                    <div key={activity.id} className="flex gap-3">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.activity_type === 'status_change'
                            ? 'bg-lancaster-gold/20'
                            : 'bg-tastelanc-surface-light'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            activity.activity_type === 'status_change' ? 'text-lancaster-gold' : 'text-gray-400'
                          }`} />
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-tastelanc-surface-light min-h-[16px]" />}
                      </div>

                      {/* Content */}
                      <div className={`pb-4 ${isLast ? '' : ''}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-300 capitalize">
                            {activity.activity_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-400">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
