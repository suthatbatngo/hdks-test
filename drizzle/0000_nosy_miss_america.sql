CREATE TABLE `locks` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`student_name` text NOT NULL,
	`grade` text NOT NULL,
	`study_day` text NOT NULL,
	`submitted_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`storage_key` text NOT NULL,
	`display_filename` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_request_id_unique` ON `submissions` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_storage_key_unique` ON `submissions` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_submissions_group_status_time` ON `submissions` (`grade`,`study_day`,`status`,`submitted_at`);