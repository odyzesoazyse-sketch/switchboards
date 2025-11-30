-- Add judging mode to nominations
ALTER TABLE nominations 
ADD COLUMN judging_mode text NOT NULL DEFAULT 'simple' CHECK (judging_mode IN ('simple', 'sliders'));

COMMENT ON COLUMN nominations.judging_mode IS 'Judging mode: simple (pick winner) or sliders (3 criteria with -5 to +5 range)';

-- Add slider scores to match_votes for slider mode
ALTER TABLE match_votes
ADD COLUMN slider_technique numeric CHECK (slider_technique >= -5 AND slider_technique <= 5),
ADD COLUMN slider_musicality numeric CHECK (slider_musicality >= -5 AND slider_musicality <= 5),
ADD COLUMN slider_performance numeric CHECK (slider_performance >= -5 AND slider_performance <= 5);