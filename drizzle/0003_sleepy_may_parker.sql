ALTER TABLE `portfolio_projects` MODIFY COLUMN `imageUrl` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `tools` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `role` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `challenge` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `approach` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `outcomes` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `impactSummary` text;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `mediaKey` varchar(500);--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `mediaName` varchar(180);--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `mediaType` varchar(80);--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `mediaSize` int;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `published` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `portfolio_projects` ADD `sortOrder` int DEFAULT 0 NOT NULL;