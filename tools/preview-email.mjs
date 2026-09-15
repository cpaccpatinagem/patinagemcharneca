/**
 * CPACC - pré-visualização do email de confirmação da pré-inscrição.
 *
 *   node tools/preview-email.mjs
 *
 * Corre o código real do Apps Script (google-apps-script.gs) num sandbox com
 * as APIs da Google substituídas por imitações, e escreve o resultado em
 * .local/email-preview.html para abrir no browser. Assim o que se vê é
 * exatamente o HTML que sai no email, sem ter de republicar a cada tentativa.
 *
 * O cid:logotipo (que só o cliente de email sabe resolver) é trocado por um
 * data: URI com o mesmo PNG, para a imagem aparecer no browser.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

var raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var ler = (caminho) => readFileSync(resolve(raiz, caminho), 'utf8');

// Dados de exemplo. Mudar aqui para testar nomes longos, campos vazios, acentos.
var EXEMPLO = {
  atleta: 'Matilde Ferreira Nunes',
  nascimento: '2019-04-12',
  encarregado: 'Ana Ferreira',
  telefone: '926 716 672',
  email: 'ana.ferreira@exemplo.pt',
  inicio: 'quarta',
  experiencia: 'lazer',
  mensagem: 'A Matilde já andou de patins em linha na escola. Prefere treinos ao fim do dia.'
};

// Imitações mínimas das APIs do Apps Script usadas pelo código do email.
var sandbox = {
  console,
  HtmlService: {
    createHtmlOutputFromFile: (nome) => ({ getContent: () => ler('tools/' + nome + '.html') })
  },
  Utilities: {
    base64Decode: (b64) => Buffer.from(b64, 'base64'),
    newBlob: (bytes, tipo) => ({ bytes, tipo })
  },
  MailApp: { sendEmail: () => {} },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getUrl: () => 'https://exemplo/folha' }) }
};

var contexto = vm.createContext(sandbox);
vm.runInContext(ler('tools/email-logo.gs'), contexto);
vm.runInContext(ler('tools/google-apps-script.gs'), contexto);

var dados = vm.runInContext('(' + montarDados.toString() + ')', contexto)(EXEMPLO);
var html = sandbox.montarHtml(dados);
var texto = sandbox.corpoTexto(dados);

// cid: não existe no browser, por isso entra o mesmo PNG como data: URI.
var b64 = sandbox.LOGO_PNG_BASE64;
html = html.replace('src="cid:logotipo"', 'src="data:image/png;base64,' + b64 + '"');

mkdirSync(resolve(raiz, '.local'), { recursive: true });
writeFileSync(resolve(raiz, '.local/email-preview.html'), html);
writeFileSync(resolve(raiz, '.local/email-preview.txt'), texto);

console.log('HTML  -> .local/email-preview.html');
console.log('Texto -> .local/email-preview.txt');

/** Repete o preenchimento que o confirmar() faz, sem enviar nada. */
function montarDados(p) {
  return {
    atleta: p.atleta || '-',
    nascimento: dataPt(p.nascimento),
    encarregado: p.encarregado || '-',
    telefone: p.telefone || '-',
    email: p.email || '-',
    inicio: rotulo(ROTULOS_INICIO, p.inicio),
    experiencia: rotulo(ROTULOS_EXPERIENCIA, p.experiencia),
    mensagem: p.mensagem || '',
    ano: String(new Date().getFullYear())
  };
}
