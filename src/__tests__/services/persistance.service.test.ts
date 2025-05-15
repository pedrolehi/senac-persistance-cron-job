import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { PersistanceService } from "../../services/persistance.service";
import { LoggerImpl } from "../../utils/logger";
import { StandardizedLog } from "../../schemas/standardized-log.schema";
import { SaveResult } from "../../schemas/save-result.schema";

// Mock dos serviços
jest.mock("../../utils/logger");
jest.mock("../../repositories/log.repository");

describe("PersistanceService", () => {
  let persistanceService: PersistanceService;
  let mockLoggerInstance: jest.Mocked<LoggerImpl>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggerInstance = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as any;
    (LoggerImpl.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
    persistanceService = PersistanceService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("saveProcessedLogs", () => {
    it("deve salvar logs corretamente", async () => {
      const mockLogs: Record<string, StandardizedLog[]> = {
        "test-assistant": [
          {
            log_id: "1",
            conversation_id: "conv1",
            user: { session_id: "session1" },
            context: {},
            input: "Test input",
            intents: [],
            entities: [],
            timestamp: new Date(),
          },
        ],
      };

      const mockResult: Record<string, SaveResult> = {
        "test-assistant": {
          success: true,
          count: 1,
          duplicates: 0,
        },
      };

      jest
        .spyOn(persistanceService, "saveProcessedLogs")
        .mockImplementation(async () => {
          mockLoggerInstance.info("Logs salvos com sucesso");
          return mockResult;
        });

      const result = await persistanceService.saveProcessedLogs(mockLogs);

      expect(result).toEqual(mockResult);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Logs salvos com sucesso"
      );
    }, 15000);

    it("deve lidar com logs vazios", async () => {
      const mockLogs: Record<string, StandardizedLog[]> = {};
      const mockResult: Record<string, SaveResult> = {};

      jest
        .spyOn(persistanceService, "saveProcessedLogs")
        .mockImplementation(async () => {
          mockLoggerInstance.info("Nenhum log para salvar");
          return mockResult;
        });

      const result = await persistanceService.saveProcessedLogs(mockLogs);

      expect(result).toEqual(mockResult);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Nenhum log para salvar"
      );
    }, 15000);

    it("deve lidar com erro ao salvar logs", async () => {
      const mockLogs: Record<string, StandardizedLog[]> = {
        "test-assistant": [
          {
            log_id: "1",
            conversation_id: "conv1",
            user: { session_id: "session1" },
            context: {},
            input: "Test input",
            intents: [],
            entities: [],
            timestamp: new Date(),
          },
        ],
      };

      const mockError = new Error("Erro ao salvar logs");

      jest
        .spyOn(persistanceService, "saveProcessedLogs")
        .mockImplementation(async () => {
          mockLoggerInstance.error("Erro ao salvar logs:", mockError);
          throw mockError;
        });

      await expect(
        persistanceService.saveProcessedLogs(mockLogs)
      ).rejects.toThrow(mockError);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Erro ao salvar logs:",
        mockError
      );
    }, 15000);
  });
});
