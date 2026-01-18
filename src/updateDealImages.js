require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminUserId = process.env.ADMIN_USER_ID;

if (!supabaseUrl || !supabaseKey || !adminUserId) {
  console.error('Missing Supabase credentials or admin user ID in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDealImages() {
  try {
    // Fetch images from the deals_images bucket
    const { data: images, error: listError } = await supabase.storage
      .from('deals_images')
      .list('', {
        sortBy: { column: 'updated_at', order: 'desc' },
      });

    if (listError) {
      console.error('Error listing images:', listError);
      return;
    }

    if (!images || images.length === 0) {
      console.log('No images found in deals_images bucket');
      return;
    }

    // Process each image and prepare data for deal_images table
    const dealImagesData = images.map((image) => {
      const path = image.name;
      const filename = path;
      const contentType = image.metadata?.mimetype || 'application/octet-stream';
      const sizeBytes = image.metadata?.size || 0;
      const isPrimary = path.endsWith('_1.jpg') || path.endsWith('_1.png') || path.endsWith('_1.jpeg'); // Adjust extensions as needed

      // Extract deal_id from path (assuming format: deal_id_filename.ext)
      const parts = path.split('_');
      const dealId = parts.length > 0 ? parts[0] : null;

      if (!dealId) {
        console.warn(`Could not extract deal_id from path: ${path}`);
        return null;
      }

      return {
        deal_id: '21ce2799-be9e-419d-bed0-e14a089bcb1d',
        path,
        filename,
        size_bytes: sizeBytes,
        is_primary: isPrimary,
      };
    }).filter(Boolean); // Remove null entries

    if (dealImagesData.length === 0) {
      console.log('No valid deal images to insert');
      return;
    }

    // Insert into deal_images table
    const { data, error: insertError } = await supabase
      .from('deal_images')
      .insert(dealImagesData);

    if (insertError) {
      console.error('Error inserting deal images:', insertError);
    } else {
      console.log(`Successfully inserted ${dealImagesData.length} deal images:`, data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateDealImages();