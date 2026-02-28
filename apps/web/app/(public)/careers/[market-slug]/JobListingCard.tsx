'use client';

import { useState } from 'react';
import {
  MapPin,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Briefcase,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface JobListingCardProps {
  job: {
    id: string;
    title: string;
    roleType: string;
    description: string;
    requirements: string[] | null;
    compensationSummary: string | null;
    location: string;
    isRemote: boolean;
    employmentType: string;
  };
  defaultExpanded?: boolean;
  accentColor?: string;
}

export function JobListingCard({
  job,
  defaultExpanded = false,
  accentColor,
}: JobListingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-tastelanc-surface-light/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-xl font-semibold text-white">{job.title}</h3>
            <Badge variant="default">{job.roleType}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {job.location}
              {job.isRemote && ' (Remote)'}
            </span>
            {job.compensationSummary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 flex-shrink-0" />
                {job.compensationSummary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 flex-shrink-0" />
              {job.employmentType}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-tastelanc-surface-light">
          <div className="pt-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Briefcase
                  className={`w-5 h-5 ${!accentColor ? 'text-tastelanc-accent' : ''}`}
                  style={accentColor ? { color: accentColor } : undefined}
                />
                About the Role
              </h4>
              <div
                className="text-gray-400 leading-relaxed prose prose-invert prose-sm max-w-none
                  prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-white
                  prose-headings:text-white prose-a:text-tastelanc-accent"
                dangerouslySetInnerHTML={{ __html: formatDescription(job.description) }}
              />
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">
                  Requirements
                </h4>
                <ul className="space-y-2 text-gray-400">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className={`mt-1 flex-shrink-0 ${!accentColor ? 'text-tastelanc-accent' : ''}`}
                        style={accentColor ? { color: accentColor } : undefined}
                      >
                        &#10003;
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compensation summary (if present) */}
            {job.compensationSummary && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign
                    className={`w-5 h-5 ${!accentColor ? 'text-tastelanc-accent' : ''}`}
                    style={accentColor ? { color: accentColor } : undefined}
                  />
                  Compensation
                </h4>
                <p className="text-gray-400">{job.compensationSummary}</p>
              </div>
            )}

            {/* CTA */}
            <div className="pt-2">
              <a
                href="#apply"
                className={`inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg transition-colors ${
                  accentColor ? 'hover:opacity-90' : 'bg-tastelanc-accent hover:bg-tastelanc-accent-hover'
                }`}
                style={accentColor ? { backgroundColor: accentColor } : undefined}
              >
                <Send className="w-5 h-5" />
                Apply Now
              </a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Converts plain-text descriptions into basic HTML.
 * If the description already contains HTML tags, returns as-is.
 * Otherwise, converts newlines to <br /> and wraps in paragraphs.
 */
function formatDescription(text: string): string {
  // If it already has HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  // Split on double newlines for paragraphs, single newlines become <br />
  return text
    .split(/\n\n+/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
}
