-- AuxiLia / Lia — Modelo revisado para Oracle SQL Developer Data Modeler
-- Importação: File > Import > DDL File (Oracle 12c+).
-- Ajustes: PEDIDO.id_servico opcional; nomes do glossário Java;
-- PROGRESSO (id_usuario,id_servico) e integridade referencial com SERVICO.
-- Este arquivo define um NOVO modelo; não altera automaticamente o .dmd existente.

CREATE TABLE PONTO_ATENDIMENTO (
    id_ponto_atendimento NUMBER(10) NOT NULL,
    nome VARCHAR2(120) NOT NULL,
    tipo VARCHAR2(30) NOT NULL,
    cidade VARCHAR2(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    bairro VARCHAR2(100),
    ativo CHAR(1) DEFAULT 'S' NOT NULL,
    CONSTRAINT pk_ponto_atendimento PRIMARY KEY (id_ponto_atendimento),
    CONSTRAINT ck_ponto_ativo CHECK (ativo IN ('S','N'))
);

CREATE TABLE USUARIO (
    id_usuario NUMBER(10) NOT NULL,
    id_ponto_atendimento NUMBER(10),
    nome_preferido VARCHAR2(80) NOT NULL,
    ano_nascimento NUMBER(4),
    velocidade_fala NUMBER(3,2) DEFAULT 1.00 NOT NULL,
    data_cadastro TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT ck_usuario_velocidade CHECK (velocidade_fala BETWEEN 0.50 AND 2.00)
);

CREATE TABLE FAMILIAR (
    id_familiar NUMBER(10) NOT NULL,
    id_usuario NUMBER(10) NOT NULL,
    apelido VARCHAR2(80) NOT NULL,
    parentesco VARCHAR2(30) NOT NULL,
    ajuda_remota CHAR(1) DEFAULT 'N' NOT NULL,
    CONSTRAINT pk_familiar PRIMARY KEY (id_familiar),
    CONSTRAINT ck_familiar_ajuda CHECK (ajuda_remota IN ('S','N'))
);

CREATE TABLE SERVICO (
    id_servico NUMBER(10) NOT NULL,
    nome VARCHAR2(100) NOT NULL,
    categoria VARCHAR2(40) NOT NULL,
    descricao VARCHAR2(300),
    nivel_risco VARCHAR2(15) NOT NULL,
    ativo CHAR(1) DEFAULT 'S' NOT NULL,
    CONSTRAINT pk_servico PRIMARY KEY (id_servico),
    CONSTRAINT ck_servico_risco CHECK (nivel_risco IN ('BAIXO','MEDIO','ALTO')),
    CONSTRAINT ck_servico_ativo CHECK (ativo IN ('S','N'))
);

CREATE TABLE PEDIDO (
    id_pedido NUMBER(10) NOT NULL,
    id_usuario NUMBER(10) NOT NULL,
    id_servico NUMBER(10),
    canal VARCHAR2(20) NOT NULL,
    status VARCHAR2(20) NOT NULL,
    resumo_solicitacao VARCHAR2(500) NOT NULL,
    nivel_risco VARCHAR2(15) NOT NULL,
    data_hora TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    finalizado_em TIMESTAMP,
    CONSTRAINT pk_pedido PRIMARY KEY (id_pedido),
    CONSTRAINT ck_pedido_canal CHECK (canal IN ('APP','LIGACAO','PONTO')),
    CONSTRAINT ck_pedido_status CHECK (status IN ('ABERTO','EM_ANDAMENTO','CONCLUIDO','CANCELADO','FALHOU')),
    CONSTRAINT ck_pedido_risco CHECK (nivel_risco IN ('BAIXO','MEDIO','ALTO'))
);

CREATE TABLE DOCUMENTO (
    id_documento NUMBER(10) NOT NULL,
    id_pedido NUMBER(10) NOT NULL,
    tipo_documento VARCHAR2(40) NOT NULL,
    resumo_leitura VARCHAR2(1000) NOT NULL,
    data_hora TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_documento PRIMARY KEY (id_documento)
);

CREATE TABLE CONFIRMACAO (
    id_confirmacao NUMBER(10) NOT NULL,
    id_pedido NUMBER(10) NOT NULL,
    tipo VARCHAR2(25) NOT NULL,
    status VARCHAR2(20) NOT NULL,
    data_hora TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_confirmacao PRIMARY KEY (id_confirmacao),
    CONSTRAINT ck_conf_tipo CHECK (tipo IN ('VOZ','TOQUE','FAMILIAR')),
    CONSTRAINT ck_conf_status CHECK (status IN ('PENDENTE','APROVADA','NEGADA','EXPIRADA'))
);

CREATE TABLE ANALISE_GOLPE (
    id_analise_golpe NUMBER(10) NOT NULL,
    id_pedido NUMBER(10) NOT NULL,
    veredito VARCHAR2(25) NOT NULL,
    nivel_risco VARCHAR2(15) NOT NULL,
    resumo_indicios VARCHAR2(1000),
    data_hora TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_analise_golpe PRIMARY KEY (id_analise_golpe),
    CONSTRAINT ck_analise_veredito CHECK (veredito IN ('SEGURO','SUSPEITO','INCONCLUSIVO')),
    CONSTRAINT ck_analise_risco CHECK (nivel_risco IN ('BAIXO','MEDIO','ALTO'))
);

CREATE TABLE CONSENTIMENTO (
    id_consentimento NUMBER(10) NOT NULL,
    id_usuario NUMBER(10) NOT NULL,
    finalidade VARCHAR2(100) NOT NULL,
    aceito CHAR(1) NOT NULL,
    versao_termo VARCHAR2(30) NOT NULL,
    data_hora TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_consentimento PRIMARY KEY (id_consentimento),
    CONSTRAINT ck_consent_aceito CHECK (aceito IN ('S','N'))
);

CREATE TABLE PROGRESSO (
    id_usuario NUMBER(10) NOT NULL,
    id_servico NUMBER(10) NOT NULL,
    nivel_autonomia VARCHAR2(20) NOT NULL,
    vezes_sem_ajuda NUMBER(10) DEFAULT 0 NOT NULL,
    atualizado_em TIMESTAMP DEFAULT LOCALTIMESTAMP NOT NULL,
    CONSTRAINT pk_progresso PRIMARY KEY (id_usuario, id_servico),
    CONSTRAINT ck_progresso_nivel CHECK (nivel_autonomia IN ('ASSISTIDO','ACOMPANHADO','AUTONOMO')),
    CONSTRAINT ck_progresso_qtd CHECK (vezes_sem_ajuda >= 0)
);

-- Relacionamentos R1–R10.
ALTER TABLE USUARIO ADD CONSTRAINT fk_usuario_ponto_atendimento FOREIGN KEY (id_ponto_atendimento) REFERENCES PONTO_ATENDIMENTO (id_ponto_atendimento);
ALTER TABLE FAMILIAR ADD CONSTRAINT fk_familiar_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario);
ALTER TABLE PEDIDO ADD CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario);
ALTER TABLE PEDIDO ADD CONSTRAINT fk_pedido_servico FOREIGN KEY (id_servico) REFERENCES SERVICO (id_servico);
ALTER TABLE DOCUMENTO ADD CONSTRAINT fk_documento_pedido FOREIGN KEY (id_pedido) REFERENCES PEDIDO (id_pedido);
ALTER TABLE CONFIRMACAO ADD CONSTRAINT fk_confirmacao_pedido FOREIGN KEY (id_pedido) REFERENCES PEDIDO (id_pedido);
ALTER TABLE ANALISE_GOLPE ADD CONSTRAINT fk_analise_golpe_pedido FOREIGN KEY (id_pedido) REFERENCES PEDIDO (id_pedido);
ALTER TABLE CONSENTIMENTO ADD CONSTRAINT fk_consentimento_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario);
ALTER TABLE PROGRESSO ADD CONSTRAINT fk_progresso_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario);
ALTER TABLE PROGRESSO ADD CONSTRAINT fk_progresso_servico FOREIGN KEY (id_servico) REFERENCES SERVICO (id_servico);

COMMENT ON TABLE PONTO_ATENDIMENTO IS 'Local físico de apoio à utilização da Lia.';

COMMENT ON TABLE USUARIO IS 'Perfil pseudonimizado da pessoa assistida.';

COMMENT ON TABLE FAMILIAR IS 'Contato familiar associado à pessoa, sem armazenar telefone.';

COMMENT ON TABLE SERVICO IS 'Tipo de demanda que a assistente pode orientar.';

COMMENT ON TABLE PEDIDO IS 'Solicitação feita pela pessoa à assistente.';

COMMENT ON TABLE DOCUMENTO IS 'Resumo textual de documento lido, sem armazenar fotografia.';

COMMENT ON TABLE CONFIRMACAO IS 'Registro de autorização antes de uma ação sensível.';

COMMENT ON TABLE ANALISE_GOLPE IS 'Avaliação de possíveis sinais de fraude em um pedido.';

COMMENT ON TABLE CONSENTIMENTO IS 'Registro da decisão da pessoa sobre uma finalidade de tratamento.';

COMMENT ON TABLE PROGRESSO IS 'Evolução da autonomia da pessoa em cada serviço utilizado.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.id_ponto_atendimento IS 'Identificador do ponto de atendimento.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.nome IS 'Nome do local.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.tipo IS 'Tipo de local, por exemplo, CRAS.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.cidade IS 'Município de atendimento.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.uf IS 'Sigla da unidade federativa.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.bairro IS 'Bairro onde fica o ponto.';
COMMENT ON COLUMN PONTO_ATENDIMENTO.ativo IS 'Indica se o ponto está ativo (S/N).';
COMMENT ON COLUMN USUARIO.id_usuario IS 'Identificador interno pseudonimizado.';
COMMENT ON COLUMN USUARIO.id_ponto_atendimento IS 'Ponto de atendimento de referência, quando houver.';
COMMENT ON COLUMN USUARIO.nome_preferido IS 'Nome de apresentação escolhido pela pessoa.';
COMMENT ON COLUMN USUARIO.ano_nascimento IS 'Ano de nascimento informado, quando disponível.';
COMMENT ON COLUMN USUARIO.velocidade_fala IS 'Preferência de velocidade da fala da Lia.';
COMMENT ON COLUMN USUARIO.data_cadastro IS 'Data e hora de cadastro do perfil.';
COMMENT ON COLUMN FAMILIAR.id_familiar IS 'Identificador do vínculo familiar.';
COMMENT ON COLUMN FAMILIAR.id_usuario IS 'Usuário ao qual o familiar está associado.';
COMMENT ON COLUMN FAMILIAR.apelido IS 'Nome de apresentação do contato.';
COMMENT ON COLUMN FAMILIAR.parentesco IS 'Relação de parentesco informada.';
COMMENT ON COLUMN FAMILIAR.ajuda_remota IS 'Permissão de auxílio remoto (S/N).';
COMMENT ON COLUMN SERVICO.id_servico IS 'Identificador do serviço.';
COMMENT ON COLUMN SERVICO.nome IS 'Nome do serviço disponibilizado.';
COMMENT ON COLUMN SERVICO.categoria IS 'Área de atuação do serviço.';
COMMENT ON COLUMN SERVICO.descricao IS 'Descrição resumida do serviço.';
COMMENT ON COLUMN SERVICO.nivel_risco IS 'Classificação de risco da operação.';
COMMENT ON COLUMN SERVICO.ativo IS 'Disponibilidade do serviço (S/N).';
COMMENT ON COLUMN PEDIDO.id_pedido IS 'Identificador da solicitação.';
COMMENT ON COLUMN PEDIDO.id_usuario IS 'Usuário responsável pelo pedido.';
COMMENT ON COLUMN PEDIDO.id_servico IS 'Serviço solicitado; vazio quando o pedido é ambíguo.';
COMMENT ON COLUMN PEDIDO.canal IS 'Canal de atendimento utilizado.';
COMMENT ON COLUMN PEDIDO.status IS 'Situação atual do pedido.';
COMMENT ON COLUMN PEDIDO.resumo_solicitacao IS 'Resumo da intenção, sem identificadores pessoais.';
COMMENT ON COLUMN PEDIDO.nivel_risco IS 'Nível de risco atribuído ao pedido.';
COMMENT ON COLUMN PEDIDO.data_hora IS 'Data e hora da solicitação.';
COMMENT ON COLUMN PEDIDO.finalizado_em IS 'Data e hora do encerramento, quando houver.';
COMMENT ON COLUMN DOCUMENTO.id_documento IS 'Identificador da leitura documental.';
COMMENT ON COLUMN DOCUMENTO.id_pedido IS 'Pedido ao qual a leitura pertence.';
COMMENT ON COLUMN DOCUMENTO.tipo_documento IS 'Categoria do documento lido.';
COMMENT ON COLUMN DOCUMENTO.resumo_leitura IS 'Resumo do conteúdo, sem fotografia.';
COMMENT ON COLUMN DOCUMENTO.data_hora IS 'Momento de realização da leitura.';
COMMENT ON COLUMN CONFIRMACAO.id_confirmacao IS 'Identificador da confirmação.';
COMMENT ON COLUMN CONFIRMACAO.id_pedido IS 'Pedido que exige autorização.';
COMMENT ON COLUMN CONFIRMACAO.tipo IS 'Modalidade de confirmação solicitada.';
COMMENT ON COLUMN CONFIRMACAO.status IS 'Resultado da confirmação.';
COMMENT ON COLUMN CONFIRMACAO.data_hora IS 'Momento do registro da confirmação.';
COMMENT ON COLUMN ANALISE_GOLPE.id_analise_golpe IS 'Identificador da análise.';
COMMENT ON COLUMN ANALISE_GOLPE.id_pedido IS 'Pedido avaliado.';
COMMENT ON COLUMN ANALISE_GOLPE.veredito IS 'Resultado da análise antifraude.';
COMMENT ON COLUMN ANALISE_GOLPE.nivel_risco IS 'Grau de risco avaliado.';
COMMENT ON COLUMN ANALISE_GOLPE.resumo_indicios IS 'Síntese dos sinais suspeitos, sem URL sensível integral.';
COMMENT ON COLUMN ANALISE_GOLPE.data_hora IS 'Data e hora da análise.';
COMMENT ON COLUMN CONSENTIMENTO.id_consentimento IS 'Identificador do registro de consentimento.';
COMMENT ON COLUMN CONSENTIMENTO.id_usuario IS 'Pessoa titular do consentimento.';
COMMENT ON COLUMN CONSENTIMENTO.finalidade IS 'Finalidade específica da autorização.';
COMMENT ON COLUMN CONSENTIMENTO.aceito IS 'Decisão de consentimento registrada (S/N).';
COMMENT ON COLUMN CONSENTIMENTO.versao_termo IS 'Versão do termo apresentada.';
COMMENT ON COLUMN CONSENTIMENTO.data_hora IS 'Data e hora do registro da decisão.';
COMMENT ON COLUMN PROGRESSO.id_usuario IS 'Usuário avaliado; integra a chave composta.';
COMMENT ON COLUMN PROGRESSO.id_servico IS 'Serviço praticado; integra a chave composta.';
COMMENT ON COLUMN PROGRESSO.nivel_autonomia IS 'Nível de autonomia observado no serviço.';
COMMENT ON COLUMN PROGRESSO.vezes_sem_ajuda IS 'Quantidade de execuções sem assistência.';
COMMENT ON COLUMN PROGRESSO.atualizado_em IS 'Momento da última atualização.';
