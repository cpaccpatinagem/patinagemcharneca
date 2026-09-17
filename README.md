# CPACC — Site do Clube de Patinagem Artística da Charneca de Caparica

MVP em HTML, CSS e JavaScript puro. Sem build e sem dependências: o que está no
repositório é exatamente o que vai para o servidor.

---

## Desenvolver localmente

Só precisas do Node (18 ou superior). Não há `npm install` — não existem dependências.

```
npm run dev
```

Abre <http://localhost:4173>. O servidor está em `tools/dev-server.mjs` e serve os
ficheiros tal como estão, com **live reload**:

- editar CSS troca a folha de estilos sem recarregar a página, para não perderes a
  posição de scroll nem as animações de reveal a meio;
- editar HTML ou JS recarrega a página.

Para usar outra porta: `npm run dev -- --port 5000`.

Notas:

- URLs sem extensão funcionam (`/horarios` serve `horarios.html`), como na Vercel
  (`cleanUrls` no `vercel.json`). Os links internos usam sempre a forma sem
  extensão e com barra inicial (`href="/horarios"`).
- Um endereço inexistente serve a `404.html`, a mesma página que a Vercel usa.
- Em desenvolvimento não há cache (`Cache-Control: no-store`).
- Um 404 mostra uma página de aviso em vez de falhar em silêncio, para links
  partidos entre páginas darem nas vistas.

Abrir os ficheiros com duplo clique (`file://`) também funciona, mas os caminhos
absolutos e o `fetch` comportam-se de forma diferente — usa `npm run dev`.

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
├── package.json          Só para o `npm run dev` - sem dependências
├── tools/
│   ├── dev-server.mjs         Servidor local com live reload
│   ├── google-apps-script.gs  Recetor das pré-inscrições
│   ├── email-confirmacao.html Template do email ao encarregado de educação
│   ├── email-logo.gs          Símbolo do clube embutido nesse email
│   ├── preview-email.mjs      Pré-visualiza o email sem republicar
│   ├── resposta-pre-inscricao.md  Modelo da resposta do clube
│   └── preparar-fotos.py      Prepara as fotos da equipa
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

O símbolo está em `assets/img/mark-gold.svg` (cabeçalho e rodapé de todas as
páginas); as versões completas em `logo-gold.svg` e `logo-navy.svg`; os ícones
em `favicon.svg`, `favicon-96.png`, `apple-touch-icon.png` e `icon-512.png`, que é
também o `logo` dos dados estruturados.

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

As pré-inscrições são guardadas numa folha de cálculo do Google. A cada nova
inscrição o clube recebe um email de aviso e o encarregado de educação recebe um
email de confirmação com os dados que enviou. O código do recetor está em
`tools/google-apps-script.gs`.

### Instalação (uma vez)

1. Cria uma folha de cálculo nova em [sheets.new](https://sheets.new) e dá-lhe um
   nome, por exemplo "CPACC — Pré-inscrições".
2. Nessa folha: **Extensões → Apps Script**.
3. Apaga o que lá estiver e cola todo o conteúdo de `tools/google-apps-script.gs`.
4. Cria mais dois ficheiros no mesmo projeto, com os nomes exatos:
   - **Ficheiro → Script**, nome `email-logo`, com o conteúdo de `tools/email-logo.gs`;
   - **Ficheiro → HTML**, nome `email-confirmacao`, com o conteúdo de
     `tools/email-confirmacao.html`.
5. Guarda (ícone do disquete).
6. **Implementar → Nova implementação**. No ícone de engrenagem escolhe
   **Aplicação Web** e define:
   - *Executar como*: **Eu**
   - *Quem tem acesso*: **Qualquer pessoa** ← importante, senão o site não consegue enviar
7. Clica **Implementar** e autoriza o acesso quando pedir (vai avisar que a app não
   é verificada — é tua, avança em "Avançadas → Aceder a…").
8. Copia o **URL da aplicação web** que aparece no fim. É algo como
   `https://script.google.com/macros/s/AKfy.../exec`.
9. Cola esse URL em `index.html` e `pre-inscricao.html`, no lugar de
   `SUBSTITUIR_PELO_ENDPOINT`:

```html
<form class="form" data-form data-endpoint="https://script.google.com/macros/s/AKfy.../exec" novalidate>
```

10. Faz commit e push. (O `data-endpoint` vive no HTML, por isso não é preciso
    mexer no `?v=` dos assets.)

### Enquanto o endpoint não estiver configurado

O formulário não finge que enviou: abre o email do visitante já preenchido para
`cpaccpatinagem@gmail.com`. Funciona, mas depende de o visitante ter cliente de
email configurado e carregar em enviar — por isso vale a pena fazer a instalação
acima.

### Testar

Depois de configurado, preenche o formulário no site e confirma que aparece uma
linha nova na folha de cálculo, um email na caixa do clube e a confirmação na
caixa do encarregado de educação. Para testar sem o site, no editor do Apps
Script escolhe a função `testar` e carrega em Executar.

### Email de confirmação ao encarregado de educação

Cada pré-inscrição gera dois emails: o aviso ao clube (texto simples) e uma
confirmação ao encarregado de educação, em HTML, com o símbolo do clube, os
dados recebidos e o que acontece a seguir. Quem tenha o HTML desligado recebe a
mesma informação em texto simples.

Três ficheiros compõem esse email:

| Ficheiro | O que é |
|---|---|
| `tools/email-confirmacao.html` | O template. É onde se muda o texto e o aspeto. |
| `tools/email-logo.gs` | O símbolo em base64, embutido no email. |
| `tools/google-apps-script.gs` | Preenche o template e envia (`confirmar`). |

**Ver o resultado sem republicar:**

```bash
node tools/preview-email.mjs
```

Corre o código real do Apps Script com APIs imitadas e escreve
`.local/email-preview.html` (e a versão em texto ao lado) para abrir no browser.
Os dados de exemplo estão no topo de `tools/preview-email.mjs` - vale a pena
testar nomes longos e o caso sem mensagem, que faz desaparecer esse bloco.

**A resposta do clube.** O email automático confirma que a pré-inscrição
chegou; quem marca os treinos é uma pessoa. O modelo dessa resposta está em
`tools/resposta-pre-inscricao.md`, com os horários reais, o que trazer e uma
lista de verificação antes de enviar.

**Regras do template.** Clientes de email não têm flexbox, grid, webfonts nem
variáveis CSS. Layout só com `<table>`, estilo inline, cores literais, 600px de
largura. O cabeçalho do ficheiro repete estas regras.

**Regenerar o símbolo**, depois de mudar `assets/img/icon-512.png`:

```bash
sips -Z 128 assets/img/icon-512.png --out /tmp/logo.png
python3 -c "import base64,textwrap;print(' +\n'.join(\"  '%s'\" % l for l in textwrap.wrap(base64.b64encode(open('/tmp/logo.png','rb').read()).decode(), 96)))"
```

Cola o resultado em `tools/email-logo.gs`, a seguir a `var LOGO_PNG_BASE64 =`.

### Proteção anti-spam

O formulário tem um campo escondido (`website`) que só robôs preenchem. O Apps
Script ignora essas submissões automaticamente.

## Medir: funil, ocupação e proveniência

Sem números não se decide nada: nem se vale a pena publicar no Instagram, nem se
já é altura de pedir mais horas de pista. Três folhas respondem a isso e
calculam-se sozinhas a partir das pré-inscrições.

Cada uma nasce de uma função do Apps Script que se corre **uma vez**, no editor
(escolher a função na barra de cima e carregar em Executar):

| Função | Folha que cria | Responde a |
|---|---|---|
| `configurarFunil` | **Funil** | De cada 10 pré-inscrições, quantas viram treino experimental e quantas viram inscrição? |
| `configurarOcupacao` | **Ocupação** | Que grupos têm vagas e quais estão cheios? |
| `configurarProveniencia` | **Proveniência** | De onde vieram as famílias que se pré-inscreveram? |

### Funil

Na folha das pré-inscrições, marcar `Sim` nas colunas **Experimental feito?** e
**Inscrito?** à medida que cada criança avança. A folha **Funil** conta por mês e
mostra as duas percentagens que interessam.

Se a percentagem de quem experimenta for baixa, o problema está no contacto
depois da pré-inscrição. Se for alta e a de inscrição for baixa, o problema está
no treino experimental ou no preço.

### Ocupação

A única folha que se escreve à mão. Por grupo, quantos **Lugares** existem e
quantos **Atletas** estão inscritos hoje; as vagas, a percentagem e a situação
(`Com vagas`, `Quase cheio`, `Cheio`) saem sozinhas, com cor.

Vale a pena atualizar os atletas uma vez por mês. É esta folha que diz quando
abrir lista de espera no site e que serve de argumento junto da Câmara para
pedir mais horas de pavilhão.

Os grupos estão na variável `GRUPOS`, no topo do script. Alterar aí se os nomes
mudarem e correr `configurarOcupacao` outra vez.

### Proveniência

Automática. O formulário envia duas informações além dos dados da criança: a
página onde foi preenchido e de onde veio a visita. Não usa cookies, não segue
ninguém entre visitas e não identifica pessoas - está descrito na política de
privacidade.

Para medir uma ação concreta, acrescentar `?via=` à ligação que se divulga:

```
https://www.patinagemcharneca.pt/pre-inscricao?via=cartaz-escola
https://www.patinagemcharneca.pt/?via=feira-desporto
```

Essa etiqueta aparece na folha **Proveniência** e fica a saber-se quantas
pré-inscrições vieram daquele cartaz. Sem etiqueta, fica registado o site de
onde veio a visita (`google.com`, `l.instagram.com`) ou `direta` para quem
escreveu o endereço à mão.

### Quantas pessoas visitam

As folhas acima medem quem chega ao fim. Para saber quantos visitantes há e que
páginas veem, o site usa a medição da Vercel (sem cookies), no painel do projeto
em **Analytics**. As duas leituras juntas dão a taxa de conversão: visitas na
página de pré-inscrição a dividir por pré-inscrições recebidas.

## Publicar

O site está na **Vercel**, ligada ao repositório: cada push para `main` publica em
<https://www.patinagemcharneca.pt> ao fim de cerca de um minuto. Um push é uma
publicação - confirmar no site depois, não antes.

O `vercel.json` na raiz define:

- `cleanUrls`: `/horarios` é o endereço oficial e `/horarios.html` redireciona
  (308) para lá;
- os cabeçalhos de segurança em todas as respostas, incluindo a
  `Content-Security-Policy`. Se um dia entrar um script ou um serviço externo
  novo (mapa, vídeo alojado fora, formulário de terceiros), é preciso
  acrescentá-lo à CSP, senão o browser bloqueia-o em silêncio. O script inline
  do `<head>` que põe a classe `js` no `<html>` está autorizado pelo seu hash:
  se o conteúdo desse script mudar, o hash tem de ser recalculado:

```bash
printf '%s' 'document.documentElement.classList.add("js")' | openssl dgst -sha256 -binary | openssl base64
```

- cache de um ano para `assets/css` e `assets/js` (são versionados com `?v=`) e
  de um dia para imagens.

A `404.html` na raiz é a página de erro, servida com o estado 404.

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
