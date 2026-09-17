# CPACC — Site do Clube de Patinagem Artística da Charneca de Caparica

Site institucional estático. O objetivo do site é levar famílias e atletas da
primeira visita até à pré-inscrição, com a credibilidade de um clube de formação
sério.

O `README.md` documenta como correr, publicar e configurar. Este ficheiro
documenta como escrever e como decidir.

---

## 1. Linguagem (a parte que mais importa)

### Proibido

| Não escrever | Escrever |
|---|---|
| `—` (travessão) | `-` (hífen) |
| "clube de bairro", "pequeno clube", "familiar" | "clube de formação" |
| "bairro" | "a terra", "o concelho" |
| "educandos" | "atletas" |
| "o seu filho", "o seu educando" | "os atletas", "quem começa aos 5 anos" |
| "turmas", "aulas", "professores" | "grupos", "treinos", "treinadores" |
| "equipe", "time", "esporte" (pt-BR) | "equipa", "desporto" |

O travessão `—` não entra em lado nenhum: nem em texto visível, nem em títulos,
nem em `alt`, nem em meta descriptions. Substituir por hífen `-`.

Isto não é um ATL nem uma escola. É um clube desportivo federado.

**Exceção em vigor:** o subtítulo da página inicial diz "sem perder as raízes
familiares e a ligação à terra com que nasceu, em 1999". Fica como está - é uma
escolha deliberada do Francisco. A regra continua a valer para texto novo: não
descrever o clube como familiar em mais lado nenhum.

### Tratamento

Por defeito impessoal, focado no atleta. O texto descreve o clube, não fala
para o leitor.

- Sim: "Os atletas do grupo de Formação treinam três vezes por semana."
- Sim: "A inscrição faz-se em qualquer altura do ano."

**Tratar o leitor por "si" é permitido, com moderação.** Onde há uma ação a
pedir ou uma garantia a dar, o impessoal fica forçado e distante: "Faça a
pré-inscrição e confirmamos a vaga" é melhor português do que qualquer volta
para evitar o verbo. Usar onde ganha alguma coisa - chamadas à ação, respostas
das perguntas frequentes, formulário, privacidade - e não como voz do site.

Se um bloco inteiro estiver em "si", há excesso: passar a descrição a impessoal
e deixar o tratamento direto só no convite final.

Nunca por "tu": nem em texto, nem em placeholders de formulário, nem em
mensagens de erro do JavaScript. É o erro que mais escapa, porque esses textos
não estão no corpo das páginas.

Continua proibido dizer "o seu filho" ou "o seu educando" - isso é sobre a
criança, não sobre o tratamento. Falar em "os atletas" ou "a criança".

Microcópia de ação (botões, labels) fica imperativa neutra, sem pronome -
"Pedir pré-inscrição", "Ver horários".

### Posicionamento

Formação completa: exigência técnica **e** percurso pessoal. O que o clube
oferece é competência técnica real (treinadores credenciados, progressão por
níveis, competição federada) somada a disciplina, confiança e sentido de grupo.

Premium pela competência, não pelo luxo e não pela ternura. Evitar tanto o
registo corporativo frio como o registo emocional de folheto.

### Grupos

Os três nomes válidos, sempre com maiúscula e precedidos de "grupo de":

- **grupo de Iniciação**
- **grupo de Formação**
- **grupo de Competição**

Há subdivisões internas (A e B), mas não se explicam nas páginas de entrada.
Só aparecem onde forem mesmo necessárias, como na grelha de horários.

### Português

Português de Portugal, sem ortografia brasileira. Frases curtas. Verbo cedo.
Zero superlativos vazios ("incrível", "único", "o melhor"). Se uma afirmação
precisa de prova, ou tem prova ao lado ou sai.

Isto vale para afirmações por confirmar, não para o que o Francisco sabe da
modalidade. Um exemplo real: o site diz que o pavilhão tem "piso próprio para
patinagem artística", eu vi nas fotos um pavilhão municipal com marcações de
basquetebol e mudei a frase - mas um piso de madeira de pavilhão é mesmo piso
próprio para patinagem artística, e a frase estava certa. Uma fotografia não
serve para contestar o que ele afirma sobre a modalidade ou sobre o clube:
perguntar e esperar pela resposta.

---

## 2. Conteúdo que ainda não existe

O site tem dados por preencher. **Nunca inventar** números, datas, nomes,
horários, moradas ou palmarés.

Quando faltar um dado real, marcar com placeholder visível (`PREENCHER`,
`SUBSTITUIR`, ou a classe `todo-note`, que aparece no site com barra dourada à
esquerda). É intencional que se veja: é o que garante que não vai para produção
por esquecimento.

A tabela do que falta está no `README.md`, secção "O que falta preencher".

---

## 3. Técnica

### Stack

HTML, CSS e JavaScript puro. **Sem build, sem bundler, sem dependências.** O que
está no repositório é exatamente o que vai para o servidor. Não introduzir
frameworks, npm packages nem passos de compilação.

`npm run dev` levanta `tools/dev-server.mjs` em <http://localhost:4173> com live
reload. Não usar outros servidores.

### Ficheiros

```
index.html clube.html horarios.html pre-inscricao.html faq.html
contactos.html privacidade.html
assets/css/style.css    design system + estilos globais (1 ficheiro)
assets/js/main.js       animações, menu, acordeão, formulário (1 ficheiro)
tools/                  dev-server, Apps Script do formulário, scripts de fotos
```

Um ficheiro CSS e um ficheiro JS. Não partir em módulos.

### Design system

As cores, tipografia e espaçamentos vivem em variáveis CSS no topo do
`style.css`, secção `TOKENS`. Mudar cor ou tipo faz-se **só aí** - o site inteiro
acompanha. Não escrever valores de cor literais nos componentes.

Paleta: azul-noite (`--c-ink-*`) com dourado (`--c-gold-*`) sobre papel
(`--c-paper`).

### Cache busting

Os assets são referenciados com `?v=N` (atualmente `?v=22`). **Sempre que
alterares `style.css` ou `main.js`, incrementa o `v` em todas as páginas**, senão
os visitantes ficam com a versão antiga.

```bash
sed -i '' 's/?v=22/?v=23/g' *.html
```

### Acessibilidade (não negociável)

WCAG AA em cada alteração, não no fim:

- contraste mínimo AA em texto e elementos interativos;
- tudo alcançável e operável por teclado, com foco visível;
- `alt` em imagens com conteúdo, `alt=""` nas decorativas;
- ARIA correto no menu e no acordeão (já existe - manter);
- `prefers-reduced-motion` respeitado: sem animação para quem a desativou;
- um `<h1>` por página, hierarquia de headings sem saltos.

### SEO

Cada página tem `<title>`, meta description, Open Graph e JSON-LD. Ao criar ou
renomear páginas, atualizar `sitemap.xml`. O `faq.html` tem dados estruturados
`FAQPage` - manter em sincronia com as perguntas reais.

---

## 4. Trabalho

- **Commit e push automáticos.** Cada alteração concluída leva commit, com
  mensagem em português, no estilo dos existentes ("Tira a palavra bairro do
  hero"), e vai para o `main`. A Vercel publica a partir daí, por isso um push
  é uma publicação: confirmar no site depois de publicar, não antes.
- **Nunca `git add -A` nem `git add .`.** Adicionar os ficheiros pelo nome.
  O Francisco larga fotos e vídeos em bruto dentro do projeto enquanto se
  trabalha, e o `add -A` já publicou duas vezes o que não devia: retratos em
  alta resolução dentro de `assets/img/equipa/` e 570 MB de vídeos de crianças
  em treino, com GPS, da pasta "Video intro website CPACC homepage/". Os
  originais ficam sempre numa pasta `_originais/` ignorada; o que vai para o
  site é só o que a ferramenta produz.
- `.local/`, `assets/img/*/_originais/`, a pasta dos vídeos e qualquer `*.mov`
  estão em `.gitignore`: trabalho interno, fotos em alta resolução e vídeo em
  bruto não vão para o repositório público.
- Depois de mexer em HTML, CSS ou JS, verificar no browser (`npm run dev`) antes
  de dar por feito.

---

## 5. Estado

Limpeza de linguagem **feita** em 2026-09-16: 56 travessões passados a hífen nas
7 páginas e nos textos visíveis do `main.js`, "turmas" e "aulas" substituídas por
"grupos" e "treinos", e o título "Quem vai estar com o seu filho" passado a "Quem
acompanha os atletas". A 2026-09-17 saíram os últimos "tu" que tinham escapado:
um "Tens" na privacidade e o placeholder "O teu nome" no formulário.

Por fazer:

- **José Quintela.** O bloco `.tribute` no `clube.html` não tem foto. O
  Francisco quer pôr a foto do pai e um vídeo da homenagem que lhe foi feita em
  julho de 2024. Lembrá-lo quando ele voltar ao assunto.
- **Foto da página inicial.** A que está ao lado de "Uma formação que vai além
  da técnica" é um plano largo do pavilhão; o Francisco acha-a vazia e quer um
  momento de alegria. Vai mandar uma foto do Halloween de 2025.
- **Polo do clube nos retratos.** Só a Catarina e a Madalena estão de polo. O
  Francisco, a Sílvia, a Inês e a Beatriz precisam de foto nova com o polo
  vestido; a Cátia está com a t-shirt do clube. Não se veste um polo a ninguém
  por edição - a foto que chegou assim tinha o nome do clube mal escrito no
  logótipo e não foi publicada. Está em `_originais/`.
- **Inês Pelica** tem uma biografia de uma linha. Falta percurso.
- **Foto histórica** - placeholder no topo do `clube.html`.
- **Vídeo do hero** - o `<video>` está comentado no `index.html` e no lugar dele
  corre o `.hero__placeholder`. Especificações no `README.md`.
- **Taça de Portugal 2013** e o percurso da Inês Pelica no Clube Futebol
  Sassoeiros - ambos afirmados no site e por confirmar.
- **Search Console** - falta o registo TXT no dominios.pt para validar o domínio
  e pedir a indexação da página inicial, para o Google apanhar o ícone.
