CREATE TABLE `brand_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`website` varchar(220),
	`industry` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`objective` text NOT NULL,
	`contentType` varchar(100) NOT NULL,
	`style` varchar(160) NOT NULL,
	`audience` text NOT NULL,
	`platform` varchar(100) NOT NULL,
	`duration` varchar(80) NOT NULL,
	`aspectRatio` varchar(40) NOT NULL,
	`deliverables` int NOT NULL,
	`budget` varchar(100) NOT NULL,
	`deadline` varchar(80) NOT NULL,
	`location` varchar(160) NOT NULL,
	`workMode` enum('remote','hybrid','on-site') NOT NULL,
	`licensing` text NOT NULL,
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefId` int NOT NULL,
	`brandId` int NOT NULL,
	`creatorId` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('sent','accepted','declined') NOT NULL DEFAULT 'sent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaboration_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`headline` varchar(220) NOT NULL,
	`bio` text NOT NULL,
	`location` varchar(160) NOT NULL,
	`workMode` enum('remote','hybrid','on-site') NOT NULL,
	`skills` text NOT NULL,
	`tools` text NOT NULL,
	`contentTypes` text NOT NULL,
	`styles` text NOT NULL,
	`experience` varchar(80) NOT NULL,
	`rates` varchar(120),
	`formats` text NOT NULL,
	`workflow` text NOT NULL,
	`verificationStatus` enum('self-reported','not-verified') NOT NULL DEFAULT 'self-reported',
	`availability` enum('available','selective','unavailable') NOT NULL DEFAULT 'available',
	`published` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `creator_profiles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`imageUrl` text NOT NULL,
	`contentType` varchar(80) NOT NULL,
	`isConcept` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_creators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`creatorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_creators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `accountType` enum('creator','brand','admin') DEFAULT 'creator' NOT NULL;