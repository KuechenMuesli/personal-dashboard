CREATE TABLE custom_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  css_variables jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE custom_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own themes"
ON custom_themes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own themes"
ON custom_themes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
ON custom_themes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
ON custom_themes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
