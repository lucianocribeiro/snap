DROP TRIGGER IF EXISTS on_task_updated ON tasks;
DROP FUNCTION IF EXISTS notify_task_updated();

-- Allow authenticated users to insert notifications for other users in their org
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

CREATE POLICY "Authenticated users can insert notifications in their org"
ON notifications FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);
