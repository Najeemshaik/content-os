ALTER TABLE `videos` ADD `format` text DEFAULT 'short' NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `clip_of` text REFERENCES videos(id);