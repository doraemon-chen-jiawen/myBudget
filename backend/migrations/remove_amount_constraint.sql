-- Remove the amount positive constraint to allow negative amounts for retract operations
ALTER TABLE records DROP CONSTRAINT IF EXISTS ck_records_amount_positive;