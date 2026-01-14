require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDeals() {
  const now = new Date();
  
  const deals = [
    {
      merchant_name: 'Starbucks',
      time_period_start: '2024-01-01T00:00:00Z',
      time_period_end: '2024-12-31T23:59:59Z',
      deal_nature: 'Buy one coffee, get one 50% off',
      location: 'POINT(-74.006 40.7128)', // Example: New York City coordinates
      terms_conditions: 'Valid for hot beverages only. Cannot be combined with other offers.',
      created_by: '00000000-0000-0000-0000-000000000000', // Replace with actual admin user UUID
      is_active: new Date('2024-12-31T23:59:59Z') > now,
    },
    {
      merchant_name: 'Pizza Palace',
      time_period_start: '2024-02-01T00:00:00Z',
      time_period_end: '2024-02-28T23:59:59Z',
      deal_nature: '20% off on all pizzas',
      location: 'POINT(-87.6298 41.8781)', // Example: Chicago coordinates
      terms_conditions: 'Valid for dine-in only. Excludes delivery fees.',
      created_by: '00000000-0000-0000-0000-000000000000', // Replace with actual admin user UUID
      is_active: new Date('2024-02-28T23:59:59Z') > now,
    },
  ];

  try {
    const { data, error } = await supabase
      .from('deals')
      .insert(deals);

    if (error) {
      console.error('Error inserting deals:', error);
    } else {
      console.log('Successfully inserted deals:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateDeals();