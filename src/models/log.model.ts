import mongoose from "mongoose";
import zodToMongoose from "@zodyac/zod-mongoose";
import { LogSchema } from "../schemas/logs.schema";

const mongooseLogSchema = zodToMongoose(LogSchema);

export const LogModel = mongoose.model("Log", mongooseLogSchema);
