CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLocationLat` decimal(10,8),
	`lastLocationLng` decimal(11,8),
	`lastLocationTimestamp` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `emergencyContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`priority` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emergencyContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`accuracy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationId` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`contactId` int NOT NULL,
	`type` enum('sms','email') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('pending','sent','failed','delivered') NOT NULL DEFAULT 'pending',
	`externalId` varchar(255),
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_notificationId_unique` UNIQUE(`notificationId`)
);
--> statement-breakpoint
CREATE TABLE `offlineSosQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queueId` varchar(64) NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`status` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
	`retryCount` int NOT NULL DEFAULT 0,
	`eventId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`syncedAt` timestamp,
	CONSTRAINT `offlineSosQueue_id` PRIMARY KEY(`id`),
	CONSTRAINT `offlineSosQueue_queueId_unique` UNIQUE(`queueId`)
);
--> statement-breakpoint
CREATE TABLE `sosEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`status` enum('active','resolved','cancelled','expired') NOT NULL DEFAULT 'active',
	`triggerType` enum('manual','voice','offline') NOT NULL DEFAULT 'manual',
	`initialLat` decimal(10,8) NOT NULL,
	`initialLng` decimal(11,8) NOT NULL,
	`notificationsSent` int NOT NULL DEFAULT 0,
	`trackingStartedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sosEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `sosEvents_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `sosRateLimit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`sosCount` int NOT NULL DEFAULT 0,
	`windowStart` timestamp NOT NULL,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`blockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sosRateLimit_id` PRIMARY KEY(`id`),
	CONSTRAINT `sosRateLimit_deviceId_unique` UNIQUE(`deviceId`)
);
