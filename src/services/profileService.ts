import { supabase } from '../supabase';
import * as Location from 'expo-location';
import { awardPoints, ActivityType, hasEarnedPoints } from './pointsService';

export interface UserProfile {
  name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  location: string;
  notification_settings: boolean;
}

/**
 * Load user profile from database
 */
export const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('name, dob, gender, email, phone, notification_settings')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading profile:', error);
      return null;
    }

    // Fetch location separately using RPC
    let locationString = '';
    if (data) {
      try {
        const { data: locationData, error: locationError } = await supabase.rpc(
          'get_user_location_coords',
          { user_id: userId }
        );

        if (!locationError && locationData && locationData.length > 0) {
          const coords = locationData[0];
          if (coords.lat !== null && coords.lon !== null) {
            locationString = `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
          }
        }
      } catch (locError) {
        // Location fetch failed, continue with empty location
      }
    }

    if (data) {
      return {
        name: data.name || '',
        dob: data.dob || '',
        gender: data.gender || 'prefer_not_to_say',
        email: data.email || '',
        phone: data.phone || '',
        location: locationString,
        notification_settings: data.notification_settings ?? true,
      };
    }

    return null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
};

/**
 * Save user profile to database
 */
export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = {
      id: userId,
      gender: profile.gender,
      notification_settings: profile.notification_settings,
    };

    if (profile.name.trim()) updateData.name = profile.name.trim();
    if (profile.dob) updateData.dob = profile.dob;
    if (profile.email.trim()) updateData.email = profile.email.trim();
    if (profile.phone.trim()) updateData.phone = profile.phone.trim();

    // Handle location (geography type)
    if (profile.location.trim()) {
      const [lat, lon] = profile.location.split(',').map(coord => coord.trim());
      if (lat && lon) {
        updateData.location = `SRID=4326;POINT(${lon} ${lat})`;
      }
    }

    const { error } = await supabase.from('users').upsert(updateData);

    if (error) {
      return { success: false, error: error.message };
    }

    // Award points for completing profile (if all key fields are filled)
    // Only award once - check if user has already earned profile completion points
    const isProfileComplete = 
      profile.name.trim() !== '' &&
      profile.dob !== '' &&
      profile.gender !== '' &&
      profile.location.trim() !== '';

    if (isProfileComplete) {
      const alreadyEarned = await hasEarnedPoints(userId, ActivityType.COMPLETE_PROFILE);
      if (!alreadyEarned) {
        await awardPoints(userId, ActivityType.COMPLETE_PROFILE);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save profile' };
  }
};

/**
 * Get current location coordinates
 */
export const getCurrentLocation = async (): Promise<{ location: string; error?: string }> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { location: '', error: 'Location permission denied' };
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    return { location: locationString };
  } catch (error: any) {
    return { location: '', error: error.message || 'Failed to get location' };
  }
};
