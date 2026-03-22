-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_updated', 'invoice_overdue', 'invoice_added')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Notification preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  task_assigned BOOLEAN NOT NULL DEFAULT true,
  task_updated BOOLEAN NOT NULL DEFAULT true,
  invoice_overdue BOOLEAN NOT NULL DEFAULT true,
  invoice_added BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own preferences"
ON notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON notification_preferences FOR UPDATE
USING (user_id = auth.uid());

-- Trigger: create notification when a task is assigned (INSERT)
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_prefs RECORD;
  task_creator_name TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT task_assigned INTO assignee_prefs
  FROM notification_preferences
  WHERE user_id = NEW.assigned_to;

  IF assignee_prefs IS NULL OR assignee_prefs.task_assigned = true THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO task_creator_name
    FROM user_profiles WHERE id = NEW.created_by;

    INSERT INTO notifications (user_id, organization_id, type, title, body, related_task_id)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'task_assigned',
      'New task assigned to you',
      CONCAT(COALESCE(task_creator_name, 'Someone'), ' assigned you a task: ', LEFT(NEW.description, 100)),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_assigned
AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- Trigger: create notification when a task is updated (status change or reassignment)
CREATE OR REPLACE FUNCTION notify_task_updated()
RETURNS TRIGGER AS $$
DECLARE
  assignee_prefs RECORD;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  SELECT task_updated INTO assignee_prefs
  FROM notification_preferences
  WHERE user_id = NEW.assigned_to;

  IF assignee_prefs IS NULL OR assignee_prefs.task_updated = true THEN
    INSERT INTO notifications (user_id, organization_id, type, title, body, related_task_id)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'task_updated',
      'Task updated',
      CONCAT('A task assigned to you has been updated: ', LEFT(NEW.description, 100)),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_updated
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_updated();
