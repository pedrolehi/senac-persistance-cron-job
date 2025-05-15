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
      const errorMessage = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .error-details { background-color: #fff3f3; padding: 15px; border-left: 4px solid #dc3545; margin-bottom: 20px; }
    .context { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
    pre { background-color: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Erro no Processamento de Logs</h1>
    </div>

    <div class="error-details">
      <h2>Detalhes do Erro</h2>
      <ul>
        <li><strong>Tipo:</strong> ${error.name}</li>
        <li><strong>Mensagem:</strong> ${error.message}</li>
      </ul>
      <h3>Stack Trace:</h3>
      <pre>${error.stack}</pre>
    </div>

    <div class="context">
      <h2>Contexto</h2>
      <pre>${JSON.stringify(context, null, 2)}</pre>
    </div>

    <div class="footer">
      <p>Este é um email automático do sistema de persistência de logs.</p>
    </div>
  </div>
</body>
</html>`;

      for (const email of systemConfig.email.stakeholders) {
        const params = {
          assunto: "[SERVICE][PERSISTENCE] Erro ao processar logs",
          mensagem: errorMessage,
          remetente: "assistentevirtual@sp.senac.br",
          destinatario: email,
        };

        try {
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
        } catch (emailError) {
          this.logger.error("Erro ao enviar email de notificação", {
            originalError: error,
            emailError,
            recipient: email,
          });
          throw emailError;
        }
      }
    } catch (error) {
      this.logger.error("Erro ao processar notificação de erro", { error });
      throw error;
    }
  }
}
