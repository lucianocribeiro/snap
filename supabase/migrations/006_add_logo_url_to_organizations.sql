ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Allow authenticated users to upload to their org folder
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Org members can upload logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Public can read org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');
