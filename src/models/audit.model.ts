import mongoose from "mongoose";
import zodToMongoose from "@zodyac/zod-mongoose";
import { SyncReportSchema } from "../schemas/sync-report.schema";

const mongooseAuditSchema = zodToMongoose(SyncReportSchema);

// Sobrescreve o tipo do campo sanitizedLogs para Mixed
mongooseAuditSchema.path("sanitizedLogs", {
  type: mongoose.Schema.Types.Mixed,
  default: {},
});

// Modelo para a collection audit
export const AuditModel = mongoose.model("audit", mongooseAuditSchema, "audit");
