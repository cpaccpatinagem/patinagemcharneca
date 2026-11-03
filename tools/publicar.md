# Publicar com regularidade

O problema não é escrever, é lembrar-se e ter os factos à mão. Este sistema
resolve as duas coisas: os factos vêm da Federação por script, e o lembrete é
uma tarefa agendada que escreve o rascunho sozinha.

O que sobra para uma pessoa fazer: ler o rascunho, escolher uma foto, publicar.

---

## Onde vive cada coisa

| | |
|---|---|
| Bloco no site | secção `#atualizacoes` no `index.html`, três entradas |
| Instagram do clube | <https://www.instagram.com/patinagemcharneca> |
| Resultados das provas | `node tools/provas-cpacc.mjs` |
| Rascunhos | `.local/rascunhos/AAAA-MM-DD-*.md`, fora do repositório |
| Lembrete semanal | tarefa agendada "Publicações do CPACC", segundas às 9h |

Os rascunhos ficam em `.local/`, que está no `.gitignore`. Nada vai para o ar
sem alguém abrir o ficheiro e decidir.

---

## De onde vêm os resultados

A Federação publica tudo em <https://pa.fpp.pt>, prova a prova, com o clube de
cada atleta em sigla. A nossa é **CPACC**.

O que importa saber:

- O clube aparece em **duas** associações, e olhar só para uma deixa passar
  metade: a **AP Setúbal é a 14** (distritais, torneios, taças do distrito) e a
  **Federação é a 1** (campeonatos nacionais, torneios nacionais, opens). O
  script varre as duas por defeito. Com `--todas` varre também as outras dez,
  para o caso de um open fora do distrito.
- As provas da AP Setúbal têm `APSet` no título, e é esse o sinal de que o
  clube quase certamente participou. Nas da Federação não há atalho: é preciso
  abrir e procurar a sigla.
- A lista de provas de uma associação carrega por AJAX. O endereço útil é
  `https://pa.fpp.pt/Views/_getRollartAssociacao.php?associacaoID=14&pagina=1`,
  e não a página que o browser mostra.
- A **agenda dos próximos 7 dias** está em `https://pa.fpp.pt/Agenda`. É
  nacional e não diz a associação: para saber se é da AP Setúbal há que abrir
  cada prova.
- A classificação de um escalão está em
  `/Rollart/<prova>/<escalao>/<F ou M>`, com colunas `#`, `Atleta`, `Clube` e
  `Total`.
- **Armadilha:** `/F` é a classificação **final**; `/F/2P` é só o segmento do
  segundo programa. O `<title>` da plataforma diz "1º Programa" nas duas
  páginas e engana. Quem manda é o `<h2>` dentro da grelha, que diz "Final"
  ou o nome do segmento. O script já lê o certo.

O script trata disto tudo:

```bash
node tools/provas-cpacc.mjs                  # últimos 14 dias
node tools/provas-cpacc.mjs --dias 60        # janela maior
node tools/provas-cpacc.mjs --agenda --verificar   # o que vem a seguir
node tools/provas-cpacc.mjs --json           # para outro programa ler
```

### Um cuidado com as posições

A coluna do lugar vem **vazia** enquanto a prova não está homologada e
**preenchida** depois. O script usa o lugar oficial quando existe e, quando não
existe, calcula-o pela ordem da pontuação e marca a linha com "lugar deduzido
da ordem".

Só as linhas marcadas precisam de confirmação antes de afirmar um pódio no
site. As outras são o lugar oficial da Federação e podem ir como estão.

Na mesma linha há dois números seguidos, o lugar e a pontuação, e ambos num
`<span>` sem classe. Ler "o primeiro número da linha" dá o lugar a fazer-se
passar por pontuação em todas as provas já homologadas. O script lê a
pontuação a partir da posição relativa ao `<span class="equipa">`.

### Nomes de menores

A Federação publica nomes completos ao abrigo do RGPA. O site do clube **não**:
as entradas escrevem-se por escalão e por número ("dois segundos lugares, em
Iniciados e Cadetes femininos"), nunca com o nome de uma criança, a não ser
que o Francisco decida o contrário caso a caso. A política de privacidade do
site assume uma postura sobre imagem dos atletas e o texto tem de ser coerente
com ela.

---

## O Instagram é destino, não fonte

O site já aponta para a conta do clube em todas as páginas: o ícone do rodapé,
a página de contactos, e o campo `sameAs` dos dados estruturados, que é o que
diz ao Google que o site e a conta são a mesma entidade.

O que **não** funciona é ler o Instagram a partir do script. Um pedido simples
traz só a etiqueta com o número de seguidores; e disfarçar o pedido de browser
para contornar a detecção de robôs não se faz, nem se inicia sessão na conta
para ver mais. Os factos continuam a vir da Federação.

O que **funciona**, e só num browser a sério, é abrir o perfil e ler:

- os endereços das **12 publicações mais recentes** (`/patinagemcharneca/p/...`);
- a **data** de cada uma, no texto alternativo da imagem ("Photo by CPACC on
  November 03, 2026");
- uma descrição grosseira da imagem, que raramente serve para alguma coisa.

As **legendas não são legíveis**. Chega, mesmo assim, para as duas coisas que
interessam: saber se o site está atrasado em relação ao Instagram, e encontrar
a publicação que corresponde a uma prova, pela data, para preencher o link.

A ligação faz-se ao contrário, à mão e numa linha. Cada entrada do site tem no
fim um `<div class="update__links">` com o link para a Federação e um segundo
link comentado:

```html
<!-- <a class="btn btn--link" href="PREENCHER" target="_blank" rel="noopener">Ver no Instagram <span class="btn__arrow" aria-hidden="true">→</span></a> -->
```

Depois de publicares no Instagram, copia o endereço **do post** (o que tem
`/p/...`, não o do perfil), põe no `href` e descomenta. Quem chega pela
Federação vê o Instagram, quem chega pelo Instagram encontra o site.

---

## Quando não há provas

A época dá rajadas, não regularidade. Os meses sem prova alimentam-se de temas
que já se conhecem hoje e que não precisam de novidade nenhuma:

- abertura da época e vagas do grupo de Iniciação;
- o que um atleta traz para o primeiro treino;
- como funciona a progressão entre os três grupos;
- o que os treinadores procuram quando decidem passar alguém a Competição;
- a gala e as apresentações de fim de época;
- o pavilhão e os horários de cada grupo;
- balanço da época que acabou.

Regra do ritmo escolhida: **semanal em época de provas, mensal quando não há**.
Se passarem quatro semanas sem publicação, sai um destes temas.

---

## Linguagem

As regras vivem no `CLAUDE.md` e valem aqui inteiras. As que mais escapam nestes
textos:

- hífen `-`, nunca travessão;
- "grupos" e "treinos", nunca "turmas" nem "aulas";
- "atletas", nunca "educandos" nem "o seu filho";
- "piões", não "piruetas";
- nunca tratar por "tu", nem em legendas de redes sociais;
- sem superlativos sem prova.

Um cuidado próprio das legendas: "1º de 1" não é uma vitória. Se um escalão
tinha uma atleta em prova, não se escreve que ganhou.

---

## O trabalho que sobra para uma pessoa

1. Ler o rascunho em `.local/rascunhos/`.
2. Tratar a foto: largar o original em `assets/img/<pasta>/_originais/` e correr
   `python3 tools/preparar-fotos.py`. O original nunca vai para o repositório.
3. Colar a entrada no `index.html` e apagar a mais antiga das três.
4. Commit com os ficheiros pelo nome, nunca `git add -A`.
5. Para o Instagram, copiar a legenda do rascunho. Nenhum agente publica lá.
