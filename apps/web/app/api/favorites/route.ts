import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Check if user has favorited a restaurant
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isFavorited: false, count: 0 });
    }

    // Check if user has favorited this restaurant
    const { data: favorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    return NextResponse.json({
      isFavorited: !!favorite,
    });
  } catch (error) {
    console.error('Error checking favorite:', error);
    return NextResponse.json({ error: 'Failed to check favorite' }, { status: 500 });
  }
}

// POST - Add a favorite
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { restaurant_id } = await request.json();

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Must be logged in to favorite' }, { status: 401 });
    }

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, restaurant_id });

    if (error) {
      // Ignore duplicate errors (already favorited)
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already favorited' });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
