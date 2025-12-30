import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if user already answered today's trivia
    const { data: existingResponse } = await supabase
      .from('trivia_responses')
      .select('id, answered_correctly, points_earned, question_id')
      .eq('user_id', user.id)
      .eq('answered_at', today)
      .single();

    if (existingResponse) {
      // User already answered - return their result
      const { data: question } = await supabase
        .from('trivia_questions')
        .select('id, question, correct_answer, wrong_answers, category')
        .eq('id', existingResponse.question_id)
        .single();

      return NextResponse.json({
        already_answered: true,
        answered_correctly: existingResponse.answered_correctly,
        points_earned: existingResponse.points_earned,
        question: question ? {
          id: question.id,
          question: question.question,
          correct_answer: question.correct_answer,
          category: question.category,
        } : null,
      });
    }

    // Get a random active question (prefer least-used questions)
    const { data: questions, error: questionsError } = await supabase
      .from('trivia_questions')
      .select('id, question, correct_answer, wrong_answers, category')
      .eq('is_active', true)
      .order('times_used', { ascending: true })
      .limit(10);

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No trivia questions available' },
        { status: 404 }
      );
    }

    // Pick a random question from the least-used ones
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    // Shuffle answers (correct + wrong) for presentation
    const allAnswers = [question.correct_answer, ...question.wrong_answers];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      already_answered: false,
      question: {
        id: question.id,
        question: question.question,
        answers: shuffledAnswers,
        category: question.category,
      },
    });
  } catch (error) {
    console.error('Error fetching daily trivia:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
