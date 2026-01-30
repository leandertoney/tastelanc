import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes('run-migration-secret-2024')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    });

    const results: string[] = [];

    // Run migration SQL statements one by one using raw SQL execution
    const migrations = [
      // Create self_promoters table
      `CREATE TABLE IF NOT EXISTS public.self_promoters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        bio TEXT,
        genre TEXT,
        profile_image_url TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        instagram TEXT,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // Add self_promoter_id column to events
      `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS self_promoter_id UUID REFERENCES public.self_promoters(id) ON DELETE CASCADE`,

      // Make restaurant_id nullable
      `ALTER TABLE public.events ALTER COLUMN restaurant_id DROP NOT NULL`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_self_promoters_owner ON public.self_promoters(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_self_promoters_slug ON public.self_promoters(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_events_self_promoter ON public.events(self_promoter_id) WHERE self_promoter_id IS NOT NULL`,

      // Enable RLS
      `ALTER TABLE public.self_promoters ENABLE ROW LEVEL SECURITY`,

      // Create RLS policies
      `CREATE POLICY IF NOT EXISTS "Public read active self_promoters" ON public.self_promoters FOR SELECT USING (is_active = true)`,
      `CREATE POLICY IF NOT EXISTS "Owners can update own self_promoter" ON public.self_promoters FOR UPDATE USING (auth.uid() = owner_id)`,
    ];

    // Note: Edge functions can't directly execute raw SQL
    // We need to use the postgres connection
    // For now, let's check what we can do

    // Try to insert test data to see if table exists
    const { error: checkError } = await supabase
      .from('self_promoters')
      .select('id')
      .limit(1);

    if (checkError) {
      results.push(`Table check error: ${checkError.message}`);
      results.push('Migration may need to be run via SQL editor');
    } else {
      results.push('self_promoters table exists!');
    }

    // Check events column
    const { error: eventsError } = await supabase
      .from('events')
      .select('id, self_promoter_id')
      .limit(1);

    if (eventsError) {
      results.push(`Events column check error: ${eventsError.message}`);
    } else {
      results.push('events.self_promoter_id column exists!');
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      message: 'Migration check complete'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
