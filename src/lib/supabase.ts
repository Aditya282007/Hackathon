/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Some features may not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-web',
      },
    },
    db: {
      schema: 'public',
    },
  }
);

// Test connection function
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
};

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: 'patient' | 'doctor';
  phone?: string;
  date_of_birth?: string;
  address?: string;
  specialty?: string;
  license_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient?: Profile;
  doctor?: any;
}

// Voice API configuration
export const VOICE_API_CONFIG = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    endpoint: 'https://speech.googleapis.com/v1/speech:recognize',
  }
};

// Add global speech recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}