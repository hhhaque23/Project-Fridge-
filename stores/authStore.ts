import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// Determine the correct redirect URL for OAuth flows
function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // On web, redirect back to current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/(auth)/login`;
    }
    return '';
  }
  // On mobile (Expo Go or native), use deep link
  return Linking.createURL('(auth)/login');
}

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isOnboarded: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setOnboarded: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isOnboarded: false,

  initialize: async () => {
    // Demo mode: if no real Supabase URL, set a demo user so the app is browsable
    const isDemoMode = !process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');

    if (isDemoMode) {
      set({
        session: { user: { id: 'demo-user-id' } } as any,
        user: {
          id: 'demo-user-id',
          email: 'demo@freshscan.app',
          display_name: 'Demo User',
          auth_provider: 'demo',
          avatar_url: '',
          household_id: null,
          dietary_profile: { allergies: [], intolerances: [], diet_type: null, calorie_target: null, macro_split: null },
          notification_preferences: null,
          onboarding_completed: true,
          subscription_tier: 'Pro',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isOnboarded: true,
        isLoading: false,
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          session,
          user: profile,
          isOnboarded: profile?.onboarding_completed ?? false,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({
            session,
            user: profile,
            isOnboarded: profile?.onboarding_completed ?? false,
          });
        } else {
          set({ session: null, user: null, isOnboarded: false });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });
    return { error: error as Error | null };
  },

  signInWithOAuth: async (provider: 'google' | 'apple') => {
    const redirectTo = getRedirectUrl();

    if (Platform.OS === 'web') {
      // Web: Supabase handles the redirect flow automatically
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: false },
      });
      return { error: error as Error | null };
    }

    // Mobile: open in in-app browser, handle deep link back
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return { error: error as Error | null };

      const WebBrowser = require('expo-web-browser');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // Parse the tokens from the URL and set session
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
      return { error: null };
    } catch (e: any) {
      return { error: e as Error };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isOnboarded: false });
  },

  updateProfile: async (updates: Partial<User>) => {
    const user = get().user;
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (data) set({ user: data });
  },

  setOnboarded: () => set({ isOnboarded: true }),
}));
