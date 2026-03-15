'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Briefcase,
  Loader2,
  X,
  Trash2,
  Pencil,
  Mail,
  ExternalLink,
  HelpCircle,
  Store,
  Search,
  User,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Card, Tooltip } from '@/components/ui';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  lead_id: string | null;
  restaurant_id: string | null;
  created_by: string;
  assigned_to: string | null;
  creator_name: string | null;
  assigned_to_name: string | null;
  created_at: string;
  business_leads: {
    id: string;
    business_name: string;
    contact_name: string | null;
  } | null;
  restaurants: {
    id: string;
    name: string;
  } | null;
}

interface LeadOption {
  id: string;
  business_name: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
}

interface RestaurantOption {
  id: string;
  name: string;
}

interface SalesRepOption {
  id: string;
  name: string;
  email: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formLeadId, setFormLeadId] = useState('');
  const [formLeadSearch, setFormLeadSearch] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [formRestaurantId, setFormRestaurantId] = useState('');
  const [formRestaurantSearch, setFormRestaurantSearch] = useState('');
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [restaurantSearchLoading, setRestaurantSearchLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales/calendar?month=${monthKey}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchMeetings();
  }, [fetchMeetings]);

  // Fetch sales reps for dropdown (once on mount)
  useEffect(() => {
    const fetchReps = async () => {
      try {
        const res = await fetch('/api/sales/reps');
        if (res.ok) {
          const data = await res.json();
          setSalesReps(data.reps || []);
          setCurrentUserId(data.currentUserId || '');
          // Default assign to self
          setFormAssignedTo(data.currentUserId || '');
        }
      } catch { /* ignore */ }
    };
    fetchReps();
  }, []);

  // Search-as-you-type lead lookup (debounced)
  useEffect(() => {
    if (!formLeadSearch.trim() || formLeadId) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLeadSearchLoading(true);
      try {
        const res = await fetch(
          `/api/sales/leads?search=${encodeURIComponent(formLeadSearch.trim())}&limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          // Deduplicate by id in case of DB duplicates
          const seen = new Set<string>();
          const unique = (data.leads || []).filter((l: { id: string }) => {
            if (seen.has(l.id)) return false;
            seen.add(l.id);
            return true;
          });
          setLeads(unique.map((l: { id: string; business_name: string; restaurant_id?: string | null; restaurants?: { name: string } | null }) => ({
            id: l.id,
            business_name: l.business_name,
            restaurant_id: l.restaurant_id || null,
            restaurant_name: l.restaurants?.name || null,
          })));
        }
      } catch { /* ignore */ } finally {
        setLeadSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formLeadSearch, formLeadId]);

  // Search-as-you-type restaurant lookup (server-side, debounced)
  useEffect(() => {
    if (!formRestaurantSearch.trim() || formRestaurantId) {
      setRestaurants([]);
      return;
    }
    const timer = setTimeout(async () => {
      setRestaurantSearchLoading(true);
      try {
        const res = await fetch(
          `/api/sales/restaurants?search=${encodeURIComponent(formRestaurantSearch.trim())}&limit=20&skip_claimed=1`
        );
        if (res.ok) {
          const data = await res.json();
          setRestaurants((data.restaurants || []).map((r: { id: string; name: string }) => ({
            id: r.id,
            name: r.name,
          })));
        }
      } catch { /* ignore */ } finally {
        setRestaurantSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formRestaurantSearch, formRestaurantId]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ date: number; month: 'prev' | 'current' | 'next'; dateStr: string }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ date: d, month: 'prev', dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: 'current',
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ date: i, month: 'next', dateStr: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
    }

    return days;
  }, [currentMonth, currentYear]);

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      const key = m.meeting_date;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [meetings]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const openCreateModal = (dateStr: string) => {
    setEditingMeeting(null);
    setSelectedDate(dateStr);
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr);
    setFormStartTime('');
    setFormEndTime('');
    setFormLeadId('');
    setFormLeadSearch('');
    setShowLeadDropdown(false);
    setLeads([]);
    setFormRestaurantId('');
    setFormRestaurantSearch('');
    setShowRestaurantDropdown(false);
    setRestaurants([]);
    setFormAssignedTo(currentUserId); // default to self
    setShowModal(true);
  };

  const openEditModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setSelectedDate(meeting.meeting_date);
    setFormTitle(meeting.title);
    setFormDescription(meeting.description || '');
    setFormDate(meeting.meeting_date);
    setFormStartTime(meeting.start_time?.substring(0, 5) || '');
    setFormEndTime(meeting.end_time?.substring(0, 5) || '');
    setFormLeadId(meeting.lead_id || '');
    setFormLeadSearch(meeting.business_leads?.business_name || '');
    setShowLeadDropdown(false);
    setLeads([]);
    setFormRestaurantId(meeting.restaurant_id || '');
    setFormRestaurantSearch(meeting.restaurants?.name || '');
    setShowRestaurantDropdown(false);
    setRestaurants([]);
    setFormAssignedTo(meeting.assigned_to || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) {
      toast.error('Title and date are required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        meeting_date: formDate,
        start_time: formStartTime || null,
        end_time: formEndTime || null,
        lead_id: formLeadId || null,
        restaurant_id: formRestaurantId || null,
        assigned_to: formAssignedTo || null,
      };

      const url = editingMeeting
        ? `/api/sales/calendar/${editingMeeting.id}`
        : '/api/sales/calendar';

      const res = await fetch(url, {
        method: editingMeeting ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const wasNewMeeting = !editingMeeting;
      const hadAssignee = !!formAssignedTo;
      const hadRestaurant = !!formRestaurantId;

      toast.success(
        editingMeeting
          ? 'Meeting updated'
          : hadAssignee && hadRestaurant && !formLeadId
          ? 'Meeting created and lead auto-assigned'
          : 'Meeting created'
      );
      setShowModal(false);
      fetchMeetings();

      // If a new meeting was created with an assignment, nudge user to check leads
      if (wasNewMeeting && hadAssignee && hadRestaurant) {
        setTimeout(() => {
          toast('Lead created and assigned', {
            description: 'Check the Leads tab to see the new lead.',
            action: { label: 'View Leads', onClick: () => window.location.href = '/sales/leads' },
          });
        }, 800);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save meeting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/sales/calendar/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Meeting deleted');
      setShowModal(false);
      fetchMeetings();
    } catch {
      toast.error('Failed to delete meeting');
    }
  };

  const selectedDateMeetings = selectedDate ? meetingsByDate[selectedDate] || [] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-tastelanc-accent" />
            Calendar
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-tastelanc-text-muted">Schedule and track meetings</p>
            <Tooltip content="Click any date to add a meeting. Assign meetings to team members to auto-create leads. Double-click a date or use + to get started." position="bottom">
              <HelpCircle className="w-4 h-4 text-tastelanc-text-faint hover:text-tastelanc-text-muted cursor-help" />
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-secondary hover:text-tastelanc-text-primary rounded-lg transition-colors border border-tastelanc-surface-light text-sm"
          >
            Today
          </button>
          <button
            onClick={() => openCreateModal(todayStr)}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="p-4 mb-5">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary rounded-lg hover:bg-tastelanc-surface-light transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-tastelanc-text-primary">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary rounded-lg hover:bg-tastelanc-surface-light transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar Grid */}
        <Card className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-tastelanc-text-faint uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-tastelanc-surface-light rounded-lg overflow-hidden">
                {calendarDays.map((day, idx) => {
                  const dayMeetings = meetingsByDate[day.dateStr] || [];
                  const isToday = day.dateStr === todayStr;
                  const isSelected = day.dateStr === selectedDate;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day.dateStr)}
                      onDoubleClick={() => openCreateModal(day.dateStr)}
                      className={`min-h-[80px] p-1.5 text-left transition-colors relative ${
                        day.month === 'current'
                          ? 'bg-tastelanc-bg hover:bg-tastelanc-surface'
                          : 'bg-tastelanc-bg/50 hover:bg-tastelanc-surface/50'
                      } ${isSelected ? 'ring-2 ring-inset ring-tastelanc-accent' : ''}`}
                    >
                      <span
                        className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday
                            ? 'bg-tastelanc-accent text-white'
                            : day.month === 'current'
                            ? 'text-tastelanc-text-secondary'
                            : 'text-tastelanc-text-faint'
                        }`}
                      >
                        {day.date}
                      </span>

                      <div className="mt-0.5 space-y-0.5">
                        {dayMeetings.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            onClick={(e) => { e.stopPropagation(); openEditModal(m); }}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer transition-colors ${
                              m.restaurants && !m.business_leads
                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                            }`}
                          >
                            {m.start_time ? formatTime(m.start_time) + ' ' : ''}{m.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-[10px] text-tastelanc-text-faint px-1">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Day Detail Sidebar */}
        <div className="lg:w-80">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-tastelanc-text-primary">
                {selectedDate
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })
                  : 'Select a day'}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => openCreateModal(selectedDate)}
                  className="p-1.5 text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors"
                  title="Add meeting"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedDateMeetings.length === 0 ? (
              <p className="text-sm text-tastelanc-text-faint">
                {selectedDate ? 'No meetings scheduled' : 'Click a day to view meetings'}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-tastelanc-bg rounded-lg cursor-pointer hover:bg-tastelanc-surface-light transition-colors group"
                    onClick={() => openEditModal(m)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-tastelanc-text-primary">{m.title}</h4>
                      <Pencil className="w-3.5 h-3.5 text-tastelanc-text-faint group-hover:text-tastelanc-text-muted flex-shrink-0 mt-0.5" />
                    </div>
                    {(m.start_time || m.end_time) && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-tastelanc-text-faint" />
                        <span className="text-xs text-tastelanc-text-muted">
                          {formatTime(m.start_time)}
                          {m.end_time ? ` – ${formatTime(m.end_time)}` : ''}
                        </span>
                      </div>
                    )}
                    {m.assigned_to_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <UserCheck className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-purple-400">{m.assigned_to_name}</span>
                      </div>
                    )}
                    {m.business_leads && (
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-400">{m.business_leads.business_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/sales/leads/${m.lead_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-tastelanc-text-faint hover:text-tastelanc-text-primary rounded transition-colors"
                            title="View lead"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {m.business_leads.contact_name && (
                            <Link
                              href={`/sales/leads/${m.lead_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-tastelanc-text-faint hover:text-blue-400 rounded transition-colors"
                              title="Email lead"
                            >
                              <Mail className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                    {m.restaurants && !m.business_leads && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Store className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">{m.restaurants.name}</span>
                      </div>
                    )}
                    {m.description && (
                      <p className="text-xs text-tastelanc-text-faint mt-1.5 line-clamp-2">{m.description}</p>
                    )}
                    {m.creator_name && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <User className="w-3 h-3 text-tastelanc-text-faint" />
                        <span className="text-[11px] text-tastelanc-text-faint">Set by {m.creator_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-tastelanc-surface-light flex-shrink-0">
              <h2 className="text-lg font-bold text-tastelanc-text-primary">
                {editingMeeting ? 'Edit Meeting' : 'New Meeting'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Meeting with..."
                    className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent [color-scheme:dark]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Assign To — full width, prominent */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">
                    Assign To <span className="text-tastelanc-text-faint normal-case">(creates a lead for this rep)</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
                    <select
                      value={formAssignedTo}
                      onChange={(e) => setFormAssignedTo(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent appearance-none"
                    >
                      <option value="">Unassigned</option>
                      {salesReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}{rep.id === currentUserId ? ' (me)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formAssignedTo && formRestaurantId && !formLeadId && (
                    <p className="mt-1.5 text-xs text-purple-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      A lead will be auto-created for this restaurant and assigned to this rep
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">
                    Link to Lead <span className="text-tastelanc-text-faint">(optional)</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
                    <input
                      type="text"
                      value={formLeadSearch}
                      onChange={(e) => {
                        setFormLeadSearch(e.target.value);
                        setShowLeadDropdown(true);
                        if (!e.target.value) setFormLeadId('');
                      }}
                      onFocus={() => setShowLeadDropdown(true)}
                      placeholder="Search leads..."
                      className="w-full pl-9 pr-8 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                    {formLeadId && (
                      <button
                        onClick={() => { setFormLeadId(''); setFormLeadSearch(''); setLeads([]); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-tastelanc-text-faint hover:text-tastelanc-text-primary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showLeadDropdown && formLeadSearch && !formLeadId && (
                    <div className="absolute z-10 mt-1 w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {leadSearchLoading ? (
                        <p className="px-3 py-2 text-sm text-tastelanc-text-faint">Searching…</p>
                      ) : leads.length > 0 ? (
                        leads.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => {
                              setFormLeadId(l.id);
                              setFormLeadSearch(l.business_name);
                              setShowLeadDropdown(false);
                              // Auto-link restaurant if lead has one
                              if (l.restaurant_id && l.restaurant_name) {
                                setFormRestaurantId(l.restaurant_id);
                                setFormRestaurantSearch(l.restaurant_name);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-tastelanc-text-secondary hover:bg-tastelanc-surface-light hover:text-tastelanc-text-primary transition-colors flex items-center gap-2"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-tastelanc-text-faint flex-shrink-0" />
                            {l.business_name}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-tastelanc-text-faint">No leads found</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">
                    Link to Restaurant <span className="text-tastelanc-text-faint">(optional)</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
                    <input
                      type="text"
                      value={formRestaurantSearch}
                      onChange={(e) => {
                        setFormRestaurantSearch(e.target.value);
                        setShowRestaurantDropdown(true);
                        if (!e.target.value) setFormRestaurantId('');
                      }}
                      onFocus={() => setShowRestaurantDropdown(true)}
                      placeholder="Search restaurants..."
                      className="w-full pl-9 pr-8 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                    {formRestaurantId && (
                      <button
                        onClick={() => { setFormRestaurantId(''); setFormRestaurantSearch(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-tastelanc-text-faint hover:text-tastelanc-text-primary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showRestaurantDropdown && formRestaurantSearch && !formRestaurantId && (
                    <div className="absolute z-10 mt-1 w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {restaurantSearchLoading ? (
                        <p className="px-3 py-2 text-sm text-tastelanc-text-faint">Searching…</p>
                      ) : restaurants.length > 0 ? (
                        restaurants.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setFormRestaurantId(r.id);
                              setFormRestaurantSearch(r.name);
                              setShowRestaurantDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-tastelanc-text-secondary hover:bg-tastelanc-surface-light hover:text-tastelanc-text-primary transition-colors flex items-center gap-2"
                          >
                            <Store className="w-3.5 h-3.5 text-tastelanc-text-faint flex-shrink-0" />
                            {r.name}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-tastelanc-text-faint">No restaurants found</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-tastelanc-text-faint uppercase tracking-wider mb-1.5">
                    Notes <span className="text-tastelanc-text-faint">(optional)</span>
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Meeting agenda, notes..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-y"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-tastelanc-surface-light flex-shrink-0">
              <div>
                {editingMeeting && (
                  <button
                    onClick={() => handleDelete(editingMeeting.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formTitle.trim() || !formDate}
                  className="flex items-center gap-2 px-5 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMeeting ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
