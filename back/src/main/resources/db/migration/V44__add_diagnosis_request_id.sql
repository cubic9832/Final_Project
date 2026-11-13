ALTER TABLE input_snapshots ADD COLUMN diagnosis_request_id VARCHAR(36) NULL;
CREATE UNIQUE INDEX uq_snapshot_diagnosis_request ON input_snapshots (user_id, diagnosis_request_id);
