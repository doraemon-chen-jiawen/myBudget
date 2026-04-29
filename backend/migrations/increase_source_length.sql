-- Increase source field length to accommodate more values
ALTER TABLE records MODIFY COLUMN source VARCHAR(50) NOT NULL DEFAULT 'manual';