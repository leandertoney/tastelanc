'use client';

import { useState } from 'react';
import {
  Briefcase,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { ExpansionJobListing } from '@/lib/ai/expansion-types';

const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-blue-500/20 text-blue-400' },
  approved: { label: 'Approved', className: 'bg-green-500/20 text-green-400' },
  posted: { label: 'Posted', className: 'bg-emerald-500/20 text-emerald-400' },
  closed: { label: 'Closed', className: 'bg-gray-500/20 text-gray-400' },
};

const ROLE_TYPE_LABELS: Record<string, string> = {
  sales_rep: 'Sales Rep',
  market_manager: 'Market Manager',
  content_creator: 'Content Creator',
  community_manager: 'Community Manager',
};

interface JobListingCardProps {
  job: ExpansionJobListing;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string) => void;
  isUpdating?: boolean;
}

export default function JobListingCard({
  job,
  onApprove,
  onReject,
  isUpdating,
}: JobListingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.draft;
  const roleLabel = ROLE_TYPE_LABELS[job.role_type] || job.role_type;

  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white flex-1 min-w-0 truncate">
          {job.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2.5 py-0.5 bg-tastelanc-surface-light text-gray-300 text-xs rounded-full font-medium">
            {roleLabel}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-400 mb-3">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {job.location}
            {job.is_remote && ' (Remote)'}
          </span>
        )}
        {job.compensation_summary && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {job.compensation_summary}
          </span>
        )}
      </div>

      {/* Expandable description */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-sm text-tastelanc-accent hover:text-tastelanc-accent/80 transition-colors mb-3"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Description
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Description
          </>
        )}
      </button>

      {isExpanded && (
        <div className="mb-4 space-y-4">
          {/* Description */}
          <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
            {job.description}
          </div>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements</h4>
              <ul className="list-disc list-inside space-y-1">
                {job.requirements.map((req, i) => (
                  <li key={i} className="text-sm text-gray-400">
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Admin notes */}
      {job.admin_notes && (
        <div className="mb-3 p-3 bg-tastelanc-surface-light rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
          <p className="text-sm text-gray-400">{job.admin_notes}</p>
        </div>
      )}

      {/* Action buttons (only for draft jobs) */}
      {job.status === 'draft' && (
        <div className="flex items-center gap-2 pt-2 border-t border-tastelanc-surface-light">
          <button
            onClick={() => onApprove(job.id)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </button>
          <button
            onClick={() => onReject(job.id)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
