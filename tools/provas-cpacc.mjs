#!/usr/bin/env node
/**
 * provas-cpacc.mjs - o que aconteceu ao CPACC nas provas da AP Setúbal.
 *
 * A Federação publica os resultados em pa.fpp.pt, prova a prova, com o clube
 * de cada atleta em sigla. A nossa é CPACC. As provas da AP Setúbal têm
 * "APSet" no título, e nessas o clube está quase sempre presente.
 *
 * Este script faz só a parte mecânica: descobre as provas, lê as
 * classificações e devolve as linhas do CPACC. Não escreve texto e não
 * interpreta nada - é o texto que se escreve depois, a partir disto.
 *
 *   node tools/provas-cpacc.mjs                # últimos 14 dias
 *   node tools/provas-cpacc.mjs --dias 60      # janela maior
 *   node tools/provas-cpacc.mjs --agenda       # provas dos próximos 7 dias
 *   node tools/provas-cpacc.mjs --json         # saída para outro programa
 *
 * Sem dependências: usa o fetch do Node (18+), como o resto do projeto.
 */

const BASE = 'https://pa.fpp.pt';
const ASSOCIACAO_SETUBAL = 14;
const SIGLA = 'CPACC';

/* ------------------------------------------------------------------ rede */

async function buscar(caminho) {
  const url = caminho.startsWith('http') ? caminho : BASE + caminho;
  const resposta = await fetch(url, {
    headers: { 'User-Agent': 'CPACC/provas-cpacc.mjs (site do clube)' },
  });
  if (!resposta.ok) throw new Error(`${resposta.status} em ${url}`);
  return resposta.text();
}

/* ----------------------------------------------------------------- texto */

const semTags = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&#39;/g, "'")
    .replace(/&ordm;/g, 'º')
    .replace(/\s+/g, ' ')
    .trim();

/* --------------------------------------------------------------- parsing */

/**
 * Um cartão de prova, tanto na lista de uma associação como na agenda:
 *
 *   <p><b>Solo Dance - Silver Cup 2026</b></p>
 *   <p ...><small><i class="fa-...-location-dot"></i> Charneca de Caparica</small></p>
 *   <p ...><small><i class="fa-...-calendar"></i> 2026-09-26 - 2026-09-27</small></p>
 *
 * O nome está em <b> e os outros dois campos vêm identificados pelo ícone,
 * não pela ordem. É por aí que se lê, e não por posição no texto: colapsar o
 * HTML em texto corrido junta o nome ao local e não há como os separar.
 */
function lerCartao(id, html) {
  const datas = (html.match(/fa-[\w-]*calendar[\s\S]{0,200}?(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/) || []);
  if (!datas[1]) return null;
  return {
    id,
    nome: semTags((html.match(/<b>([\s\S]*?)<\/b>/) || [])[1] || ''),
    local: semTags((html.match(/fa-[\w-]*location-dot[^>]*><\/i>([\s\S]*?)<\/small>/) || [])[1] || ''),
    inicio: datas[1],
    fim: datas[2],
    url: `${BASE}/Rollart/${id}`,
  };
}

// A lista de provas de uma associação vem de um endpoint próprio, porque a
// página carrega-a por AJAX.
function lerProvas(html) {
  const blocos = html.split(/href="\/Rollart\/(\d+)"/).slice(1);
  const provas = [];
  for (let i = 0; i < blocos.length; i += 2) {
    const cartao = lerCartao(blocos[i], blocos[i + 1] || '');
    if (cartao) provas.push(cartao);
  }
  return provas;
}

// Página de uma prova: título com "APSet | ...", local, datas e os links de
// cada escalão (/Rollart/<prova>/<escalao>/<F|M>).
function lerProva(html, id) {
  const titulo = semTags((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  const nome = titulo.replace(/^FPP PA \|\s*/, '');
  // Cada escalão tem /F ou /M, que é a classificação FINAL, e pode ter
  // /F/2P, que é só o segmento do segundo programa (a Dança Livre, por
  // exemplo). O <title> da plataforma diz "1º Programa" nas duas, e engana:
  // quem manda é o <h2> dentro da página. Lemos sempre a final.
  const escaloes = [
    ...new Set(
      [...html.matchAll(new RegExp(`href="/Rollart/${id}/(\\d+)/([FM])"`, 'g'))].map(
        (m) => `${m[1]}/${m[2]}`,
      ),
    ),
  ];
  // Sem local nem datas: essas vêm do cartão da lista, já lidas por ícone.
  return { id, nome, apSetubal: /APSet/.test(titulo) || /APSet/.test(html), escaloes };
}

// Classificação de um escalão. As linhas vêm por ordem de pontuação, e a
// coluna da posição vem vazia enquanto a prova não é homologada: por isso a
// posição é a ordem da linha, e é isso que se diz.
function lerClassificacao(html) {
  // O <h2> da grelha é o rótulo fiável: "Infantil F | Final".
  const titulo = semTags((html.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '');
  const linhas = [];
  const re = /<div class="player-row">([\s\S]*?)<\/div>\s*(?=<div|<\/div>)/g;
  for (const m of html.matchAll(re)) {
    const bloco = m[1];
    const nome = semTags((bloco.match(/<span class="nome">([\s\S]*?)<\/span>/) || [])[1] || '');
    const clube = semTags((bloco.match(/<span class="equipa">([\s\S]*?)<\/span>/) || [])[1] || '');
    const numeros = [...bloco.matchAll(/<span>\s*([\d.,]+)\s*<\/span>/g)].map((n) => n[1]);
    if (!nome) continue;
    linhas.push({
      posicao: linhas.length + 1,
      atleta: nome,
      clube,
      total: numeros[0] || '',
    });
  }
  return { titulo, linhas };
}

/* ----------------------------------------------------------------- lógica */

async function provasDaJanela(dias) {
  const limite = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);
  const encontradas = [];
  // A lista está ordenada da mais recente para a mais antiga; duas páginas
  // cobrem largamente qualquer janela razoável.
  for (const pagina of [1, 2]) {
    const html = await buscar(
      `/Views/_getRollartAssociacao.php?associacaoID=${ASSOCIACAO_SETUBAL}&pagina=${pagina}`,
    );
    const provas = lerProvas(html);
    if (!provas.length) break;
    for (const p of provas) {
      if (p.fim >= limite && p.inicio <= hoje) encontradas.push(p);
    }
    if (provas.some((p) => p.fim < limite)) break;
  }
  return encontradas;
}

async function resultadosDoClube(prova) {
  const detalhe = lerProva(await buscar(`/Rollart/${prova.id}`), prova.id);
  const escaloes = [];
  for (const chave of detalhe.escaloes) {
    const { titulo, linhas } = lerClassificacao(await buscar(`/Rollart/${prova.id}/${chave}`));
    const nossos = linhas.filter((l) => l.clube.toUpperCase() === SIGLA);
    if (nossos.length) {
      escaloes.push({ titulo, participantes: linhas.length, nossos });
    }
  }
  return { ...prova, ...detalhe, escaloes };
}

// A agenda dos próximos 7 dias é nacional e usa o mesmo cartão. Não diz a
// associação, por isso quem quiser saber se é da AP Setúbal tem de abrir a
// prova e procurar "APSet" - é o que faz --agenda com --verificar.
async function agenda({ verificar = false } = {}) {
  const html = await buscar('/Agenda');
  const provas = lerProvas(html);
  if (!verificar) return provas;
  for (const p of provas) {
    p.apSetubal = lerProva(await buscar(`/Rollart/${p.id}`), p.id).apSetubal;
  }
  return provas;
}

/* ------------------------------------------------------------------ saída */

function imprimir(provas) {
  if (!provas.length) {
    console.log('Nenhuma prova da AP Setúbal na janela pedida.');
    return;
  }
  for (const p of provas) {
    const datas = p.inicio === p.fim ? p.inicio : `${p.inicio} a ${p.fim}`;
    console.log(`\n## ${p.nome}`);
    console.log(`${p.local || 'local não indicado'} · ${datas}`);
    console.log(p.url);
    if (!p.escaloes.length) {
      console.log('\nSem atletas do CPACC nas classificações publicadas.');
      continue;
    }
    for (const e of p.escaloes) {
      console.log(`\n### ${e.titulo}  (${e.participantes} atletas em prova)`);
      for (const l of e.nossos) {
        console.log(`  ${l.posicao}º de ${e.participantes} · ${l.atleta} · ${l.total}`);
      }
    }
  }
  console.log(
    '\n---\nA posição é a ordem da classificação publicada. Enquanto a prova não\n' +
      'estiver homologada a coluna do lugar vem vazia na Federação: confirmar o\n' +
      'pódio antes de o afirmar no site.',
  );
}

/* ------------------------------------------------------------------- main */

const args = process.argv.slice(2);
const opcao = (nome, valorPorDefeito) => {
  const i = args.indexOf(`--${nome}`);
  return i === -1 ? valorPorDefeito : args[i + 1];
};

try {
  if (args.includes('--agenda')) {
    const verificar = args.includes('--verificar');
    const proximas = await agenda({ verificar });
    if (args.includes('--json')) {
      console.log(JSON.stringify(proximas, null, 2));
    } else if (!proximas.length) {
      console.log('Agenda dos próximos 7 dias vazia.');
    } else {
      console.log('Provas dos próximos 7 dias (todas as associações):\n');
      for (const p of proximas) {
        const marca = verificar ? (p.apSetubal ? 'APSet ' : '      ') : '';
        console.log(`  ${marca}${p.inicio} a ${p.fim} · ${p.nome} · ${p.local}`);
      }
      if (!verificar) {
        console.log('\nA agenda não diz a associação. Com --verificar abre cada prova');
        console.log('e marca as que são da AP Setúbal, onde o clube costuma estar.');
      }
    }
  } else {
    const dias = Number(opcao('dias', 14));
    const provas = [];
    for (const p of await provasDaJanela(dias)) {
      provas.push(await resultadosDoClube(p));
    }
    if (args.includes('--json')) console.log(JSON.stringify(provas, null, 2));
    else imprimir(provas);
  }
} catch (erro) {
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
}
