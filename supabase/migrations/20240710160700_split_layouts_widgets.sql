-- Create layouts table
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Layout',
  is_active BOOLEAN NOT NULL DEFAULT false,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create widgets table
CREATE TABLE widgets (
  id UUID PRIMARY KEY, -- We use the client-generated ID
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  w INT NOT NULL,
  h INT NOT NULL,
  custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Policies for layouts
CREATE POLICY "Users can view their own layouts" ON layouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own layouts" ON layouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own layouts" ON layouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own layouts" ON layouts FOR DELETE USING (auth.uid() = user_id);

-- Policies for widgets
CREATE POLICY "Users can view widgets of their layouts" ON widgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM layouts WHERE layouts.id = widgets.layout_id AND layouts.user_id = auth.uid())
);
CREATE POLICY "Users can insert widgets to their layouts" ON widgets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM layouts WHERE layouts.id = widgets.layout_id AND layouts.user_id = auth.uid())
);
CREATE POLICY "Users can update widgets of their layouts" ON widgets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM layouts WHERE layouts.id = widgets.layout_id AND layouts.user_id = auth.uid())
);
CREATE POLICY "Users can delete widgets of their layouts" ON widgets FOR DELETE USING (
  EXISTS (SELECT 1 FROM layouts WHERE layouts.id = widgets.layout_id AND layouts.user_id = auth.uid())
);
