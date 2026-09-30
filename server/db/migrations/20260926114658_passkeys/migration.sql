-- Old sessions keep plain tokens, which can't be converted to hashes
DELETE FROM "sessions";--> statement-breakpoint
CREATE TABLE "challenges" (
	"challenge" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"id" serial PRIMARY KEY,
	"type" text NOT NULL,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"aaguid" text NOT NULL,
	"counter" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"lockedKey" text NOT NULL,
	"name" text NOT NULL,
	"publicKey" bytea NOT NULL,
	"synced" boolean NOT NULL,
	"transports" text[] NOT NULL,
	"usedAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "passkeyId" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "tokenHash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordLockedKey" text;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "clientId";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE "sessions_id_seq";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessionsTokenHashKey" UNIQUE("tokenHash");--> statement-breakpoint
CREATE UNIQUE INDEX "challengesChallengeIdx" ON "challenges" ("challenge");--> statement-breakpoint
CREATE INDEX "passkeysUserIdx" ON "passkeys" ("userId");--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;