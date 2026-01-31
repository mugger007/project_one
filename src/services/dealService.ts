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
    const dealsWithImages: DealWithImage[] = unswipedDeals?.map((deal: Deal) => {
      const primaryImage = imagesData?.find((img: DealImage) => img.deal_id === deal.id && img.is_primary);
      const allDealImages = imagesData?.filter((img: DealImage) => img.deal_id === deal.id) || [];
      
      const imageUrl = primaryImage
        ? supabase.storage.from('deals_images').getPublicUrl(primaryImage.path).data.publicUrl
        : null;

      const allImageUrls = allDealImages.map(img => 
        supabase.storage.from('deals_images').getPublicUrl(img.path).data.publicUrl
      );

      return {
        ...deal,
        imageUrl,
        allImages: allImageUrls,
      };
    }).filter((deal): deal is DealWithImage => deal.imageUrl !== null && deal.imageUrl !== undefined) || [];

    return dealsWithImages;
  } catch (error) {
    console.error('❌ Error fetching deals:', error);
    Alert.alert('Error', 'Failed to load deals');
    return [];
  }
};
