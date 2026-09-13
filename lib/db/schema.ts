import { pgTable, text, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalQuestion: text("original_question").notNull(),
  market: text("market").notNull(),
  timeframe: text("timeframe").notNull().default("daily"),
  condition: jsonb("condition").notNull(),
  entryCondition: jsonb("entry_condition").notNull(),
  exitCondition: jsonb("exit_condition").notNull(),
  holdingPeriod: integer("holding_period").notNull(),
  testPeriod: jsonb("test_period").notNull(),
  costAssumption: doublePrecision("cost_assumption").notNull().default(0.001),
  hypothesis: text("hypothesis").notNull(),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const experimentVersions = pgTable("experiment_versions", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  experimentData: jsonb("experiment_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const experimentResults = pgTable("experiment_results", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id")
    .notNull()
    .references(() => experiments.id, { onDelete: "cascade" }),
  observations: integer("observations").notNull(),
  winningTrades: integer("winning_trades").notNull(),
  losingTrades: integer("losing_trades").notNull(),
  winRate: doublePrecision("win_rate").notNull(),
  averageReturn: doublePrecision("average_return").notNull(),
  medianReturn: doublePrecision("median_return").notNull(),
  bestReturn: doublePrecision("best_return").notNull(),
  worstReturn: doublePrecision("worst_return").notNull(),
  cumulativeReturn: doublePrecision("cumulative_return").notNull(),
  datasetType: text("dataset_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DBExperiment = typeof experiments.$inferSelect;
export type DBExperimentVersion = typeof experimentVersions.$inferSelect;
export type DBExperimentResult = typeof experimentResults.$inferSelect;
