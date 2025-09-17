import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Employee = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  active: boolean;
  "Default Billing Rate": number;
};

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchEmployee(session.user.id);
      }
      
      setLoading(false);
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchEmployee(session.user.id);
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEmployee = async (userId: string) => {
    try {
      console.log('Fetching employee for userId:', userId);
      const { data, error } = await supabase
        .from('Employees')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Employee fetch result:', { data, error });
      
      if (data && !error) {
        setEmployee(data);
        console.log('Employee set:', data);
      } else if (!data) {
        console.log('No employee record found for user');
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setEmployee(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      // Create employee record
      const { error: employeeError } = await (supabase as any)
        .from('Employees')
        .insert({
          user_id: data.user.id,
          name,
          email,
          role: 'employee', // Default role
        });

      if (employeeError) {
        return { error: employeeError.message };
      }
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    employee,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};