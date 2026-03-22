CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments in their org"
ON task_comments FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert comments in their org"
ON task_comments FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);
