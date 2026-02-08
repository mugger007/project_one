import { Alert } from 'react-native';
import { supabase } from '../supabase';

export const logSwipe = async (userId: string | null, dealId: string, direction: 'left' | 'right') => {
  if (!userId) {
    console.error('No user ID available for swipe logging');
    return;
  }

  try {
    const { error } = await supabase
      .from('swipes')
      .insert({
        user_id: userId,
        deal_id: dealId,
        direction: direction,
      });

    if (error) {
      console.error('Error logging swipe:', error);
    }
  } catch (error) {
    console.error('Error logging swipe:', error);
  }
};

export const checkForMatch = async (userId: string | null, dealId: string) => {
  if (!userId) {
    console.error('No user ID available for match checking');
    return;
  }

  try {
    // Check if another user has also swiped right on the same deal
    const { data: matchingSwipes, error: swipesError } = await supabase
      .from('swipes')
      .select('user_id, created_at')
      .eq('deal_id', dealId)
      .eq('direction', 'right')
      .neq('user_id', userId);

    if (swipesError) {
      console.error('Error checking for matches:', swipesError);
      return;
    }

    if (matchingSwipes && matchingSwipes.length > 0) {
      // Check each potential match for compatibility
      for (const swipe of matchingSwipes) {
        const matchedUserId = swipe.user_id;

        // Check compatibility using the database function
        const { data: isCompatible, error: compatError } = await supabase.rpc(
          'check_user_compatibility',
          {
            user1_id: userId,
            user2_id: matchedUserId,
          }
        );

        if (compatError) {
          console.error('Error checking compatibility:', compatError);
          continue;
        }

        // Skip if users are not compatible
        if (!isCompatible) {
          continue;
        }

        // Check if match already exists to avoid duplicates
        const { data: existingMatch, error: existingError } = await supabase
          .from('matches')
          .select('id')
          .or(`and(user1_id.eq.${userId},user2_id.eq.${matchedUserId},deal_id.eq.${dealId}),and(user1_id.eq.${matchedUserId},user2_id.eq.${userId},deal_id.eq.${dealId})`)
          .maybeSingle();

        if (existingError) {
          console.error('Error checking existing match:', existingError);
          continue;
        }

        // If no existing match and users are compatible, create the match
        if (!existingMatch) {
          const { error: matchError } = await supabase
            .from('matches')
            .insert({
              user1_id: userId,
              user2_id: matchedUserId,
              deal_id: dealId,
            });

          if (matchError) {
            console.error('Error creating match:', matchError);
          } else {
            // Notify the current user
            Alert.alert(
              '🎉 It\'s a Match!',
              'You and another user both liked this deal! Check your Matches to connect.',
              [{ text: 'OK' }]
            );
            return; // Exit after first successful match
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in checkForMatch:', error);
  }
};

export const checkForNewMatches = async (userId: string | null) => {
  if (!userId) return;

  try {
    // Query matches where current user is user2_id and hasn't been notified yet
    const { data: newMatches, error } = await supabase
      .from('matches')
      .select('id, deal_id, user1_id, user2_id, created_at')
      .eq('user2_id', userId)
      .is('notified_user2', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking for new matches:', error);
      return;
    }

    if (newMatches && newMatches.length > 0) {
      const matchCount = newMatches.length;
      const matchText = matchCount === 1 ? 'match' : 'matches';
      const matchIds = newMatches.map(match => match.id);
      
      Alert.alert(
        '🎉 New Matches!',
        `You have ${matchCount} new ${matchText}! Check your Matches tab to see who you connected with.`,
        [{ text: 'OK' }]
      );

      // Mark these matches as notified for user2
      const { error: updateError } = await supabase
        .from('matches')
        .update({ notified_user2: true })
        .in('id', matchIds);

      if (updateError) {
        console.error('Error updating match notification status:', updateError);
      }
    }
  } catch (error) {
    console.error('Error in checkForNewMatches:', error);
  }
};
