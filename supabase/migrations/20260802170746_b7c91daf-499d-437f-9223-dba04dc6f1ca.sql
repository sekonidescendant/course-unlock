CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('first','second')),
  credit_units INTEGER NOT NULL DEFAULT 2,
  outline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses are public" ON public.courses FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assignments_course_idx ON public.assignments(course_id);
GRANT SELECT ON public.assignments TO anon;
GRANT SELECT, INSERT, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments listing is public" ON public.assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "students can upload" ON public.assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "students delete own uploads" ON public.assignments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

CREATE TABLE public.course_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.course_unlocks TO authenticated;
GRANT ALL ON public.course_unlocks TO service_role;
ALTER TABLE public.course_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own unlocks read" ON public.course_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.courses (code, title, level, semester, credit_units) VALUES
('CMS 101','Introduction to Human Communication',100,'first',2),
('MCM101','Foundations of Broadcasting and Film',100,'first',3),
('MCM103','Introduction to Advertising',100,'first',2),
('MCM105','Introduction to Book Publishing',100,'first',2),
('MCM107','African Communication System',100,'first',2),
('FUOYEMCM109','English for Media Studies',100,'first',3),
('CMS 102','Writing for the Media',100,'second',2),
('MCM102','Principles of Public Relations',100,'second',2),
('MCM104','Introduction to News Writing',100,'second',2),
('MCM106','Introduction to Photojournalism',100,'second',2),
('FUOYE-MCM108','Media Literacy',100,'second',2),
('FUOYE-MCM110','Introduction to Communication Technology',100,'second',2);