-- Add music_bingo, poker, and bingo default images to event trigger
-- music_bingo and poker are new entertainment categories
-- bingo was previously falling through to the ELSE clause

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
      WHEN 'promotion' THEN 'https://tastelanc.com/images/events/promotion.png'
      WHEN 'bingo' THEN 'https://tastelanc.com/images/events/bingo.png'
      WHEN 'music_bingo' THEN 'https://tastelanc.com/images/events/music_bingo.png'
      WHEN 'poker' THEN 'https://tastelanc.com/images/events/poker.png'
      ELSE 'https://tastelanc.com/images/events/other.png'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger already exists, updating the function is sufficient
