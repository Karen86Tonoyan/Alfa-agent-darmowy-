CREATE TABLE `ai_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incomingMessageId` int NOT NULL,
	`pageId` int NOT NULL,
	`replyContent` text NOT NULL,
	`toneConfigId` int,
	`status` enum('generated','approved','sent','failed','rejected') NOT NULL DEFAULT 'generated',
	`facebookMessageId` varchar(128),
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facebook_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`groupId` varchar(64) NOT NULL,
	`groupName` text NOT NULL,
	`groupUrl` text,
	`location` text,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facebook_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pageId` varchar(64) NOT NULL,
	`pageName` text NOT NULL,
	`pageAccessToken` text NOT NULL,
	`pageProfilePicture` text,
	`isActive` int NOT NULL DEFAULT 1,
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_pages_pageId_unique` UNIQUE(`pageId`)
);
--> statement-breakpoint
CREATE TABLE `incoming_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`senderId` varchar(64) NOT NULL,
	`senderName` text,
	`messageContent` text NOT NULL,
	`messageId` varchar(128) NOT NULL,
	`conversationId` varchar(128),
	`receivedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `incoming_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `incoming_messages_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(64),
	`fileSize` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`notifyOnNewMessage` int NOT NULL DEFAULT 1,
	`notifyOnPostPublished` int NOT NULL DEFAULT 1,
	`notifyOnPostFailed` int NOT NULL DEFAULT 1,
	`notifyOnAIReply` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`content` text NOT NULL,
	`mediaUrls` text,
	`groupIds` text,
	`scheduledFor` timestamp NOT NULL,
	`dayOfWeek` varchar(10),
	`isRecurring` int NOT NULL DEFAULT 0,
	`status` enum('draft','scheduled','published','failed','cancelled') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`errorMessage` text,
	`facebookPostId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tone_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`toneName` varchar(64) NOT NULL,
	`toneType` enum('formal','informal','friendly','professional','casual') NOT NULL DEFAULT 'professional',
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`keywordsToUse` text,
	`keywordsToAvoid` text,
	`systemPrompt` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tone_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_replies` ADD CONSTRAINT `ai_replies_incomingMessageId_incoming_messages_id_fk` FOREIGN KEY (`incomingMessageId`) REFERENCES `incoming_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_replies` ADD CONSTRAINT `ai_replies_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_replies` ADD CONSTRAINT `ai_replies_toneConfigId_tone_configurations_id_fk` FOREIGN KEY (`toneConfigId`) REFERENCES `tone_configurations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facebook_groups` ADD CONSTRAINT `facebook_groups_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facebook_pages` ADD CONSTRAINT `facebook_pages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incoming_messages` ADD CONSTRAINT `incoming_messages_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_posts` ADD CONSTRAINT `scheduled_posts_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tone_configurations` ADD CONSTRAINT `tone_configurations_pageId_facebook_pages_id_fk` FOREIGN KEY (`pageId`) REFERENCES `facebook_pages`(`id`) ON DELETE cascade ON UPDATE no action;