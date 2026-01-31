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
      // Found at least one matching user
      const matchedUserId = matchingSwipes[0].user_id;

      // Insert match into matches table
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
