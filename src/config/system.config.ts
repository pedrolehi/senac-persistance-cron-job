export const systemConfig = {
  timePeriod: 70, // Ex: timePeriod: 60 (in minutes)
  cronExpression: `0 * * * *`, //cron pattern que define a frequencia com que a tarefa é realizada. Ex: 0 * * * * (every hour)
  filesPerPage: 200, // Ex: filesPerPage: 200
  debug: process.env.NODE_ENV === "development", // Habilita logs de debug em ambiente de desenvolvimento
  excludedAssistants: [
    "HUB",
    "GTAE",
    "testes GEF",
    "testes GEP",
    "testes Suporte",
  ],
  audit: {
    cronExpression: "30 9 * * *", // Roda todo dia às 9:30 da manhã
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
