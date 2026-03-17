import { NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/game/question-generator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const questions = await generateQuestions();

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Not enough data to generate questions for this market.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ questions }, {
      headers: {
        // Cache for 5 minutes — questions are shuffled client-side anyway
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error generating game questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
