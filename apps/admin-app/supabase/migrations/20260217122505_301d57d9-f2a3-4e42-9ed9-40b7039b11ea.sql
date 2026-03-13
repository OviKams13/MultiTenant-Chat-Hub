
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (for security architecture compliance)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Chatbots (shops)
CREATE TABLE public.chatbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- BB Entities
CREATE TABLE public.bb_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('CONTACT', 'FAQ', 'SCHEDULE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bb_entities ENABLE ROW LEVEL SECURITY;

-- BB Contacts
CREATE TABLE public.bb_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.bb_entities(id) ON DELETE CASCADE,
  org_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address_text TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  hours_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bb_contacts ENABLE ROW LEVEL SECURITY;

-- BB FAQs
CREATE TABLE public.bb_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.bb_entities(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bb_faqs ENABLE ROW LEVEL SECURITY;

-- BB Schedules
CREATE TABLE public.bb_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.bb_entities(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  day_of_week TEXT NOT NULL,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bb_schedules ENABLE ROW LEVEL SECURITY;

-- Chatbot Items (links chatbot to entity)
CREATE TABLE public.chatbot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.bb_entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_items ENABLE ROW LEVEL SECURITY;

-- Helper: check role via user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check chatbot ownership
CREATE OR REPLACE FUNCTION public.is_chatbot_owner(_user_id UUID, _chatbot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chatbots
    WHERE id = _chatbot_id AND user_id = _user_id
  )
$$;

-- Helper: check entity ownership via chatbot_items
CREATE OR REPLACE FUNCTION public.is_entity_owner(_user_id UUID, _entity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chatbot_items ci
    JOIN public.chatbots c ON c.id = ci.chatbot_id
    WHERE ci.entity_id = _entity_id AND c.user_id = _user_id
  )
$$;

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_chatbots_updated_at BEFORE UPDATE ON public.chatbots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: profiles
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS: user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS: chatbots
CREATE POLICY "Anyone can read chatbots" ON public.chatbots FOR SELECT USING (true);
CREATE POLICY "Admins can insert chatbots" ON public.chatbots FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can update chatbots" ON public.chatbots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete chatbots" ON public.chatbots FOR DELETE USING (auth.uid() = user_id);

-- RLS: bb_entities
CREATE POLICY "Anyone can read entities" ON public.bb_entities FOR SELECT USING (true);
CREATE POLICY "Admins can insert entities" ON public.bb_entities FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Entity owners can update" ON public.bb_entities FOR UPDATE USING (public.is_entity_owner(auth.uid(), id));
CREATE POLICY "Entity owners can delete" ON public.bb_entities FOR DELETE USING (public.is_entity_owner(auth.uid(), id));

-- RLS: bb_contacts
CREATE POLICY "Anyone can read contacts" ON public.bb_contacts FOR SELECT USING (true);
CREATE POLICY "Entity owners can insert contacts" ON public.bb_contacts FOR INSERT WITH CHECK (public.is_entity_owner(auth.uid(), entity_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Entity owners can update contacts" ON public.bb_contacts FOR UPDATE USING (public.is_entity_owner(auth.uid(), entity_id));
CREATE POLICY "Entity owners can delete contacts" ON public.bb_contacts FOR DELETE USING (public.is_entity_owner(auth.uid(), entity_id));

-- RLS: bb_faqs
CREATE POLICY "Anyone can read faqs" ON public.bb_faqs FOR SELECT USING (true);
CREATE POLICY "Entity owners can insert faqs" ON public.bb_faqs FOR INSERT WITH CHECK (public.is_entity_owner(auth.uid(), entity_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Entity owners can update faqs" ON public.bb_faqs FOR UPDATE USING (public.is_entity_owner(auth.uid(), entity_id));
CREATE POLICY "Entity owners can delete faqs" ON public.bb_faqs FOR DELETE USING (public.is_entity_owner(auth.uid(), entity_id));

-- RLS: bb_schedules
CREATE POLICY "Anyone can read schedules" ON public.bb_schedules FOR SELECT USING (true);
CREATE POLICY "Entity owners can insert schedules" ON public.bb_schedules FOR INSERT WITH CHECK (public.is_entity_owner(auth.uid(), entity_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Entity owners can update schedules" ON public.bb_schedules FOR UPDATE USING (public.is_entity_owner(auth.uid(), entity_id));
CREATE POLICY "Entity owners can delete schedules" ON public.bb_schedules FOR DELETE USING (public.is_entity_owner(auth.uid(), entity_id));

-- RLS: chatbot_items
CREATE POLICY "Anyone can read chatbot_items" ON public.chatbot_items FOR SELECT USING (true);
CREATE POLICY "Chatbot owners can insert items" ON public.chatbot_items FOR INSERT WITH CHECK (public.is_chatbot_owner(auth.uid(), chatbot_id));
CREATE POLICY "Chatbot owners can update items" ON public.chatbot_items FOR UPDATE USING (public.is_chatbot_owner(auth.uid(), chatbot_id));
CREATE POLICY "Chatbot owners can delete items" ON public.chatbot_items FOR DELETE USING (public.is_chatbot_owner(auth.uid(), chatbot_id));
