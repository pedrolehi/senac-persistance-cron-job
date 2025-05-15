import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { LogService } from "../../services/log.service";
import { PersistanceService } from "../../services/persistance.service";
import { LoggerImpl } from "../../utils/logger";
import { LogsResponse } from "../../schemas/logs.response.schema";

// Mock dos serviços
jest.mock("../../services/persistance.service");
jest.mock("../../utils/logger");

describe("LogService", () => {
  let logService: LogService;
  let mockPersistanceService: jest.Mocked<PersistanceService>;
  let mockLoggerInstance: jest.Mocked<LoggerImpl>;

  beforeEach(() => {
    jest.clearAllMocks();
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
    logService = new LogService("test-assistant");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("processAllAssistants", () => {
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
            pagination: { next_url: null },
          },
        },
      };

      const result = LogService.processAllAssistants(mockLogs);

      expect(result).toBeDefined();
      expect(result["test-assistant"]).toBeDefined();
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Processando assistente:",
        "test-assistant"
      );
    });

    it("deve lidar com logs vazios", async () => {
      const mockLogs: LogsResponse = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        assistants: {
          "test-assistant": {
            logs: [],
            pagination: { next_url: null },
          },
        },
      };

      const result = LogService.processAllAssistants(mockLogs);

      expect(result).toBeDefined();
      expect(result["test-assistant"]).toBeDefined();
      expect(result["test-assistant"]).toHaveLength(0);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Processando assistente:",
        "test-assistant"
      );
    });

    it("deve lidar com erro ao processar logs", async () => {
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
            pagination: { next_url: null },
          },
        },
      };

      const mockError = new Error("Erro ao processar logs");
      jest
        .spyOn(LogService.prototype, "transformLogs")
        .mockImplementation(() => {
          mockLoggerInstance.error("Erro ao processar logs:", mockError);
          throw mockError;
        });

      expect(() => LogService.processAllAssistants(mockLogs)).toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Erro ao processar logs:",
        mockError
      );
    });
  });
});
