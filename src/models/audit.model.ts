import mongoose from "mongoose";
import zodToMongoose from "@zodyac/zod-mongoose";
import { SyncReportSchema } from "../schemas/sync-report.schema";

const mongooseAuditSchema = zodToMongoose(SyncReportSchema);

// Modelo para a collection audit
export const AuditModel = mongoose.model("audit", mongooseAuditSchema, "audit");
