'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  X,
  Store,
  Tag,
  Plus,
  Trash2,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';
import EmailComposer from '@/components/sales/EmailComposer';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
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
  assigned_to: string | null;
  assigned_to_name: string | null;
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

interface Ownership {
  isOwner: boolean;
  isLocked: boolean;
  isNudge: boolean;
  isStale: boolean;
  daysSinceUpdate: number;
  currentUserId: string | null;
  isAdmin: boolean;
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
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400', icon: Mail },
  { value: 'interested', label: 'Interested', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  { value: 'converted', label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold', icon: CheckCircle },
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

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id: leadId } = params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState('call');
  const [activityDescription, setActivityDescription] = useState('');
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // Activity edit/delete
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityText, setEditingActivityText] = useState('');
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  // Tags
  const [tagInput, setTagInput] = useState('');

  // Email composer
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  // Ownership
  const [ownership, setOwnership] = useState<Ownership | null>(null);

  // Unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    if (!editMode || !lead) return false;
    const fields = ['business_name', 'contact_name', 'email', 'phone', 'website', 'address', 'city', 'state', 'zip_code', 'category', 'notes'] as const;
    for (const f of fields) {
      if ((editForm[f] || '') !== (lead[f] || '')) return true;
    }
    const editTags = editForm.tags || [];
    const leadTags = lead.tags || [];
    if (editTags.length !== leadTags.length || editTags.some((t, i) => t !== leadTags[i])) return true;
    return false;
  }, [editMode, editForm, lead]);

  // Warn on navigation away with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
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
        if (data.ownership) setOwnership(data.ownership);
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
        const actRes = await fetch(`/api/sales/leads/${leadId}/activities`);
        const actData = await actRes.json();
        setActivities(actData.activities || []);
        toast.success('Status updated');
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sales/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: editForm.business_name,
          contact_name: editForm.contact_name,
          email: editForm.email,
          phone: editForm.phone,
          website: editForm.website,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          zip_code: editForm.zip_code,
          category: editForm.category,
          notes: editForm.notes,
          tags: editForm.tags,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLead({ ...lead!, ...data.lead });
        setEditMode(false);
        toast.success('Changes saved');
      } else {
        toast.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setEditMode(false);
    setEditForm(lead || {});
  }, [hasUnsavedChanges, lead]);

  const handleBackNavigation = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Leave this page?')) return;
    }
    router.back();
  }, [hasUnsavedChanges, router]);

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

        const leadRes = await fetch(`/api/sales/leads/${leadId}`);
        const leadData = await leadRes.json();
        setLead(leadData.lead);
        toast.success('Activity logged');
      } else {
        toast.error('Failed to log activity');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const handleEditActivity = async (activityId: string) => {
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editingActivityText }),
      });

      if (res.ok) {
        const data = await res.json();
        setActivities((prev) =>
          prev.map((a) => (a.id === activityId ? data.activity : a))
        );
        setEditingActivityId(null);
        setEditingActivityText('');
        toast.success('Activity updated');
      } else {
        toast.error('Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    setDeletingActivityId(activityId);
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.id !== activityId));
        toast.success('Activity deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    } finally {
      setDeletingActivityId(null);
    }
  };

  // Tag helpers
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    const current = editForm.tags || [];
    if (current.includes(tag)) {
      setTagInput('');
      return;
    }
    setEditForm({ ...editForm, tags: [...current, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setEditForm({ ...editForm, tags: (editForm.tags || []).filter((t) => t !== tag) });
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

  const inputClass = 'w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent';

  return (
    <div>
      {/* Unsaved changes banner */}
      {hasUnsavedChanges && (
        <div className="mb-4 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-sm text-yellow-400">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          You have unsaved changes
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackNavigation}
            className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {lead.category && (
                <span className="text-sm text-gray-400 capitalize">{lead.category.replace('_', ' ')}</span>
              )}
              <span className="text-gray-600">|</span>
              <span className="text-sm text-gray-500">Source: {lead.source}</span>
              <span className="text-gray-600">|</span>
              <span className="text-sm text-gray-500">Added {new Date(lead.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!editMode ? (
            <button
              onClick={() => { if (!ownership?.isLocked) { setEditMode(true); setEditForm(lead); } }}
              disabled={ownership?.isLocked}
              className={`flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-gray-300 hover:text-white rounded-lg transition-colors border border-tastelanc-surface-light ${ownership?.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          )}
          {lead.email && (
            <button
              onClick={() => setShowEmailComposer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
          )}
          {lead.restaurant_id && (
            <Link
              href={`/dashboard/profile?sales_mode=true&restaurant_id=${lead.restaurant_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Content
            </Link>
          )}
          <Link
            href={`/sales/checkout?email=${encodeURIComponent(lead.email || '')}&name=${encodeURIComponent(lead.contact_name || lead.business_name)}&phone=${encodeURIComponent(lead.phone || '')}&businessName=${encodeURIComponent(lead.business_name)}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Create Sale
          </Link>
        </div>
      </div>

      {/* Ownership Banners */}
      {ownership?.isLocked && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">This lead is owned by {lead.assigned_to_name}</p>
            <p className="text-xs text-gray-500">
              You can view but not edit. It will become available in {14 - ownership.daysSinceUpdate} day{14 - ownership.daysSinceUpdate !== 1 ? 's' : ''} if no activity.
            </p>
          </div>
        </div>
      )}

      {ownership?.isOwner && ownership.isNudge && !ownership.isStale && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Follow up needed</p>
            <p className="text-xs text-gray-500">
              This lead hasn&apos;t been updated in {ownership.daysSinceUpdate} days. Other reps can claim it after 14 days.
            </p>
          </div>
        </div>
      )}

      {!ownership?.isOwner && ownership?.isStale && lead.assigned_to && (
        <div className="flex items-center justify-between gap-3 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Unlock className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">This lead is available</p>
              <p className="text-xs text-gray-500">
                Inactive for {ownership.daysSinceUpdate} days. You can claim it.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/sales/leads/${leadId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assigned_to: ownership.currentUserId }),
                });
                if (res.ok) {
                  toast.success('Lead claimed');
                  // Refresh
                  const refreshRes = await fetch(`/api/sales/leads/${leadId}`);
                  const refreshData = await refreshRes.json();
                  if (refreshRes.ok) {
                    setLead(refreshData.lead);
                    setActivities(refreshData.activities || []);
                    if (refreshData.ownership) setOwnership(refreshData.ownership);
                  }
                } else {
                  const data = await res.json();
                  toast.error(data.error || 'Failed to claim lead');
                }
              } catch {
                toast.error('Failed to claim lead');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex-shrink-0"
          >
            Claim This Lead
          </button>
        </div>
      )}

      {/* Status + Linked Business bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Status:</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                onClick={() => !ownership?.isLocked && handleStatusChange(status.value)}
                disabled={ownership?.isLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  ownership?.isLocked ? 'cursor-not-allowed opacity-50' : ''
                } ${
                  lead.status === status.value
                    ? status.color
                    : 'text-gray-500 hover:bg-tastelanc-surface-light hover:text-gray-300'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {lead.restaurants && (
          <>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">{lead.restaurants.name}</span>
              {lead.restaurants.tiers?.name && (
                <Badge className="bg-lancaster-gold/20 text-lancaster-gold text-xs">{lead.restaurants.tiers.name}</Badge>
              )}
              <Badge className={`text-xs ${lead.restaurants.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {lead.restaurants.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </>
        )}
        {!lead.restaurants && lead.google_place_id && (
          <>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">Google Places</span>
              <span className="text-xs text-gray-500">Not yet in directory</span>
            </div>
          </>
        )}
      </div>

      {/* Lead Details Card */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Lead Details</h2>
        {editMode ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Business Name</label>
              <input
                type="text"
                value={editForm.business_name || ''}
                onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
              <input
                type="text"
                value={editForm.contact_name || ''}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={editForm.category || 'restaurant'}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className={inputClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="text"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Website</label>
              <input
                type="text"
                value={editForm.website || ''}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <input
                type="text"
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input
                type="text"
                value={editForm.city || ''}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <input
                  type="text"
                  value={editForm.state || ''}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ZIP</label>
                <input
                  type="text"
                  value={editForm.zip_code || ''}
                  onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
            {/* Tags Editor */}
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(editForm.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 bg-tastelanc-accent/20 text-tastelanc-accent text-xs rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag..."
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-3 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
              <Field label="Contact Name" value={lead.contact_name} />
              <Field label="Email">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-sm text-white hover:text-tastelanc-accent flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    {lead.email}
                  </a>
                ) : null}
              </Field>
              <Field label="Phone">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-sm text-white hover:text-tastelanc-accent flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    {lead.phone}
                  </a>
                ) : null}
              </Field>
              <Field label="Website">
                {lead.website ? (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-tastelanc-accent flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                    {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : null}
              </Field>
              <Field label="Address">
                {(lead.address || lead.city) ? (
                  <span className="text-sm text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    {[lead.address, lead.city, lead.state, lead.zip_code].filter(Boolean).join(', ')}
                  </span>
                ) : null}
              </Field>
              <Field label="Category" value={lead.category ? lead.category.charAt(0).toUpperCase() + lead.category.slice(1).replace('_', ' ') : null} />
              <Field label="Last Contacted" value={lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : null} />
              <Field label="Assigned To" value={lead.assigned_to_name || 'Unassigned'} />
            </div>
            {/* Tags display */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-tastelanc-surface-light">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-tastelanc-accent/20 text-tastelanc-accent text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-tastelanc-surface-light">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Activity */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Log Activity</h2>
          <div className="flex flex-wrap gap-2 mb-4">
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
          <textarea
            value={activityDescription}
            onChange={(e) => setActivityDescription(e.target.value)}
            rows={3}
            placeholder={`Describe the ${ACTIVITY_TYPES.find(t => t.value === activityType)?.label.toLowerCase()}...`}
            className={`${inputClass} resize-none mb-3`}
          />
          <button
            onClick={handleLogActivity}
            disabled={isLoggingActivity || !activityDescription.trim()}
            className="w-full px-4 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoggingActivity ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Log Activity'
            )}
          </button>
        </Card>

        {/* Activity Timeline */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Activity History</h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No activity logged yet</p>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, index) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
                const isLast = index === activities.length - 1;
                const isStatusChange = activity.activity_type === 'status_change';
                const isEditing = editingActivityId === activity.id;

                return (
                  <div key={activity.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isStatusChange
                          ? 'bg-lancaster-gold/20'
                          : 'bg-tastelanc-surface-light'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isStatusChange ? 'text-lancaster-gold' : 'text-gray-400'
                        }`} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-tastelanc-surface-light min-h-[16px]" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-300 capitalize">
                          {activity.activity_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                        {/* Edit/Delete actions for non-status-change activities */}
                        {!isStatusChange && !isEditing && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingActivityId(activity.id);
                                setEditingActivityText(activity.description || '');
                              }}
                              className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={deletingActivityId === activity.id}
                              className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                              title="Delete"
                            >
                              {deletingActivityId === activity.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editingActivityText}
                            onChange={(e) => setEditingActivityText(e.target.value)}
                            className="flex-1 px-2 py-1 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-tastelanc-accent"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditActivity(activity.id);
                              if (e.key === 'Escape') { setEditingActivityId(null); setEditingActivityText(''); }
                            }}
                          />
                          <button
                            onClick={() => handleEditActivity(activity.id)}
                            className="px-2 py-1 bg-tastelanc-accent text-white text-xs rounded transition-colors hover:bg-tastelanc-accent-hover"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingActivityId(null); setEditingActivityText(''); }}
                            className="px-2 py-1 text-gray-400 text-xs rounded transition-colors hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {activity.description && (
                            <p className="text-sm text-gray-400">{activity.description}</p>
                          )}
                          {activity.activity_type === 'email' && activity.metadata && (
                            <div className="flex items-center gap-3 mt-1">
                              {activity.metadata.sender_name && (
                                <span className="text-xs text-gray-500">
                                  Sent as {activity.metadata.sender_name}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && lead.email && (
        <EmailComposer
          lead={lead}
          onClose={() => setShowEmailComposer(false)}
          onSent={async () => {
            setShowEmailComposer(false);
            // Refresh lead and activities
            try {
              const res = await fetch(`/api/sales/leads/${leadId}`);
              const data = await res.json();
              if (res.ok) {
                setLead(data.lead);
                setActivities(data.activities || []);
              }
            } catch { /* ignore */ }
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  const content = children || (value ? <span className="text-sm text-white">{value}</span> : null);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {content || <span className="text-sm text-gray-600">—</span>}
    </div>
  );
}
