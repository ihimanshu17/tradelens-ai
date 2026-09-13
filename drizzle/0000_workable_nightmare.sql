CREATE TABLE "experiment_results" (
	"id" text PRIMARY KEY NOT NULL,
	"experiment_id" text NOT NULL,
	"observations" integer NOT NULL,
	"winning_trades" integer NOT NULL,
	"losing_trades" integer NOT NULL,
	"win_rate" double precision NOT NULL,
	"average_return" double precision NOT NULL,
	"median_return" double precision NOT NULL,
	"best_return" double precision NOT NULL,
	"worst_return" double precision NOT NULL,
	"cumulative_return" double precision NOT NULL,
	"dataset_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"experiment_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"experiment_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_question" text NOT NULL,
	"market" text NOT NULL,
	"timeframe" text DEFAULT 'daily' NOT NULL,
	"condition" jsonb NOT NULL,
	"entry_condition" jsonb NOT NULL,
	"exit_condition" jsonb NOT NULL,
	"holding_period" integer NOT NULL,
	"test_period" jsonb NOT NULL,
	"cost_assumption" double precision DEFAULT 0.001 NOT NULL,
	"hypothesis" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_versions" ADD CONSTRAINT "experiment_versions_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;