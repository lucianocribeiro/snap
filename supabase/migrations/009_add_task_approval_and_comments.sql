-- Add pending_approval status and approved_by to tasks
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('open', 'in_progress', 'pending_approval', 'done'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Task comments table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Only task creator and assignee can view comments
CREATE POLICY "Task participants can view comments"
ON task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
  )
);

CREATE POLICY "Task participants can insert comments"
ON task_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
  )
);

-- Add notification types for approval workflow
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('task_assigned', 'task_updated', 'task_pending_approval', 'task_approved', 'task_denied', 'invoice_overdue', 'invoice_added'));

-- Trigger: notify task creator when assignee submits for approval
CREATE OR REPLACE FUNCTION notify_task_pending_approval()
RETURNS TRIGGER AS $$
DECLARE
  assignee_name TEXT;
BEGIN
  IF NEW.status = 'pending_approval' AND OLD.status != 'pending_approval' THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO assignee_name
    FROM user_profiles WHERE id = auth.uid();

    INSERT INTO notifications (user_id, organization_id, type, title, body, related_task_id)
    VALUES (
      NEW.created_by,
      NEW.organization_id,
      'task_pending_approval',
      'Task ready for approval',
      CONCAT(COALESCE(assignee_name, 'Someone'), ' has completed a task and is awaiting your approval: ', LEFT(NEW.description, 100)),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_pending_approval
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_pending_approval();

-- Trigger: notify assignee when task is approved or denied
CREATE OR REPLACE FUNCTION notify_task_approval_decision()
RETURNS TRIGGER AS $$
DECLARE
  admin_name TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'done' AND OLD.status = 'pending_approval' THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO admin_name
    FROM user_profiles WHERE id = auth.uid();

    INSERT INTO notifications (user_id, organization_id, type, title, body, related_task_id)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'task_approved',
      'Task approved',
      CONCAT(COALESCE(admin_name, 'Your admin'), ' approved your task: ', LEFT(NEW.description, 100)),
      NEW.id
    );
  END IF;

  IF NEW.status = 'open' AND OLD.status = 'pending_approval' THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO admin_name
    FROM user_profiles WHERE id = auth.uid();

    INSERT INTO notifications (user_id, organization_id, type, title, body, related_task_id)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'task_denied',
      'Task returned for revision',
      CONCAT(COALESCE(admin_name, 'Your admin'), ' returned your task for revision: ', LEFT(NEW.description, 100)),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_approval_decision
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_approval_decision();
