import { create } from 'zustand';
import { supabase } from '../supabase';

interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  loadUserSettings: () => Promise<any>;
  saveUserSettings: (settings: any) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: null,

  setUserId: (id: string | null) => set({ userId: id }),

  loadUserSettings: async () => {
    const { userId } = get();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('match_settings')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading user settings:', error);
      return null;
    }

    return data?.match_settings || {};
  },

  saveUserSettings: async (settings: any) => {
    const { userId } = get();
    if (!userId) return;

    const { error } = await supabase
      .from('users')
      .update({ match_settings: settings })
      .eq('id', userId);

    if (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  },
}));