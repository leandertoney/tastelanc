import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ACTION_DISPLAY_NAMES } from '@/lib/rewards';
import { RewardActionType } from '@/types/database';

export async function GET(request: Request) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get transactions with restaurant info
    const { data: transactions, error: txError, count } = await supabase
      .from('point_transactions')
      .select(`
        id,
        action_type,
        points,
        multiplier,
        base_points,
        restaurant_id,
        metadata,
        created_at,
        restaurant:restaurants(id, name, slug, logo_url)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return NextResponse.json(
        { error: 'Failed to fetch transaction history' },
        { status: 500 }
      );
    }

    // Format transactions for response
    const formattedTransactions = (transactions || []).map((tx) => {
      // Supabase join returns array, get first item
      const restaurant = Array.isArray(tx.restaurant) ? tx.restaurant[0] : tx.restaurant;
      return {
        id: tx.id,
        action_type: tx.action_type,
        action_display_name: ACTION_DISPLAY_NAMES[tx.action_type as RewardActionType] || tx.action_type,
        points: tx.points,
        multiplier: tx.multiplier,
        base_points: tx.base_points,
        restaurant_id: tx.restaurant_id,
        restaurant_name: restaurant?.name || null,
        restaurant_logo_url: restaurant?.logo_url || null,
        created_at: tx.created_at,
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      total_count: count || 0,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Error fetching rewards history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
