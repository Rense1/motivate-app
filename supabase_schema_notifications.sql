-- Add notification columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_times JSONB DEFAULT NULL;
