import { Alert } from 'react-native';
import { supabase } from '../supabase';

export interface Deal {
  id: string;
  merchant_name: string;
  time_period_start: string;
  time_period_end: string;
  deal_nature: string;
  terms_conditions: string;
}

export interface DealImage {
  id: string;
  deal_id: string;
  path: string;
  filename: string;
  size_bytes?: number;
  is_primary: boolean;
}

export interface DealWithImage extends Deal {
  imageUrl?: string;
  allImages?: string[];
}

export const fetchDeals = async (userId: string | null): Promise<DealWithImage[]> => {
  try {
    // Fetch deals
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('id, merchant_name, time_period_start, time_period_end, deal_nature, terms_conditions')
      .eq('is_active', true);

    if (dealsError) throw dealsError;

    // Fetch user's previous swipes
    let swipedDealIds: string[] = [];
    if (userId) {
      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('deal_id')
        .eq('user_id', userId);

      if (swipesError) {
        console.error('Error fetching swipes:', swipesError);
      } else {
        swipedDealIds = swipesData?.map(swipe => swipe.deal_id) || [];
      }
    }

    // Filter out already swiped deals
    const unswipedDeals = dealsData?.filter(deal => !swipedDealIds.includes(deal.id)) || [];

    // Fetch deal images
    const { data: imagesData, error: imagesError } = await supabase
      .from('deal_images')
      .select('id, deal_id, path, filename, is_primary');

    if (imagesError) throw imagesError;

    // Combine deals with their primary images
    const dealsWithImages: DealWithImage[] = (unswipedDeals
      ?.map((deal: Deal) => {
        const primaryImage = imagesData?.find((img: DealImage) => img.deal_id === deal.id && img.is_primary);
        const allDealImages = imagesData?.filter((img: DealImage) => img.deal_id === deal.id) || [];
        
        const imageUrl = primaryImage
          ? supabase.storage.from('deals_images').getPublicUrl(primaryImage.path).data.publicUrl
          : undefined;

        const allImageUrls = allDealImages.map(img => 
          supabase.storage.from('deals_images').getPublicUrl(img.path).data.publicUrl
        );

        if (!imageUrl) {
          return undefined;
        }

        return {
          ...deal,
          imageUrl,
          allImages: allImageUrls,
        } as DealWithImage;
      })
      .filter((deal): deal is DealWithImage => !!deal) || []);

    return dealsWithImages;
  } catch (error) {
    console.error('❌ Error fetching deals:', error);
    Alert.alert('Error', 'Failed to load deals');
    return [];
  }
};

export const createDeal = async (
  userId: string,
  merchantName: string,
  dealNature: string,
  termsConditions: string,
  startDate: string,
  endDate: string,
  imageUri: string,
  location?: string
): Promise<{ success: boolean; dealId?: string; error?: string }> => {
  const DEFAULT_SG_LOCATION = 'SRID=4326;POINT(103.8198 1.3521)';

  const sanitizeMerchantName = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  };

  try {
    // Create deal
    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .insert([
        {
          created_by: userId,
          merchant_name: merchantName,
          deal_nature: dealNature,
          terms_conditions: termsConditions,
          time_period_start: startDate,
          time_period_end: endDate,
          location: location?.trim() || DEFAULT_SG_LOCATION,
          is_active: true,
        },
      ])
      .select('id')
      .single();

    if (dealError) {
      throw dealError;
    }

    if (!dealData?.id) {
      throw new Error('Failed to create deal - no ID returned');
    }

    // Upload image
    const merchantSlug = sanitizeMerchantName(merchantName) || 'merchant';
    const createdAtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const pageIndex = 1;
    const pageSuffix = pageIndex > 1 ? `_${pageIndex}` : '';
    const filename = `${merchantSlug}_${createdAtStamp}_${pageSuffix}.jpg`;
    const filepath = `${filename}`;
    
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const file = await response.blob();
      const sizeBytes = file.size;
      const sizeInMB = (sizeBytes / 1024 / 1024).toFixed(2);

      // Validate blob
      if (sizeBytes === 0) {
        throw new Error('❌ Blob is empty - image failed to load');
      }

      const MAX_SIZE_MB = 10;
      const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
      if (sizeBytes > maxSizeBytes) {
        throw new Error(`❌ Image too large: ${sizeInMB}MB (max: ${MAX_SIZE_MB}MB)`);
      }
      
      const { error: uploadError } = await supabase.storage
        .from('deals_images')
        .upload(filepath, file, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Determine primary flag (true for the first image of a deal)
      const { count: existingImageCount, error: countError } = await supabase
        .from('deal_images')
        .select('id', { count: 'exact', head: true })
        .eq('deal_id', dealData.id);

      if (countError) {
        throw countError;
      }

      const isPrimary = (existingImageCount ?? 0) === 0;

      // Create deal image metadata record in database
      const { error: imageRecordError, data: imageRecordData } = await supabase
        .from('deal_images')
        .insert([
          {
            deal_id: dealData.id,
            path: filepath,
            filename: filename,
            size_bytes: sizeBytes,
            is_primary: isPrimary,
          },
        ])
        .select();

      if (imageRecordError) {
        throw imageRecordError;
      }

      return { success: true, dealId: dealData.id };
    } catch (uploadError: any) {
      // Still consider the deal creation successful as it's already in the database
      console.error('Image upload/processing failed:', uploadError?.message || uploadError);
      return { success: true, dealId: dealData.id };
    }
  } catch (error: any) {
    console.error('Error creating deal:', error?.message || error);
    return { success: false, error: error.message || 'Failed to create deal' };
  }
};
