ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
