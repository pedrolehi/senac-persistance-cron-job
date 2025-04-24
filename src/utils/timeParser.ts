import { systemConfig } from "../config/system.config";

export function getTimeInterval(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date(
    endDate.getTime() - systemConfig.timePeriod * 60 * 1000
  ); // Subtrai o intervalo configurado
  return { startDate, endDate };
}
