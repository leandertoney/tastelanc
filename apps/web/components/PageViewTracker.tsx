'use client';

import { useEffect } from 'react';

interface PageViewTrackerProps {
  pagePath: string;
  pageType?: 'restaurant' | 'events' | 'happy_hour' | 'specials' | 'menu' | 'photos' | 'other';
  restaurantId?: string;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem('tastelanc_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('tastelanc_visitor_id', visitorId);
  }
  return visitorId;
}

function getOrCreateSession(): { sessionId: string; isLanding: boolean } {
  const now = Date.now();
  const lastActive = sessionStorage.getItem('tastelanc_session_last_active');
  let sessionId = sessionStorage.getItem('tastelanc_session_id');
  let isLanding = false;

  // Start a new session if none exists or timed out
  if (!sessionId || !lastActive || now - parseInt(lastActive, 10) > SESSION_TIMEOUT_MS) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('tastelanc_session_id', sessionId);
    isLanding = true;

    // Capture UTM params on new session start
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    if (utmSource) sessionStorage.setItem('tastelanc_utm_source', utmSource);
    else sessionStorage.removeItem('tastelanc_utm_source');
    if (utmMedium) sessionStorage.setItem('tastelanc_utm_medium', utmMedium);
    else sessionStorage.removeItem('tastelanc_utm_medium');
    if (utmCampaign) sessionStorage.setItem('tastelanc_utm_campaign', utmCampaign);
    else sessionStorage.removeItem('tastelanc_utm_campaign');
  }

  // Update last active timestamp
  sessionStorage.setItem('tastelanc_session_last_active', now.toString());

  return { sessionId, isLanding };
}

export default function PageViewTracker({ pagePath, pageType = 'other', restaurantId }: PageViewTrackerProps) {
  useEffect(() => {
    const trackView = async () => {
      const visitorId = getOrCreateVisitorId();
      const { sessionId, isLanding } = getOrCreateSession();

      // Read persisted UTM params
      const utmSource = sessionStorage.getItem('tastelanc_utm_source') || undefined;
      const utmMedium = sessionStorage.getItem('tastelanc_utm_medium') || undefined;
      const utmCampaign = sessionStorage.getItem('tastelanc_utm_campaign') || undefined;

      try {
        await fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pagePath,
            visitorId,
            pageType,
            restaurantId,
            sessionId,
            isLanding,
            utmSource,
            utmMedium,
            utmCampaign,
            screenWidth: window.innerWidth,
          }),
        });
      } catch (error) {
        // Silently fail - don't break the page for analytics
        console.error('Error tracking page view:', error);
      }
    };

    trackView();
  }, [pagePath, pageType, restaurantId]);

  return null;
}
