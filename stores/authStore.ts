import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';

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
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error as Error | null };
  },

  signInWithOAuth: async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    return { error: error as Error | null };
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
