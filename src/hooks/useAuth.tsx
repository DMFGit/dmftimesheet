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
  isAdmin: boolean;
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

  // Use role-based admin check instead of hardcoded email
  const isAdmin = employee?.role === 'admin';

  useEffect(() => {
    const initializeAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchOrCreateEmployee(session.user);
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
        // Use setTimeout to defer async operations
        setTimeout(async () => {
          await fetchOrCreateEmployee(session.user);
        }, 0);
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrCreateEmployee = async (user: User) => {
    try {
      // First try to fetch existing employee
      const { data, error } = await supabase
        .from('Employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data && !error) {
        setEmployee(data);
        return;
      }
      
      // If no employee exists, create one using the secure function
      if (!data && user.email) {
        const { data: employeeId, error: functionError } = await supabase
          .rpc('create_employee_for_oauth_user', {
            p_user_id: user.id,
            p_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
            p_email: user.email
          });
        
        if (employeeId && !functionError) {
          // Fetch the created employee record
          const { data: newEmployee } = await supabase
            .from('Employees')
            .select('*')
            .eq('id', employeeId)
            .single();
          
          if (newEmployee) {
            setEmployee(newEmployee);
          }
        } else {
          console.error('Error creating employee:', functionError);
          setEmployee(null);
        }
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error fetching/creating employee:', err);
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
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: name,
          full_name: name,
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    // Employee record will be created automatically via the fetchOrCreateEmployee function
    // when the auth state changes, using the secure create_employee_for_oauth_user function
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    employee,
    loading,
    isAdmin,
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