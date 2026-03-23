CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_prefs RECORD;
  task_creator_name TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- No self-notification
  IF NEW.assigned_to = NEW.created_by THEN
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
