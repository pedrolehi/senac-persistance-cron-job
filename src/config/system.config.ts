export const systemConfig = {
  timePeriod: 70, // Ex: timePeriod: 60 (in minutes)
  cronExpression: `0 * * * *`, //cron pattern que define a frequencia com que a tarefa é realizada.
  // sendo o schema:
  //  *    *    *    *    *    *
  // ┬    ┬    ┬    ┬    ┬    ┬
  // │    │    │    │    │    │
  // │    │    │    │    │    └─ day of week (0-7, 1L-7L) (0 or 7 is Sun)
  // │    │    │    │    └────── month (1-12, JAN-DEC)
  // │    │    │    └─────────── day of month (1-31, L)
  // │    │    └──────────────── hour (0-23)
  // │    └───────────────────── minute (0-59)
  // └────────────────────────── second (0-59, optional)
  filesPerPage: 200, // Ex: filesPerPage: 200
  excludedAssistants: [
    "HUB",
    "GTAE",
    "testes GEF",
    "testes GEP",
    "testes Suporte",
  ],
  audit: {
    cronExpression: "0 12 * * *", // Roda todo dia às 12h
    reportPath: "logs/audit", // Diretório onde os relatórios serão salvos
  },
  sensitiveFields: [
    "resultUsuario",
    "resultAluno",
    "cpf",
    "nome",
    "email",
    "dataNascimento",
    "nomeSobrenome",
    "contrato",
    "private",
    "resultDebitos",
    "resultBoleto",
    "resultValoresPagos",
    "resultDeclaracaoMatricula",
    "resultArquivoMatricula",
    "resultCertificados",
    "resultArquivoCertificado",
    "resultViaNF",
    "resultEnvioEmail",
    "cursoEscolhido",
    "docCliente",
    "unidade",
    "codigoPessoaCorp",
    "codigoLoginUnico",
    "loginEdu",
    "resultCancelamento",
    "resultAnulacao",
    "resultReversao",
    "resultConciliacao",
    "resultProrrogacao",
    "resultDescontoIsencao",
    "resultNaoProcessados",
    "resultMatriculaPorData",
    "cpfCnpj",
    "dadosBancarios",
    "nomePrestador",
    "CpfPrestador",
    "pisPasepNit",
    "banco",
    "agencia",
    "numeroConta",
  ],
};
