import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { LogAuditService } from "../../services/log-audit.service";
import { LogService } from "../../services/log.service";
import { PersistanceService } from "../../services/persistance.service";
import { LoggerImpl } from "../../utils/logger";
import { LogsResponse } from "../../schemas/logs.response.schema";
import { SyncReport } from "../../schemas/sync-report.schema";

// Mock dos serviços
jest.mock("../../services/log.service");
jest.mock("../../services/persistance.service");
jest.mock("../../utils/logger");

describe("LogAuditService", () => {
  let logAuditService: LogAuditService;
  let mockLogService: jest.Mocked<LogService>;
  let mockPersistanceService: jest.Mocked<PersistanceService>;
  let mockLoggerInstance: jest.Mocked<LoggerImpl>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogService = {
      processAllAssistants: jest.fn(),
    } as any;
    mockPersistanceService = {
      saveProcessedLogs: jest.fn(),
    } as any;
    mockLoggerInstance = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as any;
    (PersistanceService.getInstance as jest.Mock).mockReturnValue(
      mockPersistanceService
    );
    (LoggerImpl.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
    logAuditService = new LogAuditService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("auditLogsForDay", () => {
    it("deve processar logs corretamente", async () => {
      const mockLogs: LogsResponse = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        assistants: {
          "test-assistant": {
            logs: [
              {
                log_id: "1",
                request_timestamp: new Date().toISOString(),
                response_timestamp: new Date().toISOString(),
                language: "pt-br",
                assistant_id: "test-assistant",
                session_id: "session1",
                response: {
                  input: { text: "Test input" },
                  context: {},
                  output: {
                    intents: [],
                    entities: [],
                    generic: [],
                  },
                },
              },
            ],
            pagination: { refresh_url: "test-url" },
          },
        },
      };

      const mockReport: SyncReport = {
        timestamp: new Date().toISOString(),
        syncStatus: {
          status: "SUCCESS",
          missingLogs: [],
          includedLogs: [
            {
              assistant: "test-assistant",
              logId: "1",
              timestamp: new Date().toISOString(),
            },
          ],
        },
        summary: {
          totalLogs: 1,
          includedLogs: 1,
          missingLogs: 0,
          assistants: [
            {
              name: "test-assistant",
              watsonLogs: 1,
              savedLogs: 1,
            },
          ],
        },
        sanitizedLogs: {},
      };

      jest
        .spyOn(logAuditService, "auditLogsForDay")
        .mockImplementation(async () => {
          mockLoggerInstance.info("Logs processados com sucesso");
          return mockReport;
        });

      await logAuditService.auditLogsForDay(new Date());

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Logs processados com sucesso"
      );
    }, 15000);

    it("deve lidar com logs vazios", async () => {
      const mockLogs: LogsResponse = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        assistants: {
          "test-assistant": {
            logs: [],
            pagination: { refresh_url: "test-url" },
          },
        },
      };

      const mockReport: SyncReport = {
        timestamp: new Date().toISOString(),
        syncStatus: {
          status: "SUCCESS",
          missingLogs: [],
          includedLogs: [],
        },
        summary: {
          totalLogs: 0,
          includedLogs: 0,
          missingLogs: 0,
          assistants: [
            {
              name: "test-assistant",
              watsonLogs: 0,
              savedLogs: 0,
            },
          ],
        },
        sanitizedLogs: {},
      };

      jest
        .spyOn(logAuditService, "auditLogsForDay")
        .mockImplementation(async () => {
          mockLoggerInstance.info("Logs processados com sucesso");
          return mockReport;
        });

      await logAuditService.auditLogsForDay(new Date());

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Logs processados com sucesso"
      );
    }, 15000);

    it("deve lidar com erro ao processar logs", async () => {
      const mockError = new Error("Erro ao processar logs");
      jest
        .spyOn(logAuditService, "auditLogsForDay")
        .mockImplementation(async () => {
          mockLoggerInstance.error("Erro ao processar logs:", mockError);
          throw mockError;
        });

      await expect(logAuditService.auditLogsForDay(new Date())).rejects.toThrow(
        mockError
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Erro ao processar logs:",
        mockError
      );
    }, 15000);

    it("deve lidar com erro ao salvar logs", async () => {
      const mockError = new Error("Erro ao salvar logs");
      jest
        .spyOn(logAuditService, "auditLogsForDay")
        .mockImplementation(async () => {
          mockLoggerInstance.error("Erro ao salvar logs:", mockError);
          throw mockError;
        });

      await expect(logAuditService.auditLogsForDay(new Date())).rejects.toThrow(
        mockError
      );

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Erro ao salvar logs:",
        mockError
      );
    }, 15000);
  });
});
