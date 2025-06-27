/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, testConnection } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Test connection first
        const isConnected = await testConnection();
        if (!isConnected) {
          if (mounted) {
            setAuthError('Unable to connect to the database. Please check your internet connection and try again.');
            setLoading(false);
          }
          return;
        }

        // Get session with shorter timeout and retry logic
        let session = null;
        let sessionError = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`Session attempt ${attempt}/3`);
            
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session timeout')), 10000)
            );

            const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
            session = result.data?.session;
            sessionError = result.error;
            
            if (!sessionError) {
              break; // Success
            }
            
            if (attempt < 3) {
              console.log(`Session attempt ${attempt} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (error) {
            sessionError = error;
            if (attempt < 3) {
              console.log(`Session attempt ${attempt} failed with error, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }

        if (sessionError) {
          console.error('Session error after retries:', sessionError);
          if (mounted) {
            setAuthError('Failed to connect to authentication service. Please refresh the page and try again.');
            setLoading(false);
          }
          return;
        }

        console.log('Session:', session ? 'Found' : 'None');
        
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthError(null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthError('Failed to initialize authentication. Please refresh the page and try again.');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'User present' : 'No user');
        
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthError(null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Retry logic for profile fetch
      let profileData = null;
      let profileError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Profile fetch attempt ${attempt}/3`);
          
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
          );

          const result = await Promise.race([profilePromise, timeoutPromise]) as any;
          profileData = result.data;
          profileError = result.error;
          
          if (!profileError) {
            break; // Success
          }
          
          if (attempt < 3) {
            console.log(`Profile fetch attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        } catch (error) {
          profileError = error;
          if (attempt < 3) {
            console.log(`Profile fetch attempt ${attempt} failed with error, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (profileError) {
        console.error('Profile fetch error after retries:', profileError);
        
        // If profile doesn't exist, create a basic one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating basic profile...');
          await createBasicProfile(userId);
          return;
        }
        
        // For timeout errors, set auth error
        if (profileError.message?.includes('timeout')) {
          setAuthError('Connection timeout - please check your internet connection and try again');
        }
        
        setProfile(null);
        setLoading(false);
        return;
      }
      
      if (!profileData) {
        console.log('No profile found, creating basic profile...');
        await createBasicProfile(userId);
        return;
      }
      
      console.log('Profile fetched successfully:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        setAuthError('Connection timeout - please check your internet connection and try again');
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const createBasicProfile = async (userId: string) => {
    try {
      console.log('Creating basic profile for user:', userId);
      
      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email || '',
          role: 'patient',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }
      
      console.log('Basic profile created successfully');
      setProfile(data);
    } catch (error) {
      console.error('Error creating basic profile:', error);
      if (error instanceof Error) {
        setAuthError(`Failed to create user profile: ${error.message}`);
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    setAuthError(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create profile immediately after signup
    if (data.user) {
      try {
        console.log('Creating profile for new user:', data.user.id);
        
        const profileData = {
          id: data.user.id,
          email: data.user.email || email,
          role: userData.role || 'patient',
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          phone: userData.phone || null,
          date_of_birth: userData.date_of_birth || null,
          address: userData.address || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error during signup:', profileError);
          throw profileError;
        } else {
          console.log('Profile created successfully during signup:', profileResult);
          setProfile(profileResult);
          
          // If user is signing up as a doctor, create doctor profile
          if (userData.role === 'doctor') {
            await createDoctorProfile(data.user.id, userData);
          }
        }
      } catch (profileError) {
        console.error('Error creating profile during signup:', profileError);
        throw profileError;
      }
    }

    return data;
  };

  const createDoctorProfile = async (userId: string, userData: Partial<Profile>) => {
    try {
      console.log('Creating doctor profile for user:', userId);
      
      const doctorData = {
        user_id: userId,
        specialty: userData.specialty || 'General Practice',
        license_number: userData.license_number || null,
        rating: 0,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('doctors')
        .insert(doctorData)
        .select()
        .single();

      if (error) {
        console.error('Doctor profile creation error:', error);
        throw error;
      } else {
        console.log('Doctor profile created successfully:', data);
      }
    } catch (error) {
      console.error('Error creating doctor profile:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    console.log('Updating profile with data:', updates);

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
      date_of_birth: updates.date_of_birth === '' ? null : updates.date_of_birth,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }
    
    console.log('Profile updated successfully:', data);
    setProfile(data);
    return data;
  };

  const retryConnection = () => {
    setLoading(true);
    setAuthError(null);
    window.location.reload();
  };

  return {
    user,
    profile,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    updateProfile,
    retryConnection,
  };
}