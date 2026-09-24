import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  university: text("university").notNull(),
  specialization: text("specialization").notNull(),
  members: integer("members").notNull().default(4),
  activeIssues: integer("active_issues").notNull().default(0),
  capacity: integer("capacity").notNull().default(10),
  availability: text("availability").notNull().default("available"),
  accent: text("accent").notNull().default("teal"),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({
  id: true,
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;