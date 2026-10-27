# Especificação Técnica — Jogo Casual de Adivinhação de Palavras

**Nome do produto:** Termo Duelo (nome provisório; decisão de marca pendente)  
**Versão:** 1.0 — proposta de implementação  
**Data:** 27 de outubro de 2026  
**Base de produto:** [PRD.md](./PRD.md), versão 2.0  
**Direção de interface:** moderna, limpa e expressiva, com motivos visuais de caça-palavras  
**Estado:** proposta para orientar a implementação; não altera por si só o código existente

## 1. Objetivo e escopo

Este documento descreve como transformar o projeto atual em um jogo diário solo, com prática temática, perfis pseudônimos, estatísticas, ranking e instalação como PWA. A interface deve ser responsiva e acessível, com uma identidade visual própria inspirada em buscas de palavras.

O documento detalha:

- arquitetura cliente/servidor e limites de confiança;
- organização sugerida de arquivos;
- modelo de dados e contratos HTTP;
- regras de desafio diário, prática e avaliação dos palpites;
- direção visual, componentes e comportamento responsivo;
- persistência, PWA, privacidade, segurança e validação.

O **MVP não inclui o modo de duelo 1v1**. O código de salas e Socket.IO existente não deve ser removido até que o novo fluxo esteja implementado e validado e a decisão de produto sobre o modo antigo esteja confirmada.

## 2. Direção visual e experiência

### 2.1 Princípio de design

Construir uma experiência contemporânea, clara e agradável, com aparência de um caderno/jogo de palavras — não de uma arena competitiva. O jogo continua sendo de descobrir uma palavra secreta por palpites e feedback de letras. Os elementos de caça-palavras são **motivos visuais**, não uma mecânica de procurar palavras em uma matriz.

### 2.2 Linguagem visual

- **Superfícies:** fundo claro quente ou neutro, cartões limpos, bordas discretas e elevação sutil. O modo escuro pode ser adicionado após validar a base clara.
- **Paleta de referência:** verde profundo para ação e acerto, âmbar para letra presente em outra posição, coral ou terracota para acento editorial e cinza-escuro para texto. As cores finais devem passar por medição de contraste antes de serem fixadas.
- **Motivos de caça-palavras:** linhas finas de grade, letras em baixa opacidade, traços que ligam letras e caminhos curtos selecionando uma palavra. Usar apenas em decoração, cabeçalho, divisórias ou estados de sucesso; nunca atrás de texto pequeno ou como única explicação de estado.
- **Tabuleiro:** letras centralizadas em células quadradas, contorno visível em estado vazio e estado preenchido. Células de resultado combinam cor, símbolo e nome acessível.
- **Tipografia:** pilha de fontes do sistema, títulos com caráter editorial e corpo de alta legibilidade. Evitar fontes externas bloqueantes.
- **Ícones:** ícones SVG locais simples ou símbolos acompanhados de rótulos. Não depender apenas de emoji para ações ou estados.
- **Tom de voz:** breve, amigável e sem pressionar quem perdeu a sequência ou não resolveu a palavra.

As cores são tokens ajustáveis em CSS; os exemplos abaixo são pontos de partida, não uma paleta aprovada:

```css
:root {
  color-scheme: light;
  --page: #f7f6f1;
  --surface: #ffffff;
  --text: #202a27;
  --muted: #53615b;
  --line: #c8d0ca;
  --brand: #145a43;
  --brand-contrast: #ffffff;
  --correct: #176b4d;
  --present: #805100;
  --absent: #4a5550;
  --accent: #b94f45;
  --focus: #155eef;
  --radius-card: 1.25rem;
  --shadow-card: 0 0.6rem 2rem rgb(24 42 34 / 8%);
}
```

### 2.3 Hierarquia das telas

1. **Cabeçalho:** marca, acesso às preferências de acessibilidade e perfil.
2. **Apresentação do desafio:** “Desafio diário”, data/número do desafio, tamanho da palavra e até seis tentativas.
3. **Seletor de modo:** desafio diário e prática, com estado selecionado anunciado semanticamente.
4. **Área de jogo:** legenda do feedback, tabuleiro, teclado e mensagem de estado.
5. **Resultado:** resposta revelada somente ao concluir, resumo, compartilhar, estatísticas e ranking.
6. **Prática:** seletores acessíveis de categoria e tamanho; sinalização persistente de que a partida não conta para o resultado diário.

No desktop, uma coluna principal pode ser acompanhada por cartões de estatísticas e prática. Em telas pequenas, a ordem deve permanecer linear: desafio, tabuleiro, teclado, resultado/ações. Não exigir rolagem horizontal.

## 3. Arquitetura proposta

### 3.1 Tecnologias

Preservar a pilha simples do projeto:

| Componente | Proposta | Estado atual |
|---|---|---|
| Navegador | HTML semântico, CSS responsivo e JavaScript ES modules | Já usado no cliente |
| API e servidor estático | Node.js + Express | Já presente |
| Persistência | SQLite para uma implantação de instância única com volume persistente; Postgres se a plataforma não oferecer disco persistente ou exigir réplicas | Não existe no projeto |
| Atualização de jogo | HTTP JSON; sem Socket.IO no fluxo diário | Socket.IO existe para o duelo atual |
| PWA | Web App Manifest e Service Worker versionado | Já existem, precisam ser ajustados |
| Testes | `node:test` para lógica/API e Playwright ou teste manual automatizado no navegador para fluxos | Não há suíte definida no `package.json` |

O MVP não precisa de framework frontend nem de um bundler. Dividir o JavaScript em módulos pequenos mantém a estrutura compatível com o código atual. Um banco persistente é necessário para que tentativas, perfis e ranking não desapareçam em reinícios do servidor.

### 3.2 Diagrama lógico

```text
Navegador / PWA
  ├─ HTML + CSS responsivos
  ├─ módulos de interface, estado, validação local e API
  ├─ armazenamento local: preferências e rascunho não autoritativo
  └─ HTTPS / JSON
        │
        ▼
Express
  ├─ API de perfil
  ├─ API do desafio diário
  ├─ API de prática
  ├─ API de estatísticas e ranking
  ├─ validação e limites de requisição
  ├─ serviço de palavras / avaliação de palpites
  └─ camada de persistência
        │
        ├─ SQLite + volume persistente (MVP de instância única)
        └─ arquivos de vocabulário e agenda diária (somente servidor)
```

### 3.3 Limites de confiança

- O servidor é autoridade para a data oficial, palavra secreta, tentativas aceitas, resultado, estatísticas e ranking.
- O navegador nunca recebe a resposta antes da partida terminar.
- O cliente pode guardar visualmente o progresso temporário, mas esse estado não concede resultado oficial sem validação do servidor.
- O apelido é público no ranking; o identificador interno do perfil e os tokens não são públicos.
- Um perfil pseudônimo sem autenticação forte é recuperável apenas no dispositivo que conserva sua credencial local. Não prometer sincronização ou resistência a múltiplos perfis.

## 4. Estrutura de arquivos proposta

Os caminhos abaixo são o destino pretendido após uma migração, não um retrato da estrutura atual.

```text
CacaPalavra/
├── PRD.md
├── SPECS.md
├── package.json
├── server/
│   ├── server.js                    # Inicialização Express e middleware
│   ├── routes/
│   │   ├── profiles.js
│   │   ├── challenges.js
│   │   ├── practice.js
│   │   ├── stats.js
│   │   └── leaderboard.js
│   ├── services/
│   │   ├── dailyChallengeService.js
│   │   ├── gameService.js
│   │   ├── profileService.js
│   │   └── leaderboardService.js
│   ├── repositories/
│   │   ├── profileRepository.js
│   │   ├── gameRepository.js
│   │   └── challengeRepository.js
│   ├── db/
│   │   ├── connection.js
│   │   └── migrations/
│   ├── words/
│   │   ├── answers/                 # Respostas publicáveis apenas pelo servidor
│   │   ├── guesses/                 # Palpites aceitos
│   │   └── daily-challenges.json    # Agenda curada e validada no deploy
│   └── middleware/
│       ├── profileSession.js
│       └── rateLimit.js
└── public/
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── css/
    │   ├── tokens.css
    │   ├── base.css
    │   ├── layout.css
    │   ├── game.css
    │   └── accessibility.css
    ├── js/
    │   ├── app.js
    │   ├── api.js
    │   ├── state.js
    │   ├── board.js
    │   ├── keyboard.js
    │   ├── practice.js
    │   ├── result.js
    │   └── preferences.js
    └── assets/
        └── icons/
```

Manter os arquivos atuais no lugar durante a primeira migração, se necessário. Só remover módulos antigos de duelo, assets cyber e dependências Socket.IO depois de substituir os fluxos e confirmar que o multiplayer não será mantido.

## 5. Modelo de domínio e persistência

### 5.1 Entidades

| Entidade | Campos principais | Observações |
|---|---|---|
| `profiles` | `id`, `nickname`, `nickname_normalized`, `created_at`, `updated_at`, `deleted_at` | Apelido opcional; não exigir e-mail ou nome real |
| `profile_sessions` | `id`, `profile_id`, `token_hash`, `created_at`, `expires_at`, `revoked_at` | Guardar hash do token, nunca o token em texto claro |
| `daily_challenges` | `id`, `challenge_date`, `timezone`, `word_length`, `answer`, `created_at` | Palavra secreta acessível apenas na camada de servidor |
| `daily_games` | `id`, `profile_id`, `challenge_id`, `status`, `attempt_count`, `won`, `started_at`, `completed_at` | Restrição única para `(profile_id, challenge_id)` |
| `daily_guesses` | `id`, `game_id`, `guess_index`, `guess`, `result_json`, `created_at` | Restrição única para `(game_id, guess_index)` |
| `practice_games` | `id`, `profile_id`, `category_id`, `word_length`, `answer`, `status`, `attempt_count`, `expires_at` | Não entra em ranking ou estatísticas diárias |
| `practice_guesses` | `id`, `game_id`, `guess_index`, `guess`, `result_json`, `created_at` | Pode ser removida ao expirar a sessão |

### 5.2 Regras de integridade

- Chaves primárias aleatórias não sequenciais (UUID ou identificador aleatório seguro).
- `UNIQUE(profile_id, challenge_id)` impede mais de uma partida diária concluída por perfil.
- `UNIQUE(game_id, guess_index)` impede duplicação de uma tentativa.
- Cada gravação de palpite atualiza tentativa, estado e resultado em uma transação.
- A ordem da tentativa deve ser definida pelo servidor; nunca confiar em índice fornecido pelo cliente.
- Atualizações concorrentes para uma mesma partida devem ser serializadas ou protegidas por controle otimista.
- Remoção do perfil deve apagar ou anonimizar dados vinculados conforme política de retenção a definir.

### 5.3 SQLite e transição de banco

Para a implantação de menor complexidade, usar SQLite em um volume persistente, uma instância de escrita e migrações versionadas. Não manter o banco em `node_modules`, no diretório temporário ou em filesystem efêmero do container. Ativar foreign keys, transações e backup periódico.

Se a hospedagem escolhida não oferecer armazenamento persistente, se houver mais de uma instância escrevendo ou se a disponibilidade do ranking exigir alta disponibilidade, selecionar Postgres antes da produção. A interface de repositórios reduz o acoplamento, mas não elimina diferenças de SQL; validar migrações e transações no banco de produção.

## 6. Regras de jogo e processamento

### 6.1 Desafio do dia

- Um registro de agenda identifica um único desafio por data oficial e fuso horário.
- A proposta atual é `America/Sao_Paulo`, ainda pendente de confirmação no PRD.
- A agenda define data, tamanho e resposta previamente; não escolher uma palavra aleatória diferente por processo ou instância.
- Validar a agenda na inicialização/deploy: datas sem duplicidade, tamanho entre 4–7, resposta válida e presença no vocabulário.
- Não expor a resposta em HTML, JavaScript público, manifest, resposta de API, log de cliente ou cache.
- O endpoint retorna data, ID do desafio, tamanho, máximo de tentativas e estado da partida do perfil; nunca a resposta antes de `won` ou `lost`.
- Depois da conclusão, responder com a palavra oficial e o resultado confirmado.

Uma agenda curada e versionada dá previsibilidade para revisão editorial e igualdade global. Um job de publicação automatizado pode ser adicionado depois, sem mudar os contratos da API.

### 6.2 Normalização e letras

Implementar uma função única no servidor e testes correspondentes para:

1. validar string e limitar tamanho bruto antes de normalizar;
2. remover espaços nas extremidades e converter para maiúsculas;
3. normalizar Unicode e tratar acentos de modo consistente, comparando a forma canônica sem marcas diacríticas;
4. rejeitar espaços internos, números, pontuação e caracteres fora do alfabeto permitido;
5. contar letras normalizadas e comparar com o comprimento da rodada.

O cliente pode aplicar validação semelhante para resposta imediata, mas a validação do servidor prevalece. Registrar na documentação de conteúdo como tratar acentos, `Ç`, flexões, regionalismos, siglas, nomes próprios e variações ortográficas. Evitar aceitar uma string Unicode visualmente longa que normalize para outro comprimento.

### 6.3 Avaliação de letras repetidas

Generalizar o algoritmo atual de cinco letras para o comprimento da palavra. Passar o comprimento esperado como argumento, sem constante global fixa.

Pseudocódigo de duas passagens:

1. Inicializar todos os estados como `absent`.
2. Marcar primeiro as letras na posição correta e reduzir a contagem disponível da palavra secreta.
3. Percorrer as posições não corretas; marcar `present` somente enquanto ainda houver ocorrência não consumida dessa letra.
4. Considerar vitória quando todas as posições forem `correct`.

Criar testes de unidade com duplicatas tanto no segredo quanto no palpite, incluindo ocorrências corretas que devem consumir a contagem antes das ocorrências deslocadas.

### 6.4 Palpite e encerramento

- Uma tentativa só é consumida após validação estrutural e de dicionário.
- As tentativas são numeradas pelo servidor, de 1 a 6.
- Ao acertar ou consumir a sexta tentativa, a partida muda para estado final imutável.
- Em estado final, chamadas repetidas retornam o resultado atual sem consumir outra tentativa.
- Para desafio diário, uma nova partida para o mesmo perfil e data não é criada.
- Para prática, criar sessões distintas, sem efeitos em estatísticas diárias ou ranking.

## 7. API HTTP proposta

Todas as rotas JSON usam prefixo `/api/v1`, HTTPS em produção, respostas com `Content-Type: application/json` e erros em formato consistente:

```json
{
  "error": {
    "code": "INVALID_GUESS",
    "message": "Digite uma palavra válida com 5 letras."
  }
}
```

Não devolver stack trace, segredo ou informação interna no erro.

### 7.1 Sessão pseudônima e perfil

| Método e rota | Finalidade |
|---|---|
| `POST /api/v1/profile` | Criar perfil/dispositivo pseudônimo e opcionalmente definir apelido |
| `GET /api/v1/profile` | Consultar o perfil associado à sessão |
| `PATCH /api/v1/profile` | Alterar apelido |
| `DELETE /api/v1/profile` | Solicitar exclusão do perfil e dados vinculados |

Para uma API same-origin, preferir cookie de sessão opaco com `HttpOnly`, `Secure`, `SameSite=Lax` e rotação/revogação no servidor. Verificar `Origin` em operações mutáveis. Se o projeto adotar bearer token em vez de cookie, documentar o risco de exposição em XSS e não armazenar credencial de longo prazo em `localStorage`.

Uma pessoa pode jogar sem apelido, mas ranking por apelido exige perfil opt-in. Sem conta ou verificação, a identidade é pseudônima por dispositivo e pode ser perdida ao limpar dados do navegador; não é uma identidade forte nem prova contra múltiplos perfis.

### 7.2 Desafio diário

| Método e rota | Finalidade |
|---|---|
| `GET /api/v1/challenge/today` | Obter data oficial, tamanho, ID e estado/progresso do usuário |
| `POST /api/v1/challenge/{challengeId}/guesses` | Validar e registrar um palpite da partida diária |
| `GET /api/v1/challenge/{challengeId}/result` | Consultar resultado final autorizado do perfil atual |

Exemplo de resposta inicial, sem palavra secreta:

```json
{
  "id": "2026-10-27",
  "date": "2026-10-27",
  "timezone": "America/Sao_Paulo",
  "wordLength": 5,
  "maxAttempts": 6,
  "status": "in_progress",
  "guesses": []
}
```

O POST recebe apenas `{ "guess": "..." }`. Não aceitar do cliente `result`, `isWin`, `answer`, `guessIndex` nem `completedAt`. Retornar o palpite normalizado, estados por letra, tentativas restantes e status. Incluir `answer` somente quando status final.

### 7.3 Prática

| Método e rota | Finalidade |
|---|---|
| `GET /api/v1/categories` | Listar categorias e comprimentos com conteúdo válido |
| `POST /api/v1/practice` | Criar sessão de prática com categoria e tamanho escolhidos |
| `POST /api/v1/practice/{sessionId}/guesses` | Registrar palpite na sessão de prática |
| `DELETE /api/v1/practice/{sessionId}` | Encerrar a sessão antes de expirar |

O servidor seleciona a resposta e a mantém secreta. Sessões devem expirar por inatividade e não aparecer no ranking. Retornar erro explícito quando não houver vocabulário para a combinação selecionada; não substituir silenciosamente por outra categoria ou tamanho.

### 7.4 Estatísticas e ranking

| Método e rota | Finalidade |
|---|---|
| `GET /api/v1/stats/me` | Consultar partidas diárias, vitórias, distribuição e sequências |
| `GET /api/v1/leaderboard?date=YYYY-MM-DD&limit=20&cursor=...` | Consultar ranking diário paginado |

Regras recomendadas:

- Ranking só inclui resultados de desafio finalizados e verificados pelo servidor.
- Ordenar resoluções por número de tentativas crescente; empate no mesmo número de tentativas permanece empate. Derrotas ficam em seção separada ou são omitidas do ranking de resoluções.
- Não usar velocidade/tempo de resposta como desempate.
- Aceitar `limit` limitado no servidor e paginação por cursor.
- Não expor ID de perfil, cookie, IP, histórico de palpites ou dados de terceiros.
- Não considerar o apelido como identificador único.

### 7.5 Limites e semântica HTTP

- `400` para formato inválido; `401` para sessão ausente/inválida se o recurso exige perfil; `404` para desafio/sessão não encontrados; `409` para partida já finalizada ou tentativa concorrente incompatível; `429` para limite excedido; `500` apenas para falha interna genérica.
- Definir timeout e limite de payload pequeno, adequado apenas a uma palavra.
- Fazer `Cache-Control: no-store` em respostas de desafio e perfil.
- Adicionar `X-Request-Id` aos logs para correlacionar falhas sem registrar conteúdo sensível.

## 8. Interface de cliente

### 8.1 Módulos

- `api.js`: chamadas HTTP, serialização, timeout e conversão de erros de API em erros tipados.
- `state.js`: estado explícito de modo, partida, linha, palpite atual, preferências e carregamento.
- `board.js`: renderização determinística do tabuleiro e dos rótulos acessíveis.
- `keyboard.js`: teclado visual e mapeamento do teclado físico.
- `practice.js`: seleção de categoria/tamanho e controle de sessão separada.
- `result.js`: estado final, grade de compartilhamento sem spoilers, estatísticas e ranking.
- `preferences.js`: contraste, tamanho do texto e movimento reduzido.
- `app.js`: inicia módulos, carrega sessão e desafio, liga eventos e navegação.

Evitar que o DOM seja a única fonte de estado. Ao receber uma resposta do servidor, atualizar o estado e redesenhar os componentes afetados. Desativar botão e entrada enquanto um palpite está sendo enviado; restaurar controles após falha recuperável.

### 8.2 Entrada e teclado

- Suportar teclado visual e teclado físico (`A–Z`, `Ç` quando presente no vocabulário, `Backspace`, `Enter`).
- Ignorar atalhos de entrada quando o foco estiver em input, textarea, select ou contenteditable, exceto o comportamento nativo do formulário.
- Não interceptar combinações de teclas do navegador ou tecnologia assistiva.
- Teclado virtual deve usar `<button type="button">` e nomes acessíveis; a ação pode ter o rótulo “Apagar última letra” ou “Enviar palpite”.
- Usar input real associado a label se a implementação optar por campo de texto; não manter duas fontes conflitantes de conteúdo.
- Tratar tecla Enter e botão de envio como a mesma ação, sem envio duplo.

### 8.3 Estados visuais e mensagens

Representar em classes e atributos explícitos os estados `empty`, `filled`, `correct`, `present`, `absent`, `submitting`, `won`, `lost`, `offline` e `error`. Não inferir estado exclusivamente da cor CSS.

Mensagens de carregamento, validação, falha de rede, vitória e derrota devem ser curtas, persistentes o bastante para leitura e anunciadas em região `aria-live` apropriada. Falhas não podem parecer confirmação de sucesso.

### 8.4 Compartilhamento

Gerar o texto/grade a partir do resultado confirmado pelo servidor. O conteúdo compartilhado deve incluir número/data do desafio e padrão visual das tentativas, nunca resposta ou letras. Usar Web Share API quando suportada e oferecer cópia para área de transferência como alternativa; fornecer fallback selecionável quando a permissão falhar. Confirmar a regra de apresentar resultado apenas após o fim.

## 9. Acessibilidade

Meta: atender WCAG 2.2 nível AA nas telas principais do MVP, com validação manual e automatizada quando possível.

- HTML semântico, ordem de headings lógica, landmarks e link “Pular para o conteúdo”.
- Todos os controles utilizáveis por teclado, foco visível, ordem de foco previsível e nenhuma armadilha de teclado.
- Contraste mínimo de 4,5:1 para texto comum e 3:1 para texto grande; componentes e informação visual importante com pelo menos 3:1 contra adjacências.
- Acerto, presença e ausência comunicados também por símbolo, padrão, nome acessível e/ou instrução textual; a cor sozinha nunca é suficiente.
- Tabuleiro com nome acessível; resultado da linha anunciado como uma frase compacta para leitores de tela, sem interromper com anúncio por cada célula.
- Preferir `<button>`, `<label>`, `<fieldset>` e `<legend>` nativos em vez de controles ARIA personalizados.
- Mensagens de status usam `role="status"` ou `aria-live="polite"`; erros críticos podem usar anúncio assertivo com parcimônia.
- Respeitar `prefers-reduced-motion` e fornecer preferência persistente para desativar animações não essenciais.
- Controles com área de toque suficiente, espaçamento e rótulos claros em celular.
- Testar zoom/reflow a 200%, navegação apenas por teclado e ao menos um leitor de tela de desktop e um móvel.

Animações de caça-palavras (traço percorrendo letras, flip ou brilho) são opcionais, curtas e nunca carregam significado essencial. Evitar flashes e animação contínua.

## 10. PWA, cache e modo offline

### 10.1 Manifesto

Atualizar `public/manifest.json` com nome, nome curto, descrição, ícones locais e cores da nova identidade. O `start_url` deve abrir a tela de desafio diário. Usar orientação responsiva, salvo evidência de que bloquear orientação melhora o jogo. Preferir ícones PNG/SVG locais aprovados; validar suporte de ícone maskable nos navegadores alvo.

### 10.2 Service Worker

O Service Worker atual requer revisão antes de produção. Ele apaga caches de outras aplicações da mesma origem na ativação e usa uma estratégia ampla de cache de rede. A nova versão deve:

- usar nomes de cache próprios e versionados;
- apagar somente caches pertencentes ao aplicativo;
- pré-cachear apenas shell, estilos, módulos e ícones necessários;
- não armazenar respostas de `/api/`, sessões, ranking, palpites ou desafio;
- invalidar assets antigos sem excluir caches de outros aplicativos no mesmo domínio;
- apresentar estado offline explícito e deixar claro que o jogo competitivo exige conexão;
- retornar fallback offline apenas para navegação/shell conforme estratégia definida, nunca um resultado diário fictício.

O modo offline pode carregar o shell e permitir consulta a recursos estáticos. Não pode iniciar/confirmar resultado oficial sem servidor.

## 11. Segurança, privacidade e abuso

- Nunca colocar segredos, respostas futuras ou listas de respostas em `/public`.
- Validar no servidor tamanho, alfabeto, dicionário, estado da partida, máximo de tentativas e unicidade diária.
- Limitar taxa por sessão e endereço de rede com valores configuráveis, retornando `429`; respeitar proxies somente quando configurados de forma confiável.
- Aplicar limites a criação de sessões anônimas, atualização de apelido e leituras de ranking para reduzir spam.
- Normalizar e moderar apelidos antes de exibir; escapar saída no HTML e não inserir strings do usuário com `innerHTML`.
- Não registrar tokens, cookies, palpites ou resposta em logs de aplicação. Logs de acesso não devem incluir credenciais.
- Exigir HTTPS, cabeçalhos de segurança (CSP compatível com os módulos locais, `X-Content-Type-Options`, `Referrer-Policy`, política de frame adequada) e atualização regular das dependências.
- Cookie mutável deve ser `HttpOnly`, `Secure`, `SameSite=Lax`, com proteção contra CSRF por checagem de origem e métodos apropriados.
- Informar que o perfil é pseudônimo e vinculado ao dispositivo. Fornecer fluxo para alterar apelido e solicitar exclusão dos dados.
- Manter ranking como recurso casual sem prêmios até existir autenticação/mitigação mais robusta. Identificador por dispositivo pode ser apagado ou falsificado; limites por IP ajudam, mas não garantem uma pessoa/um perfil.
- Definir prazo de retenção e política de exclusão antes do lançamento público; não assumir retenção indefinida.

## 12. Conteúdo e dicionário

O código atual carrega categorias de arquivos JSON e coleta palavras válidas de cinco letras. Para cumprir o PRD:

1. Reestruturar entradas para explicitar `category`, `displayName`, `answerAllowed`, `guessAllowed` e comprimentos disponíveis.
2. Revisar a origem e licença dos bancos de palavras e a adequação editorial para português.
3. Manter conjuntos separados de respostas possíveis e palpites aceitos. Não publicar os arquivos de respostas em `public`.
4. Remover itens inválidos ou artificiais; a lista atual contém elementos fora do formato esperado, e não deve ser reutilizada sem auditoria.
5. Validar em CI/deploy JSON parseável, tamanho normalizado de 4–7, duplicatas, caracteres aceitos e disponibilidade de palavras por categoria/tamanho.
6. Separar corretamente palavras curtas válidas de entradas de comprimento diferente em vez de filtrá-las implicitamente.
7. Ter fallback de erro operacional claro quando a agenda ou o dicionário está inválido; não iniciar com uma palavra padrão de sucesso como se estivesse tudo correto.

## 13. Migração do código atual

O estado atual diverge substancialmente do [PRD.md](./PRD.md):

- `public/index.html`, `public/js/app.js` e `server/server.js` implementam lobby, salas e jogo 1v1 via Socket.IO.
- O motor `server/gameEngine.js` fixa o comprimento em cinco letras e não implementa agenda diária, perfil, persistência ou estatísticas.
- Os dicionários em `server/words/` são carregados pelo servidor e foram preparados para o jogo anterior.
- `public/sw.js` e `public/manifest.json` usam identidade e comportamento do produto antigo.
- `TECH_SPEC.md` descreve arquitetura Arena Cyber e protocolo multiplayer e não representa mais o produto principal.

Plano seguro:

1. Criar testes unitários para as regras reutilizáveis de avaliação, normalização e letras repetidas.
2. Extrair o motor de avaliação para aceitar comprimento variável e torná-lo independente do estado de sala.
3. Adicionar banco, migrações, sessão pseudônima, agenda diária e endpoints versionados.
4. Implementar fluxos do desafio e prática em uma nova interface responsiva, preservando temporariamente a versão antiga em branch/commit de referência.
5. Migrar manifesto, cache, acessibilidade, conteúdos e documentação.
6. Testar do início ao resultado com mais de um perfil e reinícios do servidor.
7. Só então decidir se `roomManager`, handlers Socket.IO, dependência `socket.io` e CSS Arena devem ser removidos ou mantidos em uma área separada.

Não misturar estado do jogo diário com `RoomManager`: salas e sockets são voláteis e não fornecem persistência de perfil ou idempotência necessária para o desafio diário.

## 14. Testes e critérios de aceite técnico

### 14.1 Unidade

- Normalização de caixa, acentos, Unicode, pontuação e comprimento.
- Avaliação com letras repetidas em combinações de posições.
- Vitória, derrota na sexta tentativa, partida em progresso e tentativa repetida.
- Seleção de desafio por data/fuso e validação da agenda.
- Cálculo de estatísticas, sequência e ordenação/empates do ranking.
- Sanitização/validação de apelido e serialização do resultado sem spoiler.

### 14.2 API e persistência

- Uma mesma data e perfil sempre retorna o mesmo desafio.
- A resposta secreta não aparece em respostas iniciais nem em erros.
- Uma segunda chamada concorrente não consome a mesma posição de tentativa duas vezes.
- A restrição diária única continua válida após reiniciar o servidor.
- Palpite inválido não consome tentativa; chamada repetida após finalização não altera o resultado.
- Prática não grava dados na tabela/estatísticas diárias.
- Resultados de outro perfil não são acessíveis alterando um ID no URL.
- Ranking é paginado, ordenado conforme regra e não revela identificadores privados.

### 14.3 Interface e acessibilidade

- Desktop e celular, com largura estreita e zoom de 200%, sem scroll horizontal.
- Entrada por teclado visual, teclado físico, Enter e Backspace sem duplicar envio.
- Foco visível, leitores de tela, mensagens de erro/status e estado final anunciados.
- Verificação manual de contraste para textos, células, foco e controles.
- Movimento reduzido, alto contraste e texto ampliado mantêm operação e legibilidade.
- Resultado compartilhado não inclui resposta nem palpites literais.

### 14.4 PWA e resiliência

- Instalação em navegadores compatíveis e inicialização correta pelo ícone instalado.
- Atualização de versão do Service Worker sem apagar caches de outras aplicações.
- APIs e dados do usuário nunca são servidos do cache offline.
- Queda de rede durante envio mostra falha e permite sincronizar/repetir sem duplicar tentativa.
- Servidor reiniciado não perde perfil/partida se o banco persistente estiver saudável.

## 15. Implantação e operação

- Configurar `PORT`, caminho do banco, fuso horário e limites via ambiente; validar valores no boot.
- No início, executar migrações como etapa explícita e falhar com log claro se não puder inicializar o banco.
- Separar logs operacionais de dados pessoais; incluir nível, timestamp e request ID.
- Criar backup automático e ensaiar restauração antes do lançamento.
- Não operar mais de um worker de escrita sobre SQLite sem coordenação; migrar a Postgres antes de escalar horizontalmente.
- Adicionar health check que verifica processo e banco sem revelar dados.
- Monitorar erros de API, latência, falhas de persistência, limites de taxa e rejeições inesperadas de palavras.
- Evitar analytics com palpites ou identificadores pessoais. As métricas do PRD devem ser agregadas e minimizadas.
- Configurar domínio HTTPS, política de CSP e origem única para frontend/API sempre que possível.

## 16. Fases técnicas

### Fase A — Base do jogo

- Testes da lógica e vocabulário revisado.
- Motor de avaliação generalizado para 4–7 letras.
- Agenda determinística e API diária sem exposição da resposta.

### Fase B — Persistência e perfis

- Banco, migrações, sessões pseudônimas, apelido opcional e limite de uma partida diária.
- Persistência e recuperação de progresso após recarregar ou reiniciar servidor.

### Fase C — Prática, estatísticas e ranking

- Sessões de prática isoladas, estatísticas diárias e ranking verificado.
- Rate limit, moderação, paginação e política de privacidade.

### Fase D — Interface e PWA

- Identidade moderna inspirada em caça-palavras, sistema de componentes, layouts responsivos e acessibilidade.
- Manifesto, Service Worker seguro, instalação e estados offline.

### Fase E — Validação de lançamento

- Testes completos, auditoria editorial, segurança básica, backup/restore, compatibilidade e testes com usuários.
- Revisar métricas e decisões ainda pendentes do PRD antes de lançar ranking público.

## 17. Decisões pendentes

1. Confirmar nome/marca do produto e paleta final após teste visual.
2. Confirmar fuso horário oficial do desafio diário.
3. Escolher provedor de hospedagem e confirmar se oferece volume persistente; isso determina SQLite ou Postgres.
4. Confirmar se o ranking será público por padrão ou opt-in e por quanto tempo manter os resultados.
5. Definir regras editoriais finais do vocabulário, acentos e nomes próprios.
6. Confirmar se o perfil sem conta pode ser perdido ao limpar o dispositivo ou se há requisito de recuperação.
7. Confirmar o destino do modo 1v1 antigo antes de remover arquivos ou dependências.

## 18. Referências internas

- [PRD.md](./PRD.md) — visão, regras, requisitos funcionais e hipóteses ainda a validar.
- [TECH_SPEC.md](./TECH_SPEC.md) — especificação anterior do duelo; deve ser atualizada ou arquivada quando esta arquitetura for aprovada.
- [server/server.js](./server/server.js) — servidor Express/Socket.IO atual.
- [server/gameEngine.js](./server/gameEngine.js) — motor atual, com comprimento fixo de cinco letras.
- [server/words/](./server/words/) — vocabulários existentes, ainda sujeitos a revisão e migração.
- [public/index.html](./public/index.html) e [public/js/app.js](./public/js/app.js) — interface e cliente atuais do modo 1v1.
- [public/sw.js](./public/sw.js) e [public/manifest.json](./public/manifest.json) — PWA atual, a ser revisada para a nova identidade e política de cache.
