CREATE TABLE `outliers` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`creator` text,
	`creator_followers` integer,
	`views` integer,
	`multiplier` real,
	`niche` text,
	`hook_verbal` text,
	`hook_written` text,
	`hook_visual` text,
	`transcript` text,
	`why_it_worked` text,
	`status` text DEFAULT 'unprocessed' NOT NULL,
	`structure_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`structure_id`) REFERENCES `structures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rhythm_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`weekday` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `script_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`script_body` text,
	`hook_verbal` text,
	`hook_written` text,
	`hook_visual` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `script_revisions_video_idx` ON `script_revisions` (`video_id`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'custom' NOT NULL,
	`target_episodes` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `structures` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`template` text NOT NULL,
	`source_url` text,
	`source_creator` text,
	`notes` text,
	`times_used` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`notes` text,
	`hook_verbal` text,
	`hook_written` text,
	`hook_visual` text,
	`script_body` text,
	`shot_notes` text,
	`structure_id` text,
	`series_id` text,
	`episode_number` integer,
	`scheduled_date` text,
	`published_at` integer,
	`views` integer DEFAULT 0 NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`shares` integer DEFAULT 0 NOT NULL,
	`double_down_of` text,
	`sort_order` real NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`structure_id`) REFERENCES `structures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`double_down_of`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `videos_status_sort_idx` ON `videos` (`status`,`sort_order`);--> statement-breakpoint
CREATE INDEX `videos_scheduled_date_idx` ON `videos` (`scheduled_date`);