import { supabase } from '../supabase';

export interface AuthResult {
  userId?: string;
  error?: string;
}

/**
 * Sign up a new user
 */
export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: 'User', gender: 'unknown' } }
    });

    if (error) {
      return { error: error.message };
    }

    return { userId: data.user?.id };
  } catch (err: any) {
    return { error: err.message || 'Failed to sign up' };
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { userId: data.user?.id };
  } catch (err: any) {
    return { error: err.message || 'Failed to sign in' };
  }
};

/**
 * Sign in with OAuth provider
 */
export const signInWithOAuth = async (provider: 'google' | 'github' | 'facebook') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider });

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Failed to sign in with OAuth' };
  }
};
