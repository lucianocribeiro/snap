-- Allow super_admin to delete tasks in their linked organization
DROP POLICY IF EXISTS "Admins can delete tasks in their org" ON tasks;

CREATE POLICY "Admins can delete tasks in their org"
ON tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND organization_id = tasks.organization_id
    AND (role = 'org_admin' OR role = 'super_admin')
  )
);
