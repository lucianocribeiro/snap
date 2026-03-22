ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

-- Update notify_task_assigned trigger to use title
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
      NEW.title,
      CONCAT(COALESCE(task_creator_name, 'Someone'), ' assigned you a task'),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_task_pending_approval trigger to use title
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
      NEW.title,
      CONCAT(COALESCE(assignee_name, 'Someone'), ' completed this task and is awaiting your approval'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_task_approval_decision trigger to use title
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
      NEW.title,
      CONCAT(COALESCE(admin_name, 'Your admin'), ' approved your task'),
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
      NEW.title,
      CONCAT(COALESCE(admin_name, 'Your admin'), ' returned your task for revision'),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
