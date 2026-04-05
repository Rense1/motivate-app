-- Goals table
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  vision_image_url TEXT,
  vision_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones table (ordered checkpoints toward a goal)
CREATE TABLE milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reasons for each milestone (why you must clear this step)
CREATE TABLE milestone_reasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Tasks for each milestone (daily actions)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_daily BOOLEAN DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed_today BOOLEAN DEFAULT FALSE,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reasons for each task (why you must do this action)
CREATE TABLE task_reasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reasons ENABLE ROW LEVEL SECURITY;

-- Goals: users can only access their own goals
CREATE POLICY "Users can CRUD their own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- Milestones: via goal ownership
CREATE POLICY "Users can CRUD their milestones" ON milestones
  FOR ALL USING (
    goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
  );

-- Milestone reasons: via milestone ownership
CREATE POLICY "Users can CRUD milestone reasons" ON milestone_reasons
  FOR ALL USING (
    milestone_id IN (
      SELECT m.id FROM milestones m
      JOIN goals g ON g.id = m.goal_id
      WHERE g.user_id = auth.uid()
    )
  );

-- Tasks: via milestone ownership
CREATE POLICY "Users can CRUD tasks" ON tasks
  FOR ALL USING (
    milestone_id IN (
      SELECT m.id FROM milestones m
      JOIN goals g ON g.id = m.goal_id
      WHERE g.user_id = auth.uid()
    )
  );

-- Task reasons: via task ownership
CREATE POLICY "Users can CRUD task reasons" ON task_reasons
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN milestones m ON m.id = t.milestone_id
      JOIN goals g ON g.id = m.goal_id
      WHERE g.user_id = auth.uid()
    )
  );

-- Storage bucket for vision board images
INSERT INTO storage.buckets (id, name, public) VALUES ('vision-images', 'vision-images', true);

CREATE POLICY "Users can upload their vision images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vision images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'vision-images');

CREATE POLICY "Users can delete their vision images" ON storage.objects
  FOR DELETE USING (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);
