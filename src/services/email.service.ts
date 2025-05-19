import axios from "axios";
import { systemConfig } from "../config/system.config";
import { Logger, LoggerImpl } from "../utils";

export class EmailService {
  private static instance: EmailService;
  private readonly emailUrl: string;
  private readonly emailToken: string;
  private readonly logger: Logger;

  private constructor() {
    this.emailUrl = process.env.ENVIO_EMAIL_URL || "";
    this.emailToken = process.env.ENVIO_EMAIL_TOKEN || "";
    this.logger = LoggerImpl.getInstance();

    if (!this.emailUrl || !this.emailToken) {
      this.logger.warn(
        "Variáveis de ambiente ENVIO_EMAIL_URL e/ou ENVIO_EMAIL_TOKEN não configuradas",
        {
          emailUrl: this.emailUrl,
          emailToken: this.emailToken,
        }
      );
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendErrorNotification(error: Error, context: any = {}) {
    try {
      // Mensagem simplificada do erro com limite de tamanho
      const MAX_MESSAGE_LENGTH = 1000; // Limite de 1000 caracteres
      let errorMessage = error.message || "Erro desconhecido";

      // Trunca a mensagem se for muito grande
      if (errorMessage.length > MAX_MESSAGE_LENGTH) {
        errorMessage = errorMessage.substring(0, MAX_MESSAGE_LENGTH) + "...";
      }

      const emailContent = `
Erro no Processamento de Logs

Detalhes do Erro:
${errorMessage}

Este é um email automático do sistema de persistência de logs.`;

      for (const email of systemConfig.email.stakeholders) {
        const params = {
          assunto: "[SERVICE][PERSISTENCE] Erro ao processar logs",
          mensagem: emailContent,
          remetente: "assistentevirtual@sp.senac.br",
          destinatario: email,
        };

        try {
          // Verifica o tamanho total do payload
          const payloadSize = JSON.stringify(params).length;
          if (payloadSize > 5000) {
            // Limite de 5KB para o payload total
            this.logger.warn(
              "Payload do email muito grande, truncando mensagem",
              {
                originalSize: payloadSize,
                recipient: email,
              }
            );
            params.mensagem = params.mensagem.substring(0, 500);
          }

          await axios({
            method: "POST",
            url: this.emailUrl,
            headers: {
              token: this.emailToken,
              "Content-Type": "application/json;charset=UTF-8",
            },
            data: params,
          });

          this.logger.info("Email de notificação de erro enviado com sucesso", {
            errorName: error.name,
            recipient: email,
          });
        } catch (emailError: any) {
          // Simplifica o log de erro para mostrar apenas informações essenciais
          const errorInfo = {
            status: emailError.response?.status,
            message: emailError.response?.data?.Message || emailError.message,
            recipient: email,
          };

          this.logger.error("Erro ao enviar email de notificação", errorInfo);
          console.error("Erro ao enviar email:", errorInfo);
        }
      }
    } catch (error: any) {
      // Simplifica o log de erro para mostrar apenas informações essenciais
      const errorInfo = {
        message: error.message || "Erro desconhecido",
      };

      this.logger.error("Erro ao processar notificação de erro", errorInfo);
      console.error("Erro ao processar notificação:", errorInfo);
    }
  }
}
