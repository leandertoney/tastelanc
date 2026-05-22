'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UnifiedCheckoutWizard } from '@/components/sales/UnifiedCheckoutWizard';

/**
 * SALES CRM CHECKOUT PAGE
 *
 * Uses the shared UnifiedCheckoutWizard component with Sales CRM-specific configuration.
 * All pricing logic, validation, and UI is centralized in the component.
 *
 * Changes made here automatically apply to Admin sales page as well.
 */
export default function SalesCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    }>
      <UnifiedCheckoutWizard
        apiEndpoint="/api/checkout/multi-restaurant"
        successUrl="/sales/checkout?success=true&session_id={CHECKOUT_SESSION_ID}"
        cancelUrl="/sales/checkout?canceled=true"
        restaurantsApiUrl="/api/sales/restaurants"
        storageKey="salesCheckoutWizard"
        pageTitle="New Sale"
        pageDescription="Build a checkout link for one or more restaurants. Add restaurants to the cart, select plans, and generate a Stripe payment link to send to the business owner."
      />
    </Suspense>
  );
}
