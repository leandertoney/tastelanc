---
name: api-route-builder
description: Build a new API route following TasteLanc patterns (RLS-safe, auth-verified)
---

# Build API Route

Create a new Next.js API route following TasteLanc's established patterns.

## Required Pattern

Every API route that modifies database tables with RLS policies MUST:

1. **Use regular client for auth**: `const supabase = await createClient()`
2. **Verify access**: `const accessResult = await verifyRestaurantAccess(supabase, restaurantId)`
3. **Use service role for writes**: `const serviceClient = createServiceRoleClient()`

## Template

```typescript
import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Parse request body
  const body = await request.json();
  const { restaurantId, ...data } = body;

  // Verify access (handles both regular owners and admin mode)
  const accessResult = await verifyRestaurantAccess(supabase, restaurantId);
  if (!accessResult.canAccess) {
    return NextResponse.json(
      { error: accessResult.error || "Access denied" },
      { status: accessResult.userId ? 403 : 401 },
    );
  }

  // Use service role client for writes (bypasses RLS)
  const serviceClient = createServiceRoleClient();

  const { data: result, error } = await serviceClient
    .from("table_name")
    .insert({ restaurant_id: restaurantId, ...data })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
```

## Reference Routes

Look at these existing routes for examples:

- `apps/web/app/api/dashboard/photos/upload/route.ts`
- `apps/web/app/api/dashboard/photos/[id]/route.ts`
- `apps/web/app/api/dashboard/specials/upload/route.ts`

## Verification

After creating the route:

1. Test with a regular restaurant owner account
2. Test with admin mode
3. Test unauthorized access (should return 401/403)
4. Verify RLS doesn't block operations (no "violates row-level security policy" errors)
