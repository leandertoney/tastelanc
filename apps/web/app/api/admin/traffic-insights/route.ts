import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    await verifyAdminAccess(supabase);

    const data = await request.json();

    // Prepare data summary for OpenAI
    const summary = `
Traffic Analytics Summary:
- Total Views: ${data.totalViews.toLocaleString()}
- Unique Visitors: ${data.uniqueVisitors.toLocaleString()}
- Bounce Rate: ${data.bounceRate}%
- Previous Period Visitors: ${data.prevPeriodVisitors.toLocaleString()}
- Previous Period Views: ${data.prevPeriodViews.toLocaleString()}
- Visitor Growth: ${data.prevPeriodVisitors > 0 ? Math.round(((data.uniqueVisitors - data.prevPeriodVisitors) / data.prevPeriodVisitors) * 100) : 0}%

Top Traffic Sources:
${data.sources.slice(0, 5).map((s: { source: string; count: number; percentage: number }) =>
  `- ${s.source}: ${s.count.toLocaleString()} views (${s.percentage}%)`
).join('\n')}

Top Referrers (with engagement metrics):
${data.topReferrers.slice(0, 5).map((r: { domain: string; views: number; avgPagesPerSession: number; bounceRate: number | null }) =>
  `- ${r.domain}: ${r.views} views, ${r.avgPagesPerSession} pages/session, ${r.bounceRate || 'N/A'}% bounce rate`
).join('\n')}

${data.marketBreakdown && data.marketBreakdown.length > 0 ? `
Market Distribution:
${data.marketBreakdown.map((m: { marketName: string; views: number }) =>
  `- ${m.marketName}: ${m.views.toLocaleString()} views`
).join('\n')}
` : ''}

${data.dailyTrend && data.dailyTrend.length >= 7 ? `
Recent Daily Traffic (last 7 days):
${data.dailyTrend.slice(-7).map((d: { date: string; views: number }) =>
  `- ${d.date}: ${d.views.toLocaleString()} views`
).join('\n')}
` : ''}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a traffic analytics expert helping a restaurant discovery platform (TasteLanc) understand their web and app traffic data.

Generate 3-4 actionable insights based on the traffic data provided. Each insight should:
1. Identify a specific pattern, opportunity, or concern
2. Provide a clear, specific recommendation
3. Be written in a friendly, encouraging tone
4. Focus on actionable ROI-driving strategies

Return the insights as a JSON array with this exact structure:
[
  {
    "type": "success" | "warning" | "info",
    "title": "Short title (5-7 words max)",
    "message": "Detailed insight with specific recommendation (2-3 sentences max)"
  }
]

Focus on:
- Traffic source quality and recommendations for doubling down or diversifying
- Growth trends and how to maintain/accelerate momentum
- Engagement metrics (bounce rate, pages/session) and optimization opportunities
- Market performance comparisons and expansion opportunities
- Best days/times for posting based on traffic patterns
- Referrer quality analysis and partnership opportunities

Be specific with numbers from the data when relevant.`,
        },
        {
          role: 'user',
          content: summary,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0].message.content;
    if (!result) {
      throw new Error('No insights generated');
    }

    const parsed = JSON.parse(result);
    const insights = parsed.insights || parsed; // Handle both {insights: [...]} and direct array

    return NextResponse.json({ insights: Array.isArray(insights) ? insights : [insights] });
  } catch (err: unknown) {
    console.error('Traffic insights error:', err);
    const error = err as { message?: string };
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
