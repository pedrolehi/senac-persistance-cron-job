import { systemConfig } from "../config/system.config";

export function getTimeInterval(): { startDate: Date; endDate: Date } {
  const endDate = new Date();

  // Set endDate to end of current day in UTC (23:59:59.999)
  endDate.setUTCHours(23, 59, 59, 999);

  // Set startDate to beginning of current day in UTC (00:00:00.000)
  const startDate = new Date(endDate);
  startDate.setUTCHours(0, 0, 0, 0);

  return { startDate, endDate };
}
