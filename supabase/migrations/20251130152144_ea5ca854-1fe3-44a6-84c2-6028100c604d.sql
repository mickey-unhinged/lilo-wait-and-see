-- Add trigger to auto-generate room_code for private rooms
CREATE OR REPLACE FUNCTION public.auto_generate_room_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_private = true AND (NEW.room_code IS NULL OR NEW.room_code = '') THEN
    NEW.room_code := generate_room_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto room code generation
DROP TRIGGER IF EXISTS trigger_auto_room_code ON public.listening_rooms;
CREATE TRIGGER trigger_auto_room_code
BEFORE INSERT ON public.listening_rooms
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_room_code();

-- Also set search_path on the existing generate_room_code function
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;