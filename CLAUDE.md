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
| "educandos" | "atletas" |
| "o seu filho", "o seu educando" | "os atletas", "quem começa aos 5 anos" |
| "turmas", "aulas", "professores" | "grupos", "treinos", "treinadores" |
| "equipe", "time", "esporte" (pt-BR) | "equipa", "desporto" |

O travessão `—` não entra em lado nenhum: nem em texto visível, nem em títulos,
nem em `alt`, nem em meta descriptions. Substituir por hífen `-`.

Isto não é um ATL nem uma escola. É um clube desportivo federado.

### Tratamento

Impessoal, focado no atleta. Nunca dirigir o texto a "si" ou a "ti".

- Sim: "Os atletas do grupo de Formação treinam três vezes por semana."
- Sim: "A inscrição faz-se em qualquer altura do ano."
- Não: "O seu filho vai adorar." / "Marca já a tua aula."

Exceção: microcópia de ação (botões, labels de formulário) pode ser imperativa
neutra, sem pronome - "Pedir pré-inscrição", "Ver horários".

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

Os assets são referenciados com `?v=N` (atualmente `?v=14`). **Sempre que
alterares `style.css` ou `main.js`, incrementa o `v` em todas as páginas**, senão
os visitantes ficam com a versão antiga.

```bash
sed -i '' 's/?v=14/?v=15/g' *.html
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

- **Commit automático, sem push.** Cada alteração concluída leva commit, com
  mensagem em português, no estilo dos existentes ("Tira a palavra bairro do
  hero"). O `git push` é decisão do Francisco - nunca fazer sem pedido explícito.
- `.local/` e `assets/img/equipa/_originais/` estão em `.gitignore`: trabalho
  interno e fotos em alta resolução não vão para o repositório público.
- Depois de mexer em HTML, CSS ou JS, verificar no browser (`npm run dev`) antes
  de dar por feito.

---

## 5. Estado

Próximo passo combinado: **limpeza de linguagem** nas 7 páginas - travessões,
"o seu filho", "turmas", e alinhar o tom com a secção 1.

Auditoria em 2026-09-15: 49 ocorrências de `—` e 1 de "o seu filho".
