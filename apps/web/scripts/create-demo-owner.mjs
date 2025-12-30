import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lfwkcitwjftgkpjxnttv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmd2tjaXR3amZ0Z2twanhudHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwNTg0MCwiZXhwIjoyMDc5NjgxODQwfQ.xmViSKYcgCMLS-h2YcQ2C8lMC2Uct53_tjGvQs1Os1o'
);

const OWNER_EMAIL = 'owner@tastelanc.com';
const OWNER_PASSWORD = 'T@ste!23';

async function createDemoOwner() {
  console.log('Creating demo owner account...\n');

  // Step 1: Check if user already exists
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  let ownerId;
  const existingUser = existingUsers.users.find(u => u.email === OWNER_EMAIL);

  if (existingUser) {
    console.log(`✓ User already exists: ${existingUser.email} (${existingUser.id})`);
    ownerId = existingUser.id;

    // Update user metadata to ensure they have the restaurant_owner role
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        user_metadata: {
          full_name: existingUser.user_metadata?.full_name || 'Demo Owner',
          role: 'restaurant_owner',
        },
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
    } else {
      console.log('✓ Updated user role to restaurant_owner');
    }
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Owner',
        role: 'restaurant_owner',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      process.exit(1);
    }

    console.log(`✓ Created user: ${newUser.user.email} (${newUser.user.id})`);
    ownerId = newUser.user.id;
  }

  // Step 2: Get or create a tier
  const { data: tiers, error: tierError } = await supabase
    .from('tiers')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1);

  if (tierError) {
    console.error('Error fetching tiers:', tierError);
    process.exit(1);
  }

  if (!tiers || tiers.length === 0) {
    console.error('No tiers found in database. Please create tiers first.');
    process.exit(1);
  }

  const tierId = tiers[0].id;
  console.log(`✓ Using tier: ${tiers[0].display_name} (${tierId})`);

  // Step 3: Check if restaurant already exists for this owner
  const { data: existingRestaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', ownerId)
    .single();

  if (existingRestaurant) {
    console.log(`✓ Restaurant already exists: ${existingRestaurant.name} (${existingRestaurant.slug})`);
    console.log('\n✅ Demo owner setup complete!');
    console.log('\nLogin credentials:');
    console.log(`Email: ${OWNER_EMAIL}`);
    console.log(`Password: ${OWNER_PASSWORD}`);
    console.log('\nAccess the dashboard at: http://localhost:3000/login');
    process.exit(0);
  }

  // Step 4: Create demo restaurant
  const restaurantData = {
    owner_id: ownerId,
    tier_id: tierId,
    name: 'Demo Restaurant',
    slug: 'demo-restaurant',
    address: '123 Main Street',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '17601',
    phone: '(717) 555-0123',
    website: 'https://demorestaurant.com',
    latitude: 40.0379,
    longitude: -76.3055,
    description: 'A demo restaurant for testing the owner dashboard.',
    primary_color: '#A41E22',
    secondary_color: '#D4AF37',
    categories: ['bars', 'dinner'],
    is_active: true,
    is_verified: true,
  };

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert(restaurantData)
    .select()
    .single();

  if (restaurantError) {
    console.error('Error creating restaurant:', restaurantError);
    process.exit(1);
  }

  console.log(`✓ Created restaurant: ${restaurant.name} (${restaurant.slug})`);

  // Step 5: Create default hours
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hoursData = daysOfWeek.map(day => ({
    restaurant_id: restaurant.id,
    day_of_week: day,
    open_time: day === 'sunday' ? '11:00' : '10:00',
    close_time: day === 'friday' || day === 'saturday' ? '23:00' : '22:00',
    is_closed: false,
  }));

  const { error: hoursError } = await supabase
    .from('restaurant_hours')
    .insert(hoursData);

  if (hoursError) {
    console.error('Warning: Could not create hours:', hoursError);
  } else {
    console.log('✓ Created default hours');
  }

  console.log('\n✅ Demo owner setup complete!');
  console.log('\nLogin credentials:');
  console.log(`Email: ${OWNER_EMAIL}`);
  console.log(`Password: ${OWNER_PASSWORD}`);
  console.log('\nAccess the dashboard at: http://localhost:3000/login');
}

createDemoOwner().catch(console.error);
