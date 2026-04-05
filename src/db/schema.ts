import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const competitors = sqliteTable("competitors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const searchRuns = sqliteTable("search_runs", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id")
    .notNull()
    .references(() => competitors.id),
  status: text("status", { enum: ["running", "complete", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  completedAt: integer("completed_at", { mode: "number" }),
});

export const researchResults = sqliteTable("research_results", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => searchRuns.id),
  source: text("source", {
    enum: ["reddit", "hackernews", "twitter", "indiehackers", "github"],
  }).notNull(),
  url: text("url").notNull(),
  extractedText: text("extracted_text").notNull(),
  signalType: text("signal_type", {
    enum: [
      "product",
      "pricing",
      "positioning",
      "hiring",
      "partnership",
      "reputation",
      "corporate",
    ],
  }).notNull(),
  score: integer("score"),
  reasoning: text("reasoning"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
