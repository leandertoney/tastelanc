-- Create function to set default event image based on event_type
CREATE OR REPLACE FUNCTION set_default_event_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_url IS NULL OR NEW.image_url = '' THEN
    NEW.image_url := CASE NEW.event_type
      WHEN 'trivia' THEN 'https://tastelanc.com/images/events/trivia.png'
      WHEN 'live_music' THEN 'https://tastelanc.com/images/events/live_music.png'
      WHEN 'karaoke' THEN 'https://tastelanc.com/images/events/karaoke.png'
      WHEN 'dj' THEN 'https://tastelanc.com/images/events/dj.png'
      WHEN 'comedy' THEN 'https://tastelanc.com/images/events/comedy.png'
      WHEN 'sports' THEN 'https://tastelanc.com/images/events/sports.png'
      ELSE 'https://tastelanc.com/images/events/other.png'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_event_image_trigger ON events;

-- Create trigger to auto-set image_url on insert or update
CREATE TRIGGER set_event_image_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_default_event_image();
