/*
  # Seed Sample Healthcare Data

  1. Sample Data
    - Create sample doctors with different specialties
    - Ensure proper relationships and constraints
*/

-- Insert sample doctors
INSERT INTO doctors (id, user_id, specialty, license_number, avatar_url, rating) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', null, 'Cardiology', 'MD12345', 'https://images.pexels.com/photos/559827/pexels-photo-559827.jpeg?auto=compress&cs=tinysrgb&w=150', 4.9),
  ('550e8400-e29b-41d4-a716-446655440002', null, 'Neurology', 'MD12346', 'https://images.pexels.com/photos/612608/pexels-photo-612608.jpeg?auto=compress&cs=tinysrgb&w=150', 4.8),
  ('550e8400-e29b-41d4-a716-446655440003', null, 'Dermatology', 'MD12347', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150', 4.9),
  ('550e8400-e29b-41d4-a716-446655440004', null, 'Orthopedics', 'MD12348', 'https://images.pexels.com/photos/582750/pexels-photo-582750.jpeg?auto=compress&cs=tinysrgb&w=150', 4.7),
  ('550e8400-e29b-41d4-a716-446655440005', null, 'Pediatrics', 'MD12349', 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=150', 4.8),
  ('550e8400-e29b-41d4-a716-446655440006', null, 'Internal Medicine', 'MD12350', 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=150', 4.6)
ON CONFLICT (id) DO NOTHING;