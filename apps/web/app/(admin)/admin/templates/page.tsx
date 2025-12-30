'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Copy,
  Sparkles,
  Mail,
  Briefcase,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  preview_text: string | null;
  headline: string;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  is_ai_generated: boolean;
  usage_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Templates' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'b2b_cold', label: 'B2B Cold Outreach' },
  { value: 'b2b_followup', label: 'B2B Follow-up' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'countdown', label: 'Countdown' },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'b2b_cold':
    case 'b2b_followup':
      return <Briefcase className="w-4 h-4" />;
    case 'countdown':
      return <Calendar className="w-4 h-4" />;
    default:
      return <Mail className="w-4 h-4" />;
  }
};

const getCategoryLabel = (category: string) => {
  return CATEGORIES.find((c) => c.value === category)?.label || category;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/admin/templates?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(templates.filter((t) => t.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleUseTemplate = async (template: Template) => {
    // Increment usage count
    await fetch(`/api/admin/templates/${template.id}`, {
      method: 'PATCH',
    });

    // Navigate to new campaign with template data
    const params = new URLSearchParams({
      template: template.id,
      subject: template.subject,
      headline: template.headline,
      body: template.body,
      cta_text: template.cta_text || '',
      cta_url: template.cta_url || '',
      preview_text: template.preview_text || '',
    });

    window.location.href = `/admin/email-campaigns/new?${params}`;
  };

  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.subject.toLowerCase().includes(query) ||
      template.headline.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-1/4"></div>
          <div className="h-32 bg-neutral-800 rounded"></div>
          <div className="h-32 bg-neutral-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Email Templates
          </h1>
          <p className="text-neutral-400 mt-1">
            Save and reuse your best email content
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-neutral-800">
          <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No templates found
          </h3>
          <p className="text-neutral-400 mb-6">
            {templates.length === 0
              ? 'Create your first template to get started'
              : 'No templates match your search'}
          </p>
          <Link
            href="/admin/templates/new"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-300">
                    {getCategoryIcon(template.category)}
                    {getCategoryLabel(template.category)}
                  </span>
                  {template.is_ai_generated && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-900/50 text-purple-300">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-500">
                  Used {template.usage_count}x
                </span>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-white mb-2 line-clamp-1">
                {template.name}
              </h3>
              <p className="text-sm text-neutral-400 mb-1 line-clamp-1">
                <span className="text-neutral-500">Subject:</span>{' '}
                {template.subject}
              </p>
              <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                {template.headline}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Use Template
                </button>
                <button
                  onClick={() =>
                    deleteConfirm === template.id
                      ? handleDelete(template.id)
                      : setDeleteConfirm(template.id)
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    deleteConfirm === template.id
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-red-400'
                  }`}
                  title={
                    deleteConfirm === template.id
                      ? 'Click again to confirm'
                      : 'Delete template'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
