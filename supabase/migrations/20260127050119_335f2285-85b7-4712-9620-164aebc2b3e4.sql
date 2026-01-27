-- Create profiles table for user personalization
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access (RESTRICTIVE)
CREATE POLICY "profiles_select_own" 
ON public.profiles 
AS RESTRICTIVE
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
AS RESTRICTIVE
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own" 
ON public.profiles 
AS RESTRICTIVE
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);