/*
  # Healthcare Application Database Schema

  1. New Tables
    - `profiles` - User profiles for patients and doctors
      - `id` (uuid, references auth.users)
      - `email` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `role` (text) - 'patient' or 'doctor'
      - `phone` (text)
      - `date_of_birth` (date)
      - `address` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `doctors` - Doctor-specific information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `specialty` (text)
      - `license_number` (text)
      - `avatar_url` (text)
      - `rating` (numeric, 0-5 scale)
      - `created_at` (timestamptz)

    - `patient_intake_forms` - Patient intake form data
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `chief_complaint` (text)
      - `allergies` (text)
      - `medications` (text)
      - `medical_history` (text)
      - `form_data` (jsonb)
      - `created_at` (timestamptz)

    - `appointments` - Medical appointments
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `doctor_id` (uuid, references doctors)
      - `appointment_date` (date)
      - `appointment_time` (time)
      - `status` (text) - 'scheduled', 'in-progress', 'completed', 'cancelled'
      - `reason` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `chat_conversations` - AI chat conversations
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `language` (text)
      - `messages` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `medications` - Patient medications
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `name` (text)
      - `dosage` (text)
      - `frequency` (text)
      - `times` (text[])
      - `start_date` (date)
      - `end_date` (date)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `medication_logs` - Medication adherence tracking
      - `id` (uuid, primary key)
      - `medication_id` (uuid, references medications)
      - `patient_id` (uuid, references profiles)
      - `scheduled_time` (timestamptz)
      - `taken_at` (timestamptz)
      - `status` (text) - 'taken', 'missed', 'skipped', 'scheduled'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to access their own data
    - Add policies for doctors to access patient data when appropriate
    - Add policies for cross-role data access (appointments, etc.)

  3. Functions
    - `handle_new_user()` - Automatically create profile when user signs up
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  role text DEFAULT 'patient'::text,
  phone text,
  date_of_birth date,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['patient'::text, 'doctor'::text]))
);

-- Create foreign key to auth.users if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  specialty text NOT NULL,
  license_number text,
  avatar_url text,
  rating numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT doctors_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

-- Add foreign key constraint for doctors
ALTER TABLE doctors ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Create patient intake forms table
CREATE TABLE IF NOT EXISTS patient_intake_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  chief_complaint text,
  allergies text,
  medications text,
  medical_history text,
  form_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for patient intake forms
ALTER TABLE patient_intake_forms ADD CONSTRAINT patient_intake_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'scheduled'::text,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT appointments_status_check CHECK (status = ANY (ARRAY['scheduled'::text, 'in-progress'::text, 'completed'::text, 'cancelled'::text]))
);

-- Add foreign key constraints for appointments
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  language text DEFAULT 'en'::text,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for chat conversations
ALTER TABLE chat_conversations ADD CONSTRAINT chat_conversations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  times text[] DEFAULT '{}'::text[],
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for medications
ALTER TABLE medications ADD CONSTRAINT medications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create medication logs table
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  scheduled_time timestamptz NOT NULL,
  taken_at timestamptz,
  status text DEFAULT 'scheduled'::text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT medication_logs_status_check CHECK (status = ANY (ARRAY['taken'::text, 'missed'::text, 'skipped'::text, 'scheduled'::text]))
);

-- Add foreign key constraints for medication logs
ALTER TABLE medication_logs ADD CONSTRAINT medication_logs_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE;
ALTER TABLE medication_logs ADD CONSTRAINT medication_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for doctors
CREATE POLICY "Anyone can view doctors" ON doctors
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Doctors can insert own profile" ON doctors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Create RLS policies for patient intake forms
CREATE POLICY "Patients can manage own intake forms" ON patient_intake_forms
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view patient intake forms" ON patient_intake_forms
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'doctor'::text
  ));

-- Create RLS policies for appointments
CREATE POLICY "Patients can manage own appointments" ON appointments
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can manage appointments with their patients" ON appointments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM doctors
    WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid()
  ));

-- Create RLS policies for chat conversations
CREATE POLICY "Patients can manage own chat conversations" ON chat_conversations
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- Create RLS policies for medications
CREATE POLICY "Patients can manage own medications" ON medications
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- Create RLS policies for medication logs
CREATE POLICY "Patients can manage own medication logs" ON medication_logs
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (new.id, new.email, 'patient');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration (only if auth.users exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;