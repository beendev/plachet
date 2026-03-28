-- Bug report / ticket system
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reported_by_user_id integer REFERENCES public.users(id),
  reporter_name text,
  reporter_email text,
  reporter_role text,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  page_url text,
  user_agent text,
  context jsonb DEFAULT '{}',
  admin_notes text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON public.bug_reports(created_at DESC);

NOTIFY pgrst, 'reload schema';
