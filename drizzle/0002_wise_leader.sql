CREATE TABLE `webhook_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_id` varchar(128) NOT NULL,
	`event` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_deliveries_delivery_id_unique` UNIQUE(`delivery_id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','paid','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_reference` varchar(128);--> statement-breakpoint
ALTER TABLE `payments` ADD `refunded_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `wasaa_open_user_id` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_payment_reference_unique` UNIQUE(`payment_reference`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wasaa_open_user_id_unique` UNIQUE(`wasaa_open_user_id`);