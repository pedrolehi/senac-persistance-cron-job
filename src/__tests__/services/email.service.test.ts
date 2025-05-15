import axios from "axios";
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { EmailService } from "../../services/email.service";
import { systemConfig } from "../../config/system.config";
import dotenv from "dotenv";
import { LoggerImpl } from "../../utils/logger";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Mock do axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock do Logger
jest.mock("../../utils/logger");
const mockedLoggerImpl = LoggerImpl as jest.Mocked<typeof LoggerImpl>;

jest.mock("../../config/system.config", () => ({
  systemConfig: {
    email: {
      stakeholders: ["pedro.lrmuniz@sp.senac.br"],
    },
  },
}));

describe("EmailService", () => {
  let emailService: EmailService;
  const mockLoggerInstance = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Configura o mock do Logger
    (mockedLoggerImpl.getInstance as jest.Mock).mockReturnValue(
      mockLoggerInstance
    );

    (EmailService as any).instance = undefined;
    emailService = EmailService.getInstance();
  });

  afterEach(() => {
    // Limpa todos os mocks após cada teste
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("deve retornar a mesma instância em múltiplas chamadas", () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("sendErrorNotification", () => {
    it("deve enviar email para todos os stakeholders quando ocorre um erro", async () => {
      const mockError = new Error("Erro de teste");
      const mockContext = { jobName: "testJob" };

      mockedAxios.mockResolvedValueOnce({});

      await emailService.sendErrorNotification(mockError, mockContext);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: "POST",
        url: expect.any(String),
        headers: {
          token: expect.any(String),
          "Content-Type": "application/json;charset=UTF-8",
        },
        data: {
          assunto: "[SERVICE][PERSISTENCE] Erro ao processar logs",
          mensagem: expect.stringContaining("Erro de teste"),
          remetente: "assistentevirtual@sp.senac.br",
          destinatario: "pedro.lrmuniz@sp.senac.br",
        },
      });
    });

    it("deve incluir informações de contexto no email", async () => {
      mockedAxios.mockResolvedValueOnce({});

      await emailService.sendErrorNotification(new Error("Test error"), {
        auditDate: "2025-05-14",
        reportId: "123",
      });

      // Verifica se o email contém as informações de contexto
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mensagem: expect.stringContaining('"auditDate": "2025-05-14"'),
          }),
        })
      );
    });

    it("deve lidar com erro ao processar a notificação", async () => {
      // Simula um erro ao fazer a requisição
      mockedAxios.mockRejectedValueOnce(new Error("Erro na requisição"));
      let errorThrown = null;
      try {
        await emailService.sendErrorNotification(new Error("Test error"), {
          auditDate: "2025-05-14",
          reportId: "123",
        });
      } catch (e) {
        errorThrown = e;
      }
      expect(errorThrown).toBeInstanceOf(Error);
      // Verifica se o Logger.error foi chamado
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        "Erro ao enviar email de notificação",
        {
          originalError: expect.any(Error),
          emailError: expect.any(Error),
          recipient: expect.any(String),
        }
      );
    });
  });
});

// Teste de integração separado para facilitar a execução
describe("EmailService Integration", () => {
  let integrationEmailService: EmailService;

  beforeEach(() => {
    // Restaura o axios real para este teste
    jest.unmock("axios");
    integrationEmailService = EmailService.getInstance();
  });

  it("INTEGRATION_TEST: deve enviar um email real quando ocorre um erro", async () => {
    // Verifica se as variáveis de ambiente necessárias estão configuradas
    if (!process.env.ENVIO_EMAIL_URL || !process.env.ENVIO_EMAIL_TOKEN) {
      console.error("Variáveis de ambiente não configuradas:");
      console.error("ENVIO_EMAIL_URL:", process.env.ENVIO_EMAIL_URL);
      console.error("ENVIO_EMAIL_TOKEN:", process.env.ENVIO_EMAIL_TOKEN);
      throw new Error("Variáveis de ambiente necessárias não configuradas");
    }

    // Cria um erro simulado
    const error = new Error("Erro de teste - Integração");
    error.stack = "Stack trace de teste\nLinha 1\nLinha 2";

    const context = {
      auditDate: new Date().toISOString(),
      reportId: "TEST-123",
      additionalInfo: "Este é um teste de integração do serviço de email",
    };

    console.log("Enviando email de teste...");
    console.log("URL:", process.env.ENVIO_EMAIL_URL);
    console.log("Token:", process.env.ENVIO_EMAIL_TOKEN);
    console.log("Stakeholders:", systemConfig.email.stakeholders);

    // Envia a notificação
    await integrationEmailService.sendErrorNotification(error, context);

    console.log("Email enviado com sucesso!");

    // Como é um teste de integração, não podemos verificar o resultado
    // mas podemos garantir que não houve exceção
    expect(true).toBe(true);
  });
});
