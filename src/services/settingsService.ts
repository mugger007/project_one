import { supabase } from '../supabase';

export interface MatchSettings {
  gender: string;
  distance: number;
  minAge: number;
  maxAge: number;
}

/**
 * Load user match settings from database
 */
export const loadMatchSettings = async (userId: string): Promise<MatchSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('match_settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading match settings:', error);
      return null;
    }

    return data?.match_settings || null;
  } catch (error) {
    console.error('Error loading match settings:', error);
    return null;
  }
};

/**
 * Save user match settings and refresh compatibility cache
 */
export const saveMatchSettings = async (
  userId: string,
  settings: MatchSettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Save settings to database
    const { error: updateError } = await supabase
      .from('users')
      .update({ match_settings: settings })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Refresh compatibility cache after updating settings
    console.log('Starting compatibility cache refresh for user:', userId);
    const { data: refreshData, error: cacheError } = await supabase.rpc('refresh_user_compatibility_cache', {
      target_user_id: userId,
    });

    if (cacheError) {
      console.error('Failed to refresh compatibility cache:', {
        error: cacheError,
        code: cacheError.code,
        message: cacheError.message,
        details: cacheError.details,
        hint: cacheError.hint,
      });
      // Don't fail the operation if cache refresh fails
    } else {
      console.log('Compatibility cache refresh successful:', refreshData);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save settings' };
  }
};

/**
 * Log out the current user
 */
export const logout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to logout' };
  }
};
