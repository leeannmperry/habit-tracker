import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use a flag so whichever resolves first — onAuthStateChange INITIAL_SESSION
    // or getSession() — clears the loading state exactly once.
    let settled = false;

    const settle = (s: Session | null) => {
      setSession(s);
      if (!settled) { settled = true; setLoading(false); }
    };

    // onAuthStateChange fires INITIAL_SESSION synchronously on some platforms
    // before getSession() resolves, so it can be the faster path.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') {
        settle(s);
      } else {
        setSession(s);
      }
    });

    // getSession() is the authoritative check; always finishes loading even if
    // the storage layer throws (e.g. incognito cookie restrictions).
    supabase.auth.getSession()
      .then(({ data }) => settle(data.session))
      .catch(() => settle(null));

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
