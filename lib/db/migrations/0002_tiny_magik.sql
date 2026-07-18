CREATE TABLE `script_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `script_drafts_video_idx` ON `script_drafts` (`video_id`);--> statement-breakpoint
ALTER TABLE `videos` ADD `script_draft_name` text DEFAULT 'V1' NOT NULL;