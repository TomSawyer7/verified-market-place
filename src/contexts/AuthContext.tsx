import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  status: string;
  mobile_number?: string;
  address?: string;
  birthday?: string;
  created_at?: string;
  avatar_url?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Failed to load profile', error);
      setProfile(null);
      return;
    }
    setProfile(data as Profile);
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (error) {
      console.error('Failed to load roles', error);
      setIsAdmin(false);
      return;
    }
    setIsAdmin((data || []).some(r => r.role === 'admin'));
  }, []);

  const syncUserState = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    await Promise.all([
      fetchProfile(nextUser.id),
      fetchRole(nextUser.id),
    ]);
  }, [fetchProfile, fetchRole]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await Promise.all([
        fetchProfile(user.id),
        fetchRole(user.id),
      ]);
    }
  }, [user, fetchProfile, fetchRole]);

  useEffect(() => {
    let isActive = true;

    const applySession = (nextSession: Session | null, shouldStopLoading = true) => {
      if (!isActive) return;

      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      void syncUserState(nextUser).finally(() => {
        if (isActive && shouldStopLoading) {
          setLoading(false);
        }
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const handleWindowFocus = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        applySession(session, false);
      });
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      isActive = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [syncUserState]);

  const signUp = async (email: string, password: string, metadata: { first_name: string; last_name: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const isAuthenticated = !!user;
  const isVerified = profile?.status === 'verified';

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isAuthenticated, isVerified, isAdmin, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
