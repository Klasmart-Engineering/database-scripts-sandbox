CREATE TABLE xapi_record (
  user_id UUID,
  server_timestamp BIGINT,
  xapi JSONB,
  ipHash VARCHAR,
  geo JSON
)
