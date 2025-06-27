/*
  # Fix Profile Policies and Data Storage

  1. Policy Updates
    - Add public policies for profile creation during signup
    - Ensure proper RLS policies for all user types
    - Fix profile insertion and update permissions

  2. Data Integrity
    - Ensure profiles table can store all required patient data
    - Fix any constraint issues
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create comprehensive profile policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Ensure the profiles table has proper constraints and defaults
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    'patient',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add similar policies for patient intake forms to ensure proper access
DROP POLICY IF EXISTS "Patients can view their own intake forms" ON public.patient_intake_forms;
DROP POLICY IF EXISTS "Patients can insert their own intake forms" ON public.patient_intake_forms;

CREATE POLICY "Patients can view their own intake forms"
  ON public.patient_intake_forms
  FOR SELECT
  TO public
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own intake forms"
  ON public.patient_intake_forms
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = patient_id);

-- Add policies for appointments
DROP POLICY IF EXISTS "Patients can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can insert their own appointments" ON public.appointments;

CREATE POLICY "Patients can view their own appointments"
  ON public.appointments
  FOR SELECT
  TO public
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own appointments"
  ON public.appointments
  FOR UPDATE
  TO public
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own appointments"
  ON public.appointments
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = patient_id);

-- Add policies for doctors
DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can insert their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctors;

CREATE POLICY "Doctors are viewable by everyone"
  ON public.doctors
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Doctors can insert their own profile"
  ON public.doctors
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can update their own profile"
  ON public.doctors
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

-- Add policies for chat conversations
DROP POLICY IF EXISTS "Patients can manage their own conversations" ON public.chat_conversations;

CREATE POLICY "Patients can manage their own conversations"
  ON public.chat_conversations
  FOR ALL
  TO public
  USING (auth.uid() = patient_id);

-- Add policies for medications
DROP POLICY IF EXISTS "Patients can manage their own medications" ON public.medications;

CREATE POLICY "Patients can manage their own medications"
  ON public.medications
  FOR ALL
  TO public
  USING (auth.uid() = patient_id);

-- Add policies for medication logs
DROP POLICY IF EXISTS "Patients can manage their own medication logs" ON public.medication_logs;

CREATE POLICY "Patients can manage their own medication logs"
  ON public.medication_logs
  FOR ALL
  TO public
  USING (auth.uid() = patient_id);