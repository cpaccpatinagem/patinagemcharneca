/**
 * CPACC - recetor das pré-inscrições do site
 *
 * Guarda cada pré-inscrição numa folha de cálculo, avisa o clube por email e
 * confirma a receção ao encarregado de educação.
 * Instruções de instalação no README.md, secção "Formulário de pré-inscrição".
 *
 * Depois de alterar este ficheiro é preciso republicar:
 *   Implementar → Gerir implementações → editar (lápis) → Nova versão → Implementar
 */

// Para onde vai o aviso de cada nova pré-inscrição.
var EMAIL_AVISO = 'cpaccpatinagem@gmail.com';

// Nome que aparece como remetente nos emails enviados.
var REMETENTE = 'CPACC';

var COLUNAS = [
  'Data', 'Atleta', 'Nascimento', 'Encarregado', 'Telemóvel',
  'Email', 'Início experimental', 'Experiência', 'Mensagem', 'Contactado?',
  'Experimental feito?', 'Inscrito?'
];

/**
 * Prepara a folha para medir o funil: pré-inscrições -> treinos experimentais
 * feitos -> inscrições efetivas. Correr UMA vez, a partir do editor.
 *
 * - Acrescenta as colunas "Experimental feito?" e "Inscrito?" à folha das
 *   pré-inscrições, com uma lista Sim/Não, se ainda não existirem.
 * - Cria a folha "Funil" com as contagens por mês, calculadas sozinhas.
 *
 * Depois é só, em cada linha, marcar Sim quando a criança fez o treino
 * experimental e Sim quando se inscreveu. O resto conta-se sozinho.
 */
function configurarFunil() {
  var livro = SpreadsheetApp.getActiveSpreadsheet();
  var folha = obterFolha();

  // Colunas K e L, se faltarem.
  var cabecalho = folha.getRange(1, 1, 1, Math.max(folha.getLastColumn(), 1)).getValues()[0];
  ['Experimental feito?', 'Inscrito?'].forEach(function (nome) {
    if (cabecalho.indexOf(nome) === -1) {
      var col = folha.getLastColumn() + 1;
      folha.getRange(1, col).setValue(nome).setFontWeight('bold');
      cabecalho.push(nome);
    }
  });
  var colExp = cabecalho.indexOf('Experimental feito?') + 1;
  var colIns = cabecalho.indexOf('Inscrito?') + 1;
  var regra = SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build();
  folha.getRange(2, colExp, 1000, 1).setDataValidation(regra);
  folha.getRange(2, colIns, 1000, 1).setDataValidation(regra);

  // Folha "Funil": uma linha por mês, da época 2026/27.
  var funil = livro.getSheetByName('Funil') || livro.insertSheet('Funil');
  funil.clear();
  funil.appendRow(['Mês', 'Pré-inscrições', 'Experimentais feitos', 'Inscritos',
                   '% que experimentou', '% que se inscreveu']);
  funil.getRange(1, 1, 1, 6).setFontWeight('bold');
  funil.setFrozenRows(1);

  var letraExp = colunaParaLetra(colExp);
  var letraIns = colunaParaLetra(colIns);
  var origem = "'" + folha.getName() + "'";
  for (var i = 0; i < 12; i++) {
    var linha = i + 2;
    var mes = new Date(2026, 8 + i, 1);           // setembro de 2026 em diante
    var A = 'A' + linha;
    var noMes = origem + '!$A:$A,">="&' + A + ',' + origem + '!$A:$A,"<"&EDATE(' + A + ',1)';
    funil.getRange(linha, 1).setValue(mes).setNumberFormat('mmm yyyy');
    funil.getRange(linha, 2).setFormula('=COUNTIFS(' + noMes + ')');
    funil.getRange(linha, 3).setFormula('=COUNTIFS(' + noMes + ',' + origem + '!$' + letraExp + ':$' + letraExp + ',"Sim")');
    funil.getRange(linha, 4).setFormula('=COUNTIFS(' + noMes + ',' + origem + '!$' + letraIns + ':$' + letraIns + ',"Sim")');
    funil.getRange(linha, 5).setFormula('=IF(B' + linha + '=0,"",C' + linha + '/B' + linha + ')').setNumberFormat('0%');
    funil.getRange(linha, 6).setFormula('=IF(B' + linha + '=0,"",D' + linha + '/B' + linha + ')').setNumberFormat('0%');
  }
  funil.appendRow(['Época', '=SUM(B2:B13)', '=SUM(C2:C13)', '=SUM(D2:D13)',
                   '=IF(B14=0,"",C14/B14)', '=IF(B14=0,"",D14/B14)']);
  funil.getRange(14, 1, 1, 6).setFontWeight('bold');
  funil.getRange(14, 5, 1, 2).setNumberFormat('0%');
  funil.autoResizeColumns(1, 6);
}

function colunaParaLetra(n) {
  var s = '';
  while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// Rótulos legíveis para os valores que o formulário envia.
var ROTULOS_INICIO = {
  segunda: 'Segunda, 19:00',
  quarta: 'Quarta, 18:00',
  sexta: 'Sexta, 19:45',
  indiferente: 'Indiferente'
};

var ROTULOS_EXPERIENCIA = {
  nunca: 'Nunca patinou',
  lazer: 'Só por lazer',
  clube: 'Já esteve num clube'
};

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Armadilha anti-spam: o campo "website" está escondido no site, por isso
    // só um robô o preenche. Respondemos ok para o robô não tentar outra vez.
    if (p.website) {
      return json({ ok: true, ignorado: 'spam' });
    }

    var folha = obterFolha();
    folha.appendRow([
      new Date(),
      p.atleta || '',
      p.nascimento || '',
      p.encarregado || '',
      p.telefone || '',
      p.email || '',
      p.inicio || '',
      p.experiencia || '',
      p.mensagem || '',
      ''
    ]);

    avisar(p);
    confirmar(p);
    return json({ ok: true });

  } catch (erro) {
    // Regista o erro no log do Apps Script para depois se perceber o que falhou.
    console.error(erro);
    return json({ ok: false, erro: String(erro) });
  }
}

function obterFolha() {
  var livro = SpreadsheetApp.getActiveSpreadsheet();
  var folha = livro.getSheetByName('Pré-inscrições');

  if (!folha) {
    folha = livro.insertSheet('Pré-inscrições');
  }
  if (folha.getLastRow() === 0) {
    folha.appendRow(COLUNAS);
    folha.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
    folha.setFrozenRows(1);
    folha.setColumnWidth(1, 140);
    folha.setColumnWidth(9, 280);
  }
  return folha;
}

function avisar(p) {
  var corpo =
    'Nova pré-inscrição pelo site.\n\n' +
    'Atleta: ' + (p.atleta || '-') + '\n' +
    'Data de nascimento: ' + dataPt(p.nascimento) + '\n' +
    'Encarregado de educação: ' + (p.encarregado || '-') + '\n' +
    'Telemóvel: ' + (p.telefone || '-') + '\n' +
    'Email: ' + (p.email || '-') + '\n' +
    'Prefere começar: ' + rotulo(ROTULOS_INICIO, p.inicio) + '\n' +
    'Experiência anterior: ' + rotulo(ROTULOS_EXPERIENCIA, p.experiencia) + '\n' +
    'Mensagem: ' + (p.mensagem || '-') + '\n\n' +
    'Todas as inscrições: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();

  MailApp.sendEmail({
    to: EMAIL_AVISO,
    name: REMETENTE,
    subject: 'Pré-inscrição - ' + (p.atleta || 'novo atleta'),
    body: corpo,
    replyTo: p.email || EMAIL_AVISO
  });
}

/**
 * Confirma ao encarregado de educação que a pré-inscrição chegou.
 *
 * Envia em HTML (template no ficheiro "email-confirmacao") com o símbolo do
 * clube inline, e em texto simples para quem tenha o HTML desligado.
 *
 * Uma falha aqui não pode deitar abaixo a submissão: o registo na folha e o
 * aviso ao clube já foram feitos, por isso o erro fica só no log.
 */
function confirmar(p) {
  var destino = String(p.email || '').trim();
  if (!emailValido(destino)) {
    return;
  }

  var dados = {
    atleta: p.atleta || '-',
    nascimento: dataPt(p.nascimento),
    encarregado: p.encarregado || '-',
    telefone: p.telefone || '-',
    email: destino,
    inicio: rotulo(ROTULOS_INICIO, p.inicio),
    experiencia: rotulo(ROTULOS_EXPERIENCIA, p.experiencia),
    mensagem: p.mensagem || '',
    ano: String(new Date().getFullYear())
  };

  try {
    MailApp.sendEmail({
      to: destino,
      name: REMETENTE,
      subject: 'Pré-inscrição recebida - ' + dados.atleta,
      body: corpoTexto(dados),
      htmlBody: montarHtml(dados),
      replyTo: EMAIL_AVISO,
      inlineImages: { logotipo: logotipoBlob() }
    });
  } catch (erro) {
    console.error('Falhou a confirmação para ' + destino + ': ' + erro);
  }
}

/** Lê o template, resolve os blocos opcionais e substitui os campos {{...}}. */
function montarHtml(dados) {
  var html = HtmlService.createHtmlOutputFromFile('email-confirmacao').getContent();

  // Blocos <!-- se:campo --> ... <!-- /se:campo --> saem quando o campo vem vazio.
  html = html.replace(/<!--\s*se:(\w+)\s*-->([\s\S]*?)<!--\s*\/se:\1\s*-->/g,
    function (tudo, campo, dentro) {
      return dados[campo] ? dentro : '';
    });

  return html.replace(/\{\{(\w+)\}\}/g, function (tudo, campo) {
    return escaparHtml(dados[campo] === undefined ? '' : String(dados[campo]));
  });
}

/** Versão em texto simples, para quem não recebe HTML. */
function corpoTexto(d) {
  return 'A pré-inscrição de ' + d.atleta + ' no Clube de Patinagem Artística da ' +
    'Charneca de Caparica ficou registada.\n\n' +
    'O clube entra em contacto nos próximos dias úteis, por email ou telefone, para ' +
    'combinar o início dos 3 treinos experimentais gratuitos: uma semana completa no ' +
    'grupo de Iniciação. Nesses treinos o clube empresta patins e proteções, por isso ' +
    'não é preciso comprar material. Basta roupa confortável.\n\n' +
    'Dados recebidos\n' +
    'Atleta: ' + d.atleta + '\n' +
    'Data de nascimento: ' + d.nascimento + '\n' +
    'Encarregado de educação: ' + d.encarregado + '\n' +
    'Telemóvel: ' + d.telefone + '\n' +
    'Email: ' + d.email + '\n' +
    'Treino preferido para começar: ' + d.inicio + '\n' +
    'Experiência anterior: ' + d.experiencia + '\n' +
    (d.mensagem ? 'Mensagem: ' + d.mensagem + '\n' : '') +
    '\nSe algum destes dados estiver errado, basta responder a este email.\n\n' +
    'Horários de treino: https://www.patinagemcharneca.pt/horarios.html\n\n' +
    'Clube de Patinagem Artística da Charneca de Caparica\n' +
    'Pavilhão Municipal da Charneca de Caparica, Praceta Ruy Coelho\n' +
    '2820-327 Charneca de Caparica, Almada\n' +
    '926 716 672 | ' + EMAIL_AVISO;
}

/** O símbolo do clube, descodificado do base64 em email-logo.gs. */
function logotipoBlob() {
  return Utilities.newBlob(Utilities.base64Decode(LOGO_PNG_BASE64), 'image/png', 'cpacc.png');
}

function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function emailValido(valor) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(valor);
}

function rotulo(mapa, valor) {
  return mapa[valor] || valor || '-';
}

/** 2019-04-12 fica 12/04/2019. Qualquer outro formato passa como veio. */
function dataPt(valor) {
  var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ''));
  if (!iso) {
    return valor || '-';
  }
  return iso[3] + '/' + iso[2] + '/' + iso[1];
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Serve para testar sem usar o site: no editor do Apps Script,
 * escolhe esta função e carrega em "Executar".
 *
 * Põe um email verdadeiro em SUBSTITUIR_PELO_EMAIL_DE_TESTE antes de executar,
 * senão a confirmação sai para um endereço que não existe e parece que nada
 * aconteceu. Repõe o texto depois do teste, para não ficar aqui um email
 * pessoal.
 */
function testar() {
  doPost({
    parameter: {
      atleta: 'Teste Silva',
      nascimento: '2019-04-12',
      encarregado: 'Teste Encarregado',
      telefone: '912345678',
      email: 'SUBSTITUIR_PELO_EMAIL_DE_TESTE',
      inicio: 'quarta',
      experiencia: 'nunca',
      mensagem: 'Isto é um teste, podes apagar esta linha.'
    }
  });
}
