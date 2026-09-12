# CPACC — Site do Clube de Patinagem Artística da Charneca de Caparica

MVP em HTML, CSS e JavaScript puro. Sem build, sem dependências, sem npm.
Basta abrir `index.html` num browser ou fazer upload da pasta para qualquer alojamento.

---

## Estrutura

```
patinagem-charneca/
├── index.html            Home (vídeo hero, prova social, horários, FAQ, formulário)
├── clube.html            História, valores, equipa técnica, pavilhão
├── horarios.html         Grelha completa: Iniciação, Formação, Competição
├── pre-inscricao.html    Página dedicada com o formulário
├── faq.html              12 perguntas frequentes (com dados estruturados FAQPage)
├── contactos.html        Morada, telefone, email, mapa
├── privacidade.html      Política de privacidade / RGPD
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css     Design system completo
    ├── js/main.js        Animações, menu, acordeão, formulário
    ├── img/              Fotos, favicon, imagem de partilha
    └── video/            Vídeo do hero
```

---

## O que falta preencher

Procura por `PREENCHER`, `SUBSTITUIR` e pelos blocos com a classe `todo-note`
(aparecem no site com uma barra dourada à esquerda — devem desaparecer antes de publicar).

| Onde | O quê |
|---|---|
| Todas as páginas | Morada do pavilhão, telefone, email, links de Instagram e Facebook |
| `index.html` | Números reais (anos, atletas, treinadores) na barra de estatísticas |
| `index.html` `clube.html` | Nomes, fotos e credenciais dos treinadores |
| `horarios.html` | Grelha de horários real |
| `clube.html` | Ano de fundação, história, conquistas |
| `contactos.html` | Embed do Google Maps com a morada exata |
| `index.html` (JSON-LD) | Morada, telefone e redes no bloco de dados estruturados |

### Logótipo

Coloca o ficheiro em `assets/img/logo.svg` e substitui, no cabeçalho e no rodapé de
cada página, o bloco:

```html
<span class="brand__mark" aria-hidden="true">CP</span>
```

por:

```html
<img src="assets/img/logo.svg" alt="" width="38" height="38">
```

Se as cores oficiais do clube forem diferentes das que usei, altera apenas as variáveis
no topo de `assets/css/style.css` (`--c-ink-800`, `--c-gold-500`, etc.) — todo o site
acompanha automaticamente.

---

## Vídeo do hero

Quando o vídeo estiver pronto, em `index.html` procura o comentário
`VÍDEO DO PAVILHÃO`, descomenta o bloco `<video>` e apaga a linha do
`<div class="hero__placeholder">`.

**Especificações do ficheiro:**

- Duração: 12 a 20 segundos, em loop imperceptível (primeiro e último fotograma parecidos)
- Resolução: 1920×1080 (o browser recorta para o formato do ecrã)
- Sem som (o autoplay só funciona em silêncio)
- MP4 (H.264) **e** WebM, ambos abaixo de 4 MB
- Poster em `assets/img/hero-poster.jpg` — é o que aparece antes de o vídeo carregar

Comprimir com ffmpeg:

```bash
ffmpeg -i original.mp4 -an -vf "scale=1920:-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart assets/video/treino.mp4
```

```bash
ffmpeg -i original.mp4 -an -vf "scale=1920:-2" -c:v libvpx-vp9 -crf 36 -b:v 0 assets/video/treino.webm
```

Poster:

```bash
ffmpeg -i assets/video/treino.mp4 -ss 00:00:02 -vframes 1 -q:v 3 assets/img/hero-poster.jpg
```

---

## Formulário de pré-inscrição

Está construído e validado, mas ainda **não envia para lado nenhum**. Em modo protótipo
mostra o ecrã de sucesso e escreve os dados na consola do browser.

Para ligar a um serviço real, substitui `SUBSTITUIR_PELO_ENDPOINT` pelo URL do serviço,
em `index.html` e `pre-inscricao.html`:

```html
<form class="form" data-form data-endpoint="https://formspree.io/f/xxxxxxx" novalidate>
```

Opções recomendadas (todas com plano gratuito suficiente para um clube):

- **Formspree** — recebe as respostas por email. O mais simples.
- **Netlify Forms** — grátis se alojares na Netlify; acrescenta `netlify` ao `<form>`.
- **Google Apps Script** — envia para uma Google Sheet. Grátis e sem limites, mas exige configuração.

O formulário já tem proteção anti-spam (campo-armadilha invisível), validação em português
e consentimento RGPD obrigatório.

---

## Publicar

Qualquer um destes serve, e todos são gratuitos para este volume:

1. **Netlify** — arrasta a pasta para app.netlify.com/drop. Pronto em segundos.
2. **Cloudflare Pages** — liga um repositório Git, deploy automático.
3. **Vercel** — igual.

Depois liga o domínio `patinagemcharneca.pt` nas definições de DNS do serviço escolhido.

### A fazer depois de publicar

- [ ] Google Search Console — submeter `sitemap.xml`
- [ ] Google Business Profile do clube, com link para o site (decisivo para "patinagem perto de mim")
- [ ] Testar os dados estruturados em search.google.com/test/rich-results
- [ ] Testar em telemóvel real — é por lá que a maioria dos pais vai entrar

---

## Acessibilidade e performance

Já incluído: navegação por teclado, `skip link`, contraste conforme WCAG AA,
etiquetas ARIA no menu e no acordeão, e respeito total por `prefers-reduced-motion`
(quem tem animações desativadas no sistema vê o site estático).

O único risco de performance é o vídeo. Mantém-no abaixo de 4 MB.
