-- Initial Admin User for FLIX STORE
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@flixstore.com',
  extensions.crypt('FlixAdmin2026Secure!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"FLIX Store Admin","role":"admin"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Also ensure profile has role = 'admin'
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@flixstore.com',
  'FLIX Store Admin',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'FLIX Store Admin';
