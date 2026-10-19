-- Create private storage bucket for employee photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', false)
ON CONFLICT (id) DO NOTHING;
