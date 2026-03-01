import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { MARKET_SLUG, BRAND, getMarketConfig, type MarketBrand } from '@/config/market';

const resend = new Resend(process.env.RESEND_API_KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBlogNotificationEmails(
  supabase: any,
  post: { title: string; slug: string; summary: string; coverImageUrl: string | null },
  brand: MarketBrand
): Promise<number> {
  const { data: subscribers } = await supabase
    .from('early_access_signups')
    .select('email')
    .eq('subscribed', true) as { data: { email: string }[] | null };

  if (!subscribers?.length) return 0;

  const siteUrl = `https://${brand.domain}`;
  const fromEmail = `${brand.aiName} <${brand.aiName.toLowerCase()}@${brand.domain}>`;
  let sent = 0;

  for (const sub of subscribers) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: sub.email,
        subject: post.title,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            ${post.coverImageUrl ? `<img src="${post.coverImageUrl}" alt="" style="width: 100%; border-radius: 8px;">` : ''}
            <h1 style="color: #333;">${post.title}</h1>
            <p style="color: #666;">${post.summary}</p>
            <a href="${siteUrl}/blog/${post.slug}" style="display: inline-block; background: ${brand.colors.accent}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Read More</a>
          </div>
        `,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to email ${sub.email}:`, e);
    }
  }

  return sent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendPushNotifications(
  supabase: any,
  post: { title: string; slug: string; summary: string }
): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notifications/new-blog-post', {
      body: { title: post.title, summary: post.summary, slug: post.slug },
    });
    if (error) {
      console.error('Push notification error:', error);
      return 0;
    }
    return data?.sent || 0;
  } catch (e) {
    console.error('Push notification failed:', e);
    return 0;
  }
}

export async function POST(request: Request) {
  console.log('Blog publish-scheduled started');

  try {
    const body = await request.json().catch(() => ({}));
    const isPgCron = (body as { source?: string }).source === 'pg_cron';
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    // Resolve market from body param or env var
    const marketSlug = (body as { market_slug?: string }).market_slug || MARKET_SLUG;
    const brand = getMarketConfig(marketSlug) || BRAND;

    const supabase = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Resolve market ID
    const { data: marketRow, error: marketErr } = await supabase
      .from('markets')
      .select('id')
      .eq('slug', marketSlug)
      .eq('is_active', true)
      .single();
    if (marketErr || !marketRow) throw new Error(`Market "${marketSlug}" not found or inactive`);
    const marketId = marketRow.id;

    console.log(`Publishing for market: ${brand.name} (${marketSlug})`);

    const now = new Date();

    // Find scheduled posts ready to publish (within 30 min window)
    const { data: scheduledPosts } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('market_id', marketId)
      .eq('status', 'scheduled')
      .lte('scheduled_publish_at', new Date(now.getTime() + 30 * 60000).toISOString())
      .order('scheduled_publish_at', { ascending: true });

    if (!scheduledPosts?.length) {
      // No scheduled posts - check if we need to generate a fallback
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: todayPosts } = await supabase
        .from('blog_posts')
        .select('slug')
        .eq('market_id', marketId)
        .eq('status', 'published')
        .gte('published_at', todayStart.toISOString())
        .limit(1);

      if (todayPosts?.length) {
        console.log(`Already published today for ${brand.name}, skipping`);
        return NextResponse.json({ success: true, skipped: true, reason: 'Already published today' });
      }

      // Check if today is a publish day (Mon, Wed, Fri)
      const dayOfWeek = now.getUTCDay();
      const isPublishDay = [1, 3, 5].includes(dayOfWeek);

      if (!isPublishDay) {
        console.log('Not a publish day, skipping');
        return NextResponse.json({ success: true, skipped: true, reason: 'Not a publish day' });
      }

      // Trigger fallback generation by calling the pregenerate endpoint
      console.log(`No scheduled post found for ${brand.name}, triggering fallback generation`);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

      try {
        const pregenerateResponse = await fetch(`${siteUrl}/api/blog/pregenerate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cronSecret && { Authorization: `Bearer ${cronSecret}` }),
          },
          body: JSON.stringify({ source: 'fallback', market_slug: marketSlug }),
        });

        if (pregenerateResponse.ok) {
          // Re-fetch the newly created scheduled post
          const { data: newPosts } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('market_id', marketId)
            .eq('status', 'scheduled')
            .order('created_at', { ascending: false })
            .limit(1);

          if (newPosts?.length) {
            // Publish it immediately
            const post = newPosts[0];
            const { error: updateErr } = await supabase
              .from('blog_posts')
              .update({ status: 'published', published_at: now.toISOString() })
              .eq('id', post.id);

            if (updateErr) throw new Error(updateErr.message);

            const emailsSent = await sendBlogNotificationEmails(supabase, {
              title: post.title,
              slug: post.slug,
              summary: post.summary,
              coverImageUrl: post.cover_image_url,
            }, brand);

            const pushSent = await sendPushNotifications(supabase, {
              title: post.title,
              slug: post.slug,
              summary: post.summary,
            });

            console.log(`Fallback published: "${post.title}" - ${emailsSent} emails, ${pushSent} push`);
            return NextResponse.json({
              success: true,
              fallback: true,
              published: { slug: post.slug, title: post.title, emailsSent, pushSent },
            });
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback generation failed:', fallbackErr);
      }

      return NextResponse.json({ success: false, error: 'No posts to publish and fallback failed' }, { status: 500 });
    }

    // Publish all ready posts
    const published = [];
    for (const post of scheduledPosts) {
      const { error: updateErr } = await supabase
        .from('blog_posts')
        .update({ status: 'published', published_at: now.toISOString() })
        .eq('id', post.id);

      if (updateErr) {
        console.error(`Failed to publish ${post.slug}:`, updateErr);
        continue;
      }

      const emailsSent = await sendBlogNotificationEmails(supabase, {
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        coverImageUrl: post.cover_image_url,
      }, brand);

      const pushSent = await sendPushNotifications(supabase, {
        title: post.title,
        slug: post.slug,
        summary: post.summary,
      });

      console.log(`Published: "${post.title}" - ${emailsSent} emails, ${pushSent} push`);
      published.push({ slug: post.slug, title: post.title, emailsSent, pushSent });
    }

    return NextResponse.json({ success: true, published });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Publish failed:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
