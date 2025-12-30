import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { calculatePoints, checkPremiumStatus, PREMIUM_MULTIPLIER, BASE_POINTS } from '@/lib/rewards';

interface AnswerRequest {
  question_id: string;
  answer: string;
}

export async function POST(request: Request) {
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

    // Parse request body
    const body: AnswerRequest = await request.json();
    const { question_id, answer } = body;

    if (!question_id || !answer) {
      return NextResponse.json(
        { error: 'Question ID and answer are required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if user already answered today
    const { data: existingResponse } = await supabase
      .from('trivia_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('answered_at', today)
      .single();

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already answered today\'s trivia question' },
        { status: 400 }
      );
    }

    // Get the question to check the answer
    const { data: question, error: questionError } = await supabase
      .from('trivia_questions')
      .select('id, correct_answer')
      .eq('id', question_id)
      .eq('is_active', true)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if answer is correct (case-insensitive)
    const isCorrect = answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

    // Calculate points (only award if correct)
    const isPremium = await checkPremiumStatus(supabase, user.id);
    const basePoints = BASE_POINTS.trivia;
    const multiplier = isPremium ? PREMIUM_MULTIPLIER : 1.0;
    const pointsEarned = isCorrect ? calculatePoints('trivia', isPremium) : 0;

    // Use service role client for database operations
    const adminClient = createServiceRoleClient();

    // Record the response
    const { error: responseError } = await adminClient
      .from('trivia_responses')
      .insert({
        user_id: user.id,
        question_id,
        answered_correctly: isCorrect,
        points_earned: pointsEarned,
        answered_at: today,
      });

    if (responseError) {
      console.error('Error recording trivia response:', responseError);
      return NextResponse.json(
        { error: 'Failed to record response' },
        { status: 500 }
      );
    }

    // Increment times_used on the question using SQL increment
    await adminClient
      .rpc('increment_trivia_times_used', { p_question_id: question_id })
      .then(({ error }) => {
        if (error) {
          // RPC might not exist, log and continue
          console.error('RPC increment_trivia_times_used failed:', error.message);
        }
      });

    // Award points if correct
    if (isCorrect) {
      // Create transaction record
      await adminClient
        .from('point_transactions')
        .insert({
          user_id: user.id,
          action_type: 'trivia',
          points: pointsEarned,
          multiplier,
          base_points: basePoints,
          metadata: { question_id },
        });

      // Update user_points
      const { data: existingPoints } = await adminClient
        .from('user_points')
        .select('id, total_points, lifetime_points')
        .eq('user_id', user.id)
        .single();

      if (existingPoints) {
        await adminClient
          .from('user_points')
          .update({
            total_points: existingPoints.total_points + pointsEarned,
            lifetime_points: existingPoints.lifetime_points + pointsEarned,
          })
          .eq('user_id', user.id);
      } else {
        await adminClient
          .from('user_points')
          .insert({
            user_id: user.id,
            total_points: pointsEarned,
            lifetime_points: pointsEarned,
          });
      }
    }

    // Get updated balance
    const { data: updatedPoints } = await adminClient
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      correct: isCorrect,
      correct_answer: question.correct_answer,
      points_earned: pointsEarned,
      new_balance: updatedPoints?.total_points ?? pointsEarned,
      message: isCorrect
        ? `Correct! You earned ${pointsEarned} points!`
        : `Incorrect. The correct answer was: ${question.correct_answer}`,
    });
  } catch (error) {
    console.error('Error submitting trivia answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
