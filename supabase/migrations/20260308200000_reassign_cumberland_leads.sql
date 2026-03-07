-- Reassign Cumberland County leads that were incorrectly backfilled to Lancaster
-- Cities and zip codes in Cumberland County, PA

DO $$
DECLARE
  lancaster_uuid UUID;
  cumberland_uuid UUID;
  updated_count INT;
BEGIN
  SELECT id INTO lancaster_uuid FROM markets WHERE slug = 'lancaster-pa';
  SELECT id INTO cumberland_uuid FROM markets WHERE slug = 'cumberland-pa';

  IF cumberland_uuid IS NULL THEN
    RAISE NOTICE 'Cumberland market not found — skipping';
    RETURN;
  END IF;

  IF lancaster_uuid IS NULL THEN
    RAISE NOTICE 'Lancaster market not found — skipping';
    RETURN;
  END IF;

  UPDATE business_leads
  SET market_id = cumberland_uuid
  WHERE market_id = lancaster_uuid
    AND (
      LOWER(TRIM(city)) IN (
        'mechanicsburg', 'carlisle', 'camp hill', 'new cumberland',
        'lemoyne', 'enola', 'wormleysburg', 'shiremanstown',
        'boiling springs', 'newville', 'shippensburg',
        'west fairview', 'hampden', 'upper allen',
        'lower allen', 'silver spring', 'middlesex',
        'north middleton', 'south middleton', 'monroe',
        'penn', 'dickinson', 'east pennsboro'
      )
      OR zip_code IN (
        '17011', '17013', '17015', '17043', '17050', '17055',
        '17070', '17007', '17240', '17241', '17257', '17065',
        '17025', '17019', '17266'
      )
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Reassigned % leads from Lancaster to Cumberland', updated_count;
END $$;
