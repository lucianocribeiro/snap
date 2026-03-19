ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'edit'
CHECK (access_level IN ('edit', 'view_only'));

DROP POLICY IF EXISTS "Users can insert invoices in their org" ON invoices;
CREATE POLICY "Users can insert invoices in their org"
ON invoices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.organization_id = invoices.organization_id
    AND (user_profiles.role = 'org_admin' OR user_profiles.access_level = 'edit')
  )
);

DROP POLICY IF EXISTS "Users can update invoices in their org" ON invoices;
CREATE POLICY "Users can update invoices in their org"
ON invoices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.organization_id = invoices.organization_id
    AND (user_profiles.role = 'org_admin' OR user_profiles.access_level = 'edit')
  )
);

DROP POLICY IF EXISTS "Admins can delete invoices in their org" ON invoices;
CREATE POLICY "Admins can delete invoices in their org"
ON invoices FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.organization_id = invoices.organization_id
    AND user_profiles.role = 'org_admin'
  )
);
