import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import {
  generateEmail,
  generateSubjectLines,
  improveEmail,
  type EmailGenerationContext,
  type EmailObjective,
  type EmailTone,
  type AudienceType,
} from '@/lib/ai/email-generator';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate': {
        const context: EmailGenerationContext = {
          objective: params.objective as EmailObjective,
          audienceType: (params.audienceType as AudienceType) || 'b2b',
          tone: params.tone as EmailTone,
          keyPoints: params.keyPoints,
          businessContext: params.businessContext,
          recipientContext: params.recipientContext,
        };

        if (!context.objective || !context.tone) {
          return NextResponse.json(
            { error: 'Missing required fields: objective, tone' },
            { status: 400 }
          );
        }

        const email = await generateEmail(context);
        return NextResponse.json({ email });
      }

      case 'subjects': {
        const context: EmailGenerationContext = {
          objective: params.objective as EmailObjective,
          audienceType: (params.audienceType as AudienceType) || 'b2b',
          tone: params.tone as EmailTone,
          keyPoints: params.keyPoints,
          businessContext: params.businessContext,
          recipientContext: params.recipientContext,
        };

        if (!context.objective || !context.tone) {
          return NextResponse.json(
            { error: 'Missing required fields: objective, tone' },
            { status: 400 }
          );
        }

        const count = params.count || 5;
        const subjects = await generateSubjectLines(context, count);
        return NextResponse.json({ subjects });
      }

      case 'improve': {
        const { content, instruction, audienceType } = params;

        if (!content || !instruction) {
          return NextResponse.json(
            { error: 'Missing required fields: content, instruction' },
            { status: 400 }
          );
        }

        const improved = await improveEmail(
          content,
          instruction,
          audienceType || 'b2b'
        );
        return NextResponse.json({ improved });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate, subjects, or improve' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in sales AI email generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
