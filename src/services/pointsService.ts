import { supabase } from '../supabase';

export enum ActivityType {
  LOGIN = 'login',
  COMPLETE_PROFILE = 'complete_profile',
  MATCH = 'match',
}

// Points awarded for each activity
const ACTIVITY_POINTS: Record<ActivityType, number> = {
  [ActivityType.LOGIN]: 10,
  [ActivityType.COMPLETE_PROFILE]: 50,
  [ActivityType.MATCH]: 25,
};

export interface PointsResult {
  success: boolean;
  points?: number;
  error?: string;
}

/**
 * Award points to a user for completing an activity
 */
export const awardPoints = async (
  userId: string,
  activityType: ActivityType
): Promise<PointsResult> => {
  try {
    const pointsEarned = ACTIVITY_POINTS[activityType];

    const { error } = await supabase
      .from('points_log')
      .insert({
        user_id: userId,
        activity_type: activityType,
        points_earned: pointsEarned,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }

    console.log(`Awarded ${pointsEarned} points to user ${userId} for ${activityType}`);
    return { success: true, points: pointsEarned };
  } catch (error: any) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message || 'Failed to award points' };
  }
};

/**
 * Get total points for a user
 */
export const getUserTotalPoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('points_log')
      .select('points_earned')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user points:', error);
      return 0;
    }

    const total = data?.reduce((sum, record) => sum + record.points_earned, 0) || 0;
    return total;
  } catch (error) {
    console.error('Error fetching user points:', error);
    return 0;
  }
};

/**
 * Get points history for a user
 */
export const getUserPointsHistory = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('points_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching points history:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching points history:', error);
    return null;
  }
};

/**
 * Check if user has already earned points for a specific activity (ever)
 * (useful for one-time awards like profile completion)
 */
export const hasEarnedPoints = async (
  userId: string,
  activityType: ActivityType
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('points_log')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .limit(1);

    if (error) {
      console.error('Error checking points history:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking points history:', error);
    return false;
  }
};

/**
 * Check if user has already earned points for a specific activity today
 * (useful for limiting daily login points)
 */
export const hasEarnedPointsToday = async (
  userId: string,
  activityType: ActivityType
): Promise<boolean> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('points_log')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .gte('created_at', today.toISOString())
      .limit(1);

    if (error) {
      console.error('Error checking daily points:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking daily points:', error);
    return false;
  }
};
