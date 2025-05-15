import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "@jest/globals";
import { CronJobs } from "../../jobs/cron";
import { AssistantController } from "../../controllers/assistant.controller";
import { PersistanceService } from "../../services/persistance.service";
import { LogService } from "../../services/log.service";
import { EmailService } from "../../services/email.service";
import { LogsResponse } from "../../schemas/logs.response.schema";

// Mock dos serviços
jest.mock("../../controllers/assistant.controller");
jest.mock("../../services/persistance.service");
jest.mock("../../services/log.service");
jest.mock("../../services/email.service");

// Mock do console para evitar output durante os testes
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe("CronJobs", () => {
  let cronJobs: CronJobs;
  let mockAssistantController: jest.Mocked<AssistantController>;
  let mockPersistanceService: jest.Mocked<PersistanceService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    // Limpa todos os mocks
    jest.clearAllMocks();

    // Configura os mocks
    mockAssistantController = {
      getAllLogsForPeriod: jest.fn(),
    } as any;

    mockPersistanceService = {
      saveProcessedLogs: jest.fn(),
    } as any;

    mockEmailService = {
      sendErrorNotification: jest.fn().mockImplementation(async () => {
        return Promise.resolve();
      }),
    } as any;

    // Configura os mocks nos serviços
    (AssistantController.getInstance as jest.Mock).mockReturnValue(
      mockAssistantController
    );
    (PersistanceService.getInstance as jest.Mock).mockReturnValue(
      mockPersistanceService
    );
    (EmailService.getInstance as jest.Mock).mockReturnValue(mockEmailService);

    // Mock do LogService.processAllAssistants como uma função estática
    (LogService.processAllAssistants as jest.Mock) = jest.fn();

    // Reseta a instância do CronJobs
    (CronJobs as any).instance = undefined;

    cronJobs = CronJobs.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("runJob", () => {
    it("deve enviar email quando ocorre um erro durante o processamento", async () => {
      // Configura o mock para lançar um erro
      const mockError = new Error("Erro ao buscar logs");
      mockAssistantController.getAllLogsForPeriod.mockRejectedValue(mockError);

      // Executa o job
      await cronJobs["runJob"]();

      // Verifica se o email foi enviado com o erro correto
      expect(mockEmailService.sendErrorNotification).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          jobName: "processLogs",
          timestamp: expect.any(String),
        })
      );
    });

    it("deve enviar email quando ocorre um erro durante o salvamento", async () => {
      // Configura os mocks para simular sucesso na busca e erro no salvamento
      const mockLogsResponse: LogsResponse = {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        assistants: {},
      };

      const mockError = new Error("Erro ao salvar logs");

      mockAssistantController.getAllLogsForPeriod.mockResolvedValue(
        mockLogsResponse
      );
      (LogService.processAllAssistants as jest.Mock).mockReturnValue({});
      mockPersistanceService.saveProcessedLogs.mockRejectedValue(mockError);

      // Executa o job
      await cronJobs["runJob"]();

      // Verifica se o email foi enviado com o erro correto
      expect(mockEmailService.sendErrorNotification).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          jobName: "processLogs",
          timestamp: expect.any(String),
        })
      );
    });

    it("deve incluir informações de contexto no email", async () => {
      // Configura o mock para lançar um erro
      const mockError = new Error("Erro ao processar logs");
      mockAssistantController.getAllLogsForPeriod.mockRejectedValue(mockError);

      // Executa o job
      await cronJobs["runJob"]();

      // Verifica se o email foi enviado com as informações corretas
      expect(mockEmailService.sendErrorNotification).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          jobName: "processLogs",
          timestamp: expect.any(String),
        })
      );
    });

    it("deve lidar com erro ao processar a notificação", async () => {
      const mockError = new Error("Erro na requisição");
      mockEmailService.sendErrorNotification.mockRejectedValue(mockError);

      try {
        await cronJobs["runJob"]();
      } catch (error) {
        // Ignora o erro, pois estamos testando o tratamento de erro
      }

      expect(console.error).toHaveBeenCalledWith(
        "[CRON][ERROR] Erro durante o processamento:",
        expect.any(Error)
      );
    });
  });
});
