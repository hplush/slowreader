CREATE TABLE "sessions" (
	"clientId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY,
	"token" text NOT NULL,
	"usedAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"lastActionAt" timestamp,
	"passwordHash" text
);
--> statement-breakpoint
CREATE INDEX "sessionsUserIdx" ON "sessions" ("userId");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id");