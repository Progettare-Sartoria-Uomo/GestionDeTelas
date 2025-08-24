-- Add soft delete column to telas table
ALTER TABLE public.telas ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on non-deleted records
CREATE INDEX idx_telas_deleted_at ON public.telas (deleted_at) WHERE deleted_at IS NULL;