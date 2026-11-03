-- Administrative metadata only; ML feature values are unchanged.
UPDATE managed_vehicles
SET payload=JSON_SET(payload,
 '$.origin',COALESCE(NULLIF(payload->>'$.origin','null'),CASE WHEN payload->>'$.brand' IN ('현대','기아','제네시스','KG모빌리티','르노코리아','쉐보레') THEN '국산' ELSE '수입' END),
 '$.drive',COALESCE(NULLIF(payload->>'$.drive','null'),'미확인'),
 '$.source_name',COALESCE(NULLIF(payload->>'$.source_name','null'),'unified-catalog-import'),
 '$.memo',COALESCE(NULLIF(payload->>'$.memo','null'),'')),
 version=version+1,updated_at=CURRENT_TIMESTAMP(6)
WHERE payload->>'$.origin' IS NULL OR payload->>'$.drive' IS NULL OR payload->>'$.source_name' IS NULL;
