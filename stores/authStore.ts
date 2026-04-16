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
    // Temporarily bypass auth: always set a demo user so users can browse
    // the app immediately. Real auth can still sign in if user chooses to,
    // but the login page is skipped by default.
    const demoUser: User = {
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
    };

    // Try to load real Supabase session first (if user has actually signed in)
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
          user: profile || { ...demoUser, id: session.user.id, email: session.user.email || demoUser.email },
          isOnboarded: profile?.onboarding_completed ?? true,
          isLoading: false,
        });

        // Listen for future auth changes
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (newSession?.user) {
            const { data: p } = await supabase
              .from('users')
              .select('*')
              .eq('id', newSession.user.id)
              .single();
            set({
              session: newSession,
              user: p || { ...demoUser, id: newSession.user.id, email: newSession.user.email || demoUser.email },
              isOnboarded: p?.onboarding_completed ?? true,
            });
          }
          // Don't clear user on sign-out - fall back to demo
        });
        return;
      }
    } catch {}

    // No real session - use demo user to bypass login
    set({
      session: { user: { id: demoUser.id } } as any,
      user: demoUser,
      isOnboarded: true,
      isLoading: false,
    });
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
