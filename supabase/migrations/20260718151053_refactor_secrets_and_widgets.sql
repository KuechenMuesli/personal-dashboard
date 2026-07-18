-- 1. Drop old user_secrets table
DROP TABLE IF EXISTS user_secrets;

-- 2. Create the new, clean user_secrets table
CREATE TABLE user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service text NOT NULL, -- e.g. Widget ID or Service Name
  secret_key text NOT NULL,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service, secret_key)
);

ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own secrets"
ON user_secrets
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Create clean widget_settings table
CREATE TABLE widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid REFERENCES widgets(id) ON DELETE CASCADE NOT NULL,
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(widget_id, setting_key)
);

ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE widget_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;

CREATE POLICY "Users can manage their own widget settings"
ON widget_settings
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Drop the custom_data column from widgets since we now use widget_settings
ALTER TABLE widgets DROP COLUMN IF EXISTS custom_data;
