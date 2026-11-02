CREATE TABLE "analytics" (
	"browsers" jsonb NOT NULL,
	"dau" integer NOT NULL,
	"date" date PRIMARY KEY,
	"mau" integer NOT NULL,
	"passkeys" jsonb NOT NULL,
	"systems" jsonb NOT NULL,
	"users" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"count" integer NOT NULL,
	"date" date,
	"name" text,
	CONSTRAINT "events_pkey" PRIMARY KEY("date","name")
);
