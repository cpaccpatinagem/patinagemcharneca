/**
 * CPACC — recetor das pré-inscrições do site
 *
 * Guarda cada pré-inscrição numa folha de cálculo e avisa o clube por email.
 * Instruções de instalação no README.md, secção "Formulário de pré-inscrição".
 *
 * Depois de alterar este ficheiro é preciso republicar:
 *   Implementar → Gerir implementações → editar (lápis) → Nova versão → Implementar
 */

// Para onde vai o aviso de cada nova pré-inscrição.
var EMAIL_AVISO = 'cpaccpatinagem@gmail.com';

var COLUNAS = [
  'Data', 'Atleta', 'Nascimento', 'Encarregado', 'Telemóvel',
  'Email', 'Início experimental', 'Experiência', 'Mensagem', 'Contactado?'
];

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
    'Atleta: ' + (p.atleta || '—') + '\n' +
    'Data de nascimento: ' + (p.nascimento || '—') + '\n' +
    'Encarregado de educação: ' + (p.encarregado || '—') + '\n' +
    'Telemóvel: ' + (p.telefone || '—') + '\n' +
    'Email: ' + (p.email || '—') + '\n' +
    'Prefere começar: ' + (p.inicio || '—') + '\n' +
    'Experiência anterior: ' + (p.experiencia || '—') + '\n' +
    'Mensagem: ' + (p.mensagem || '—') + '\n\n' +
    'Todas as inscrições: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();

  MailApp.sendEmail({
    to: EMAIL_AVISO,
    subject: 'Pré-inscrição — ' + (p.atleta || 'novo atleta'),
    body: corpo,
    replyTo: p.email || EMAIL_AVISO
  });
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
      mensagem: 'Isto é um teste — podes apagar esta linha.'
    }
  });
}
