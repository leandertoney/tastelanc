import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables.');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_EMAIL = 'owner@tastelanc.com';
const TEST_PASSWORD = 'T@ste!23';

async function createTestOwner() {
  console.log('\n=== Creating Test Restaurant Owner ===\n');

  // Step 1: Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === TEST_EMAIL);

  let userId: string;

  if (existingUser) {
    console.log(`User ${TEST_EMAIL} already exists.`);
    userId = existingUser.id;

    // Update the user's password and metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Owner',
        role: 'restaurant_owner',
      },
    });

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }
    console.log('Updated user password and metadata.');
  } else {
    // Step 2: Create new user with admin API (bypasses email confirmation)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: 'Test Owner',
        role: 'restaurant_owner',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }

    userId = newUser.user.id;
    console.log(`Created user: ${TEST_EMAIL}`);
  }

  console.log(`User ID: ${userId}`);

  // Step 3: Find a restaurant to link, or create one
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name, slug, owner_id')
    .order('created_at', { ascending: true })
    .limit(5);

  if (fetchError) {
    console.error('Error fetching restaurants:', fetchError);
    return;
  }

  let restaurantId: string;
  let restaurantName: string;

  // Check if there's already a restaurant linked to this user
  const linkedRestaurant = restaurants?.find((r) => r.owner_id === userId);

  if (linkedRestaurant) {
    console.log(`\nRestaurant already linked: ${linkedRestaurant.name} (${linkedRestaurant.slug})`);
    restaurantId = linkedRestaurant.id;
    restaurantName = linkedRestaurant.name;
  } else {
    // Find an unowned restaurant or use the first one
    const unownedRestaurant = restaurants?.find((r) => !r.owner_id);
    const targetRestaurant = unownedRestaurant || restaurants?.[0];

    if (targetRestaurant) {
      // Link this restaurant to the user
      const { error: linkError } = await supabase
        .from('restaurants')
        .update({ owner_id: userId })
        .eq('id', targetRestaurant.id);

      if (linkError) {
        console.error('Error linking restaurant:', linkError);
        return;
      }

      restaurantId = targetRestaurant.id;
      restaurantName = targetRestaurant.name;
      console.log(`\nLinked restaurant: ${restaurantName} (${targetRestaurant.slug})`);
    } else {
      // No restaurants exist, create a test one
      const { data: newRestaurant, error: createRestError } = await supabase
        .from('restaurants')
        .insert({
          name: 'Test Restaurant',
          slug: 'test-restaurant',
          address: '123 Main St',
          city: 'Lancaster',
          state: 'PA',
          owner_id: userId,
          is_active: true,
          is_verified: true,
          categories: ['bars', 'dinner'],
        })
        .select()
        .single();

      if (createRestError) {
        console.error('Error creating restaurant:', createRestError);
        return;
      }

      restaurantId = newRestaurant.id;
      restaurantName = newRestaurant.name;
      console.log(`\nCreated and linked new restaurant: ${restaurantName}`);
    }
  }

  console.log(`\n=== Setup Complete ===`);
  console.log(`\nLogin credentials:`);
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`\nRestaurant: ${restaurantName}`);
  console.log(`\nYou can now log in at /login and access /dashboard\n`);
}

createTestOwner().catch(console.error);
