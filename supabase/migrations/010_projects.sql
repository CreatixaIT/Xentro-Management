-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  start_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER' CHECK (role IN ('LEAD', 'MEMBER', 'OBSERVER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, profile_id)
);

-- Create indexes
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_profile_id ON public.project_members(profile_id);

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
-- Employees can view projects they are members of
CREATE POLICY "Employees can view member projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id FROM public.project_members WHERE profile_id = auth.uid()
    )
  );

-- Service role can manage projects
CREATE POLICY "Service role can manage projects"
  ON public.projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for project_members
-- Employees can view their own project memberships
CREATE POLICY "Employees can view own project memberships"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Service role can manage project members
CREATE POLICY "Service role can manage project members"
  ON public.project_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to projects"
  ON public.projects
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anonymous access to project_members"
  ON public.project_members
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.project_members TO service_role;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.project_members TO authenticated;
