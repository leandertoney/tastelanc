'use client';

import { useEffect } from 'react';

interface PageViewTrackerProps {
  pagePath: string;
}

export default function PageViewTracker({ pagePath }: PageViewTrackerProps) {
  useEffect(() => {
    const trackView = async () => {
      // Get or create visitor ID
      let visitorId = localStorage.getItem('tastelanc_visitor_id');
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('tastelanc_visitor_id', visitorId);
      }

      try {
        await fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pagePath, visitorId }),
        });
      } catch (error) {
        // Silently fail - don't break the page for analytics
        console.error('Error tracking page view:', error);
      }
    };

    trackView();
  }, [pagePath]);

  return null;
}
