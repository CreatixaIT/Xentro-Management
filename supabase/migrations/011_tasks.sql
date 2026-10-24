-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_date DATE,
  due_time TIME,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view tasks assigned to them
CREATE POLICY "Employees can view assigned tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Employees can view tasks in their projects
CREATE POLICY "Employees can view project tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE profile_id = auth.uid()
    )
  );

-- Employees can update their own tasks
CREATE POLICY "Employees can update own tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Service role can manage all tasks
CREATE POLICY "Service role can manage tasks"
  ON public.tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to tasks"
  ON public.tasks
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, UPDATE ON public.tasks TO authenticated;
