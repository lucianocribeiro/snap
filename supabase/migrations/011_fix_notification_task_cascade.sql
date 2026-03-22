-- Drop and recreate the foreign key on notifications.related_task_id
-- changing ON DELETE SET NULL to ON DELETE CASCADE

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_related_task_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_related_task_id_fkey
FOREIGN KEY (related_task_id)
REFERENCES tasks(id)
ON DELETE CASCADE;
