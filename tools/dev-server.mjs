// Servidor de desenvolvimento do site do CPACC.
//
// Só precisa do Node — nenhuma dependência, nenhum passo de build, nenhum Docker.
// O site é HTML/CSS/JS estático, por isso isto serve os ficheiros tal como estão
// e recarrega o browser sempre que algo muda em disco.
//
//   node tools/dev-server.mjs            → http://localhost:4173
//   node tools/dev-server.mjs --port 5000
//
// Alterações a CSS trocam a folha de estilos sem recarregar a página, para não
// perder a posição de scroll nem as animações de reveal a meio.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const PORT = Number(portArg !== -1 ? args[portArg + 1] : process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// Snippet injetado em cada página servida. Liga-se ao endpoint SSE abaixo.
const LIVE_RELOAD = `
<script>
(() => {
  const es = new EventSource("/__dev/stream");
  es.addEventListener("reload", () => location.reload());
  es.addEventListener("css", () => {
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) continue;
      url.searchParams.set("__dev", Date.now());
      link.href = url.pathname + url.search;
    }
    console.info("[dev] CSS atualizado");
  });
  es.onerror = () => { /* o servidor reiniciou; o browser volta a ligar sozinho */ };
})();
</script>
`;

/** Clientes SSE ligados neste momento. */
const clients = new Set();

function broadcast(event) {
  for (const res of clients) res.write(`event: ${event}\ndata: 1\n\n`);
}

/** Resolve um pedido HTTP num caminho dentro de ROOT, ou null se sair da pasta. */
function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = join(ROOT, clean);
  if (!full.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) && full !== ROOT.slice(0, -1)) {
    return null;
  }
  return full;
}

const server = createServer(async (req, res) => {
  if (req.url.startsWith("/__dev/stream")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": ligado\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let path = resolvePath(req.url);
  if (!path) {
    res.writeHead(403).end("403");
    return;
  }

  try {
    let info = await stat(path).catch(() => null);

    // /pagina → /pagina.html, e / → /index.html
    if (!info && extname(path) === "") {
      const asHtml = path.replace(/\/$/, "") + ".html";
      if (await stat(asHtml).catch(() => null)) {
        path = asHtml;
        info = await stat(path);
      }
    }
    if (info?.isDirectory()) {
      path = join(path, "index.html");
      info = await stat(path).catch(() => null);
    }

    if (!info) {
      // 404: devolve a home com um aviso, para links partidos serem óbvios.
      res.writeHead(404, { "Content-Type": MIME[".html"] });
      res.end(
        `<body style="font:16px system-ui;background:#0A1428;color:#fff;padding:3rem">
         <h1>404</h1><p><code>${req.url}</code> não existe.</p>
         <p><a style="color:#D4AF6A" href="/">Voltar ao início</a></p>${LIVE_RELOAD}</body>`,
      );
      return;
    }

    const ext = extname(path).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    let body = await readFile(path);

    if (ext === ".html") {
      const html = body.toString("utf8");
      body = html.includes("</body>")
        ? html.replace(/<\/body>/i, `${LIVE_RELOAD}</body>`)
        : html + LIVE_RELOAD;
    }

    res.writeHead(200, {
      "Content-Type": type,
      // Em desenvolvimento nunca queremos cache — o live reload trata do resto.
      "Cache-Control": "no-store",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500: " + err.message);
  }
});

// ---- Watcher -------------------------------------------------------------

const IGNORE = /(^|[/\\])(\.git|\.claude|node_modules|\.DS_Store)([/\\]|$)/;
let timer = null;
let sawOnlyCss = true;
let pending = "";
// O FSEvents do macOS entrega o mesmo evento mais do que uma vez, por vezes com
// segundos de intervalo. Guardamos o mtime já processado de cada ficheiro: se não
// mudou, o evento é repetido e ignora-se — sem descartar gravações verdadeiras.
const seen = new Map();

watch(ROOT, { recursive: true }, async (_event, filename) => {
  if (!filename || IGNORE.test(filename)) return;
  if (!extname(filename)) return; // ficheiros temporários dos editores

  const info = await stat(join(ROOT, filename)).catch(() => null);
  if (!info) return;
  if (seen.get(filename) === info.mtimeMs) return;
  seen.set(filename, info.mtimeMs);

  if (!filename.endsWith(".css")) sawOnlyCss = false;
  pending = filename;

  clearTimeout(timer);
  timer = setTimeout(() => {
    const event = sawOnlyCss ? "css" : "reload";
    broadcast(event);
    console.log(`  ${new Date().toLocaleTimeString("pt-PT")}  ${pending} → ${event}`);
    sawOnlyCss = true;
  }, 80);
});

server.listen(PORT, () => {
  console.log(`\n  Site do CPACC em desenvolvimento`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Live reload ativo. Ctrl+C para parar.\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  A porta ${PORT} já está ocupada. Tenta:  npm run dev -- --port ${PORT + 1}\n`);
    process.exit(1);
  }
  throw err;
});
