import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { AssistantService } from "../../services/assistant.service";
import { LogService } from "../../services/log.service";
import { PersistanceService } from "../../services/persistance.service";
import { Logger, LoggerImpl } from "../../utils";
import { LogCollection } from "../../schemas/logs.schema";
import { WatsonError } from "../../utils/errors";

// Mock dos serviços
jest.mock("../../services/log.service");
jest.mock("../../services/persistance.service");
jest.mock("../../utils/logger");

describe("AssistantService", () => {
  let assistantService: AssistantService;
  let mockLogService: jest.Mocked<LogService>;
  let mockPersistanceService: jest.Mocked<PersistanceService>;
  let mockLoggerInstance: jest.Mocked<Logger>;

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
      logRateLimit: jest.fn(),
    } as any;
    (PersistanceService.getInstance as jest.Mock).mockReturnValue(
      mockPersistanceService
    );
    (LoggerImpl.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
    assistantService = AssistantService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    LoggerImpl.resetInstance();
  });

  describe("getAllAssistantsLogs", () => {
    it("deve retornar logs de todos os assistentes", async () => {
      const mockAssistants = {
        assistants: [
          {
            name: "Assistant 1",
            language: "pt-br",
            description: "Test assistant",
            assistant_id: "assistant1",
            assistant_skills: [],
            assistant_environments: [
              {
                name: "live",
                environment: "production",
                environment_id: "env1",
              },
            ],
          },
        ],
        pagination: {
          refresh_url: "test-url",
        },
      };

      const mockLogs = new Map<string, LogCollection>();
      mockLogs.set("Assistant 1", {
        logs: [
          {
            log_id: "1",
            request_timestamp: new Date().toISOString(),
            response_timestamp: new Date().toISOString(),
            language: "pt-br",
            assistant_id: "assistant1",
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
      });

      jest
        .spyOn(assistantService, "listAssistants")
        .mockResolvedValue(mockAssistants);
      jest
        .spyOn(assistantService, "getAssistantLogs")
        .mockImplementation(
          async (assistantId: string, startDate: Date, endDate: Date) => {
            mockLoggerInstance.info(
              `Processando assistente: ${assistantId}`,
              startDate,
              endDate
            );
            return (
              mockLogs.get("Assistant 1") || {
                logs: [],
                pagination: { next_url: null },
              }
            );
          }
        );

      const result = await assistantService.getAllAssistantsLogs(
        new Date(),
        new Date()
      );

      expect(result).toEqual(mockLogs);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Processando assistente: env1",
        expect.any(Date),
        expect.any(Date)
      );
    }, 15000);

    it("deve lidar com logs vazios", async () => {
      const mockAssistants = {
        assistants: [
          {
            name: "Assistant 1",
            language: "pt-br",
            description: "Test assistant",
            assistant_id: "assistant1",
            assistant_skills: [],
            assistant_environments: [
              {
                name: "live",
                environment: "production",
                environment_id: "env1",
              },
            ],
          },
        ],
        pagination: {
          refresh_url: "test-url",
        },
      };

      const mockLogs = new Map<string, LogCollection>();
      mockLogs.set("Assistant 1", {
        logs: [],
        pagination: { next_url: null },
      });

      jest
        .spyOn(assistantService, "listAssistants")
        .mockResolvedValue(mockAssistants);
      jest
        .spyOn(assistantService, "getAssistantLogs")
        .mockImplementation(async (assistantId, startDate, endDate) => {
          mockLoggerInstance.info(
            `Processando assistente: ${assistantId}`,
            startDate,
            endDate
          );
          return (
            mockLogs.get("Assistant 1") || {
              logs: [],
              pagination: { next_url: null },
            }
          );
        });

      const result = await assistantService.getAllAssistantsLogs(
        new Date(),
        new Date()
      );

      expect(result).toEqual(mockLogs);
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Processando assistente: env1",
        expect.any(Date),
        expect.any(Date)
      );
    }, 15000);

    it("deve lidar com erro ao buscar logs", async () => {
      const mockAssistants = {
        assistants: [
          {
            name: "Assistant 1",
            language: "pt-br",
            description: "Test assistant",
            assistant_id: "assistant1",
            assistant_skills: [],
            assistant_environments: [
              {
                name: "live",
                environment: "production",
                environment_id: "env1",
              },
            ],
          },
        ],
        pagination: {
          refresh_url: "test-url",
        },
      };

      const mockError = new WatsonError(
        "Failed to fetch assistant logs",
        500,
        {}
      );

      // Força a limpeza da instância singleton
      (AssistantService as any).instance = undefined;

      // Obtém uma nova instância do serviço
      assistantService = AssistantService.getInstance();

      jest
        .spyOn(assistantService, "listAssistants")
        .mockResolvedValue(mockAssistants);

      jest
        .spyOn(assistantService, "getAssistantLogs")
        .mockImplementation(async () => {
          console.log("Mock getAssistantLogs throwing error");
          throw mockError;
        });

      console.log("Before getAllAssistantsLogs");
      const result = await assistantService.getAllAssistantsLogs(
        new Date(),
        new Date()
      );
      console.log("After getAllAssistantsLogs");

      expect(result).toEqual(new Map());
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Failed to fetch logs for assistant Assistant 1",
        mockError
      );
    }, 15000);
  });
});
