CREATE SEQUENCE "public"."actionsAdded" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "actions" (
	"added" integer NOT NULL,
	"encrypted" "bytea" NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"iv" "bytea" NOT NULL,
	"subprotocol" text NOT NULL,
	"time" integer NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;