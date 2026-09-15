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
  'Email', 'Início experimental', 'Experiência', 'Mensagem', 'Contactado?'
];

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
 * Uma falha aqui não pode deitar abaixo a submissão: o registo na folha e o
 * aviso ao clube já foram feitos, por isso o erro fica só no log.
 */
function confirmar(p) {
  var destino = String(p.email || '').trim();
  if (!emailValido(destino)) {
    return;
  }

  var corpo =
    'A pré-inscrição de ' + (p.atleta || 'um novo atleta') + ' no Clube de Patinagem ' +
    'Artística da Charneca de Caparica ficou registada.\n\n' +
    'O clube responde por email ou telefone para marcar o treino experimental e ' +
    'indicar o grupo adequado. A participação no treino experimental não tem custo ' +
    'nem compromisso.\n\n' +
    'Dados recebidos\n' +
    'Atleta: ' + (p.atleta || '-') + '\n' +
    'Data de nascimento: ' + dataPt(p.nascimento) + '\n' +
    'Encarregado de educação: ' + (p.encarregado || '-') + '\n' +
    'Telemóvel: ' + (p.telefone || '-') + '\n' +
    'Treino preferido para começar: ' + rotulo(ROTULOS_INICIO, p.inicio) + '\n' +
    'Experiência anterior: ' + rotulo(ROTULOS_EXPERIENCIA, p.experiencia) + '\n' +
    (p.mensagem ? 'Mensagem: ' + p.mensagem + '\n' : '') +
    '\nSe algum destes dados estiver errado, basta responder a este email.\n\n' +
    'Clube de Patinagem Artística da Charneca de Caparica\n' +
    EMAIL_AVISO;

  try {
    MailApp.sendEmail({
      to: destino,
      name: REMETENTE,
      subject: 'Pré-inscrição recebida - ' + (p.atleta || 'novo atleta'),
      body: corpo,
      replyTo: EMAIL_AVISO
    });
  } catch (erro) {
    console.error('Falhou a confirmação para ' + destino + ': ' + erro);
  }
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
 */
function testar() {
  doPost({
    parameter: {
      atleta: 'Teste Silva',
      nascimento: '2019-04-12',
      encarregado: 'Teste Encarregado',
      telefone: '912345678',
      email: 'teste@exemplo.pt',
      inicio: 'quarta',
      experiencia: 'nunca',
      mensagem: 'Isto é um teste, podes apagar esta linha.'
    }
  });
}
