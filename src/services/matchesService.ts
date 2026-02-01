import { supabase } from '../supabase';

export interface Match {
  id: string;
  deal_id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  dealName?: string;
  matchedUserId?: string;
  matchedUserName?: string;
  dealImageUrl?: string;
}

export const fetchUserMatches = async (userId: string | null): Promise<Match[]> => {
  if (!userId) return [];

  try {
    // Query matches where current user is either user1_id or user2_id
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id, deal_id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (matchesError) throw matchesError;

    if (!matchesData || matchesData.length === 0) {
      return [];
    }

    // Fetch deal names for each match
    const dealIds = matchesData.map(match => match.deal_id);
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('id, merchant_name')
      .in('id', dealIds);

    if (dealsError) throw dealsError;

    // Fetch deal images
    const { data: imagesData, error: imagesError } = await supabase
      .from('deal_images')
      .select('deal_id, path, is_primary')
      .in('deal_id', dealIds)
      .eq('is_primary', true);

    if (imagesError) throw imagesError;

    // Get matched user IDs
    const matchedUserIds = matchesData.map(match => 
      match.user1_id === userId ? match.user2_id : match.user1_id
    );

    // Fetch user names
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', matchedUserIds);

    if (usersError) throw usersError;

    // Combine matches with deal names, images, and user names
    const enrichedMatches = matchesData.map(match => {
      const deal = dealsData?.find(d => d.id === match.deal_id);
      const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const matchedUser = usersData?.find(u => u.id === matchedUserId);
      const dealImage = imagesData?.find(img => img.deal_id === match.deal_id);
      
      const imageUrl = dealImage
        ? supabase.storage.from('deals_images').getPublicUrl(dealImage.path).data.publicUrl
        : null;

      return {
        ...match,
        dealName: deal?.merchant_name || 'Unknown Deal',
        matchedUserId: matchedUserId,
        matchedUserName: matchedUser?.name || 'Unknown User',
        dealImageUrl: imageUrl || undefined,
      };
    });

    return enrichedMatches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};
