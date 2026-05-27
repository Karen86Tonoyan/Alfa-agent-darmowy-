CREATE TABLE `filter_conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filterId` int NOT NULL,
	`conditionType` varchar(64) NOT NULL,
	`operator` varchar(32) NOT NULL,
	`value` text,
	`logicalOperator` enum('AND','OR') NOT NULL DEFAULT 'AND',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `filter_conditions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`filterName` varchar(128) NOT NULL,
	`description` text,
	`filterConfig` text,
	`filterType` enum('location','size','category','engagement','custom','combined') NOT NULL DEFAULT 'custom',
	`isActive` int NOT NULL DEFAULT 1,
	`isSaved` int NOT NULL DEFAULT 0,
	`matchedGroupCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(64),
	`tags` text,
	`isPublished` int NOT NULL DEFAULT 1,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`skillName` varchar(128) NOT NULL,
	`description` text,
	`category` varchar(64),
	`template` text,
	`systemPrompt` text,
	`isActive` int NOT NULL DEFAULT 1,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `filter_conditions` ADD CONSTRAINT `filter_conditions_filterId_filters_id_fk` FOREIGN KEY (`filterId`) REFERENCES `filters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `filters` ADD CONSTRAINT `filters_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skills` ADD CONSTRAINT `skills_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;