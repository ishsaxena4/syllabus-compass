-- Discussion posts/replies are a common graded item (e.g. LMS discussion boards).
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'discussion' BEFORE 'other';
