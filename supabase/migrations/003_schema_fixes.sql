-- Change items.id to TEXT
ALTER TABLE items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE items ALTER COLUMN id SET DATA TYPE text USING CAST(id AS text);

-- Change outfits.id to TEXT and item_ids to TEXT[]
ALTER TABLE outfits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE outfits ALTER COLUMN id SET DATA TYPE text USING CAST(id AS text);
ALTER TABLE outfits ALTER COLUMN item_ids SET DATA TYPE text[] USING CAST(item_ids AS text[]);

-- Change digital_twins.id to TEXT
ALTER TABLE digital_twins ALTER COLUMN id DROP DEFAULT;
ALTER TABLE digital_twins ALTER COLUMN id SET DATA TYPE text USING CAST(id AS text);
