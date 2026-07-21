CREATE TABLE `video_series` (
	`video_id` text NOT NULL,
	`series_id` text NOT NULL,
	`episode_number` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`video_id`, `series_id`),
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_series_series_idx` ON `video_series` (`series_id`);--> statement-breakpoint
INSERT INTO `video_series` (`video_id`, `series_id`, `episode_number`, `created_at`)
  SELECT `id`, `series_id`, `episode_number`, `created_at`
  FROM `videos` WHERE `series_id` IS NOT NULL;