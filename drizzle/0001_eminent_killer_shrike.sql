CREATE TABLE `homework` (
	`grade` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_key` text NOT NULL
);
