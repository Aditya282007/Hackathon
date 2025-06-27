/*
  # Create core database schema for VaaniMed application

  1. New Tables
    - `profiles` - User profile information with role-based access
    - `doctors` - Doctor-specific information and specialties
    - `patient_intake_forms` - Voice intake form submissions
    - `appointments` - Appointment scheduling and management
    - `chat_conversations` - AI triage chat conversations
    - `medications` - Patient medication tracking
    - `medication_logs` - Medication adherence logging

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each user role
    - Create triggers for automatic profile creation

  3. Functions and Triggers
    - Auto-create profile on user signup
    - Update timestamps automatically
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  role text DEFAULT 'patient'::text NOT NULL CHECK (role IN ('patient', 'doctor')),
  phone text,
  date_of_birth date,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  specialty text NOT NULL DEFAULT 'General Practice',
  license_number text,
  avatar_url text,
  rating numeric(3,2) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create patient intake forms table
CREATE TABLE IF NOT EXISTS public.patient_intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  chief_complaint text,
  allergies text,
  medications text,
  medical_history text,
  form_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctors ON DELETE CASCADE NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text DEFAULT 'Once daily',
  times text[] DEFAULT ARRAY['08:00'],
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create medication logs table
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES public.medications ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  scheduled_time timestamptz NOT NULL,
  taken_at timestamptz,
  status text DEFAULT 'scheduled' CHECK (status IN ('taken', 'missed', 'skipped', 'scheduled')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Doctors policies
CREATE POLICY "Doctors are viewable by everyone"
  ON public.doctors
  FOR SELECT
  USING (true);

CREATE POLICY "Doctors can update their own profile"
  ON public.doctors
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors can insert their own profile"
  ON public.doctors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Patient intake forms policies
CREATE POLICY "Patients can view their own intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own intake forms"
  ON public.patient_intake_forms
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can view all intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'doctor'
    )
  );

-- Appointments policies
CREATE POLICY "Patients can view their own appointments"
  ON public.appointments
  FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own appointments"
  ON public.appointments
  FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their appointments"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update their appointments"
  ON public.appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors
      WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()
    )
  );

-- Chat conversations policies
CREATE POLICY "Patients can manage their own conversations"
  ON public.chat_conversations
  FOR ALL
  USING (auth.uid() = patient_id);

-- Medications policies
CREATE POLICY "Patients can manage their own medications"
  ON public.medications
  FOR ALL
  USING (auth.uid() = patient_id);

-- Medication logs policies
CREATE POLICY "Patients can manage their own medication logs"
  ON public.medication_logs
  FOR ALL
  USING (auth.uid() = patient_id);

-- Create function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'patient');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample doctors
INSERT INTO public.doctors (specialty, license_number, rating) VALUES
  ('Cardiology', 'MD12345', 4.8),
  ('Dermatology', 'MD12346', 4.7),
  ('Pediatrics', 'MD12347', 4.9),
  ('Orthopedics', 'MD12348', 4.6),
  ('Neurology', 'MD12349', 4.8),
  ('General Practice', 'MD12350', 4.5)
ON CONFLICT DO NOTHING;