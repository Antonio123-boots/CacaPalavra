# PRD — Jogo Casual de Adivinhação de Palavras

**Nome provisório:** Termo Duelo  
**Versão:** 2.0 — rascunho para validação  
**Data:** 27 de outubro de 2026  
**Plataforma:** Web responsiva e Progressive Web App (PWA)  
**Idioma inicial:** Português

## 1. Resumo do produto

O produto é um jogo casual de palavras, gratuito e sem anúncios, para jogar no navegador de celulares e computadores. O modo principal oferece um desafio diário solo: todos recebem a mesma palavra do dia e têm até seis tentativas para descobri-la. A palavra diária pode ter de 4 a 7 letras, conforme uma programação comum a todos.

O jogo também oferece prática por categoria e tamanho de palavra. Perfis com apelido, estatísticas e ranking permitem acompanhar resultados sem exigir nome real ou perfil em rede social. O compartilhamento do resultado não pode revelar a palavra secreta.

Este documento atualiza o PRD anterior, que descrevia prioritariamente uma corrida multiplayer 1v1. Como a prioridade respondida agora é o desafio diário solo, este rascunho recomenda deixar o 1v1 fora do MVP e reavaliar sua inclusão depois.

## 2. Pesquisa de referência e implicações

### 2.1 Padrões observados

- **Palpite com feedback e limite de tentativas:** o Wordle oficial apresenta uma palavra de cinco letras, até seis tentativas e um novo quebra-cabeça por dia. É uma referência para regras simples e uma sessão curta. O produto proposto amplia os tamanhos para 4–7 letras, mantendo seis tentativas como regra inicial.
- **Pistas por proximidade semântica:** o Contexto usa uma abordagem diferente: após cada palpite, informa o quão próximo ele está da resposta. Isso demonstra uma alternativa para variação futura, mas adicionar essa mecânica ao MVP aumentaria a complexidade e exigiria vocabulário/modelo próprios.
- **Portfólio de desafios:** a página de NYT Games apresenta formatos diferentes de jogos de palavras e lógica, para diferentes níveis de habilidade. Isso apoia a separação entre um modo principal simples e práticas temáticas opcionais, em vez de colocar todas as variantes no mesmo fluxo.
- **Desafio compartilhado:** uma palavra diária igual para todos torna os resultados comparáveis. Para preservar essa propriedade, as categorias e tamanhos selecionáveis ficam no modo de prática; não mudam a palavra do desafio diário.
- **Acessibilidade como parte das regras:** a WCAG 2.2 recomenda contraste de pelo menos 4,5:1 para texto comum, contraste de 3:1 para componentes e estados visuais importantes, e operação por teclado para funcionalidades que não dependem de movimento livre. O jogo não deve depender apenas da cor para explicar o resultado.
- **Retenção sem pressão excessiva:** desafio diário, histórico e sequência são hipóteses de engajamento a validar, não garantias de retenção. O usuário deve poder jogar sem notificações insistentes, punições por perder uma sequência ou necessidade de jogar em horário específico.

### 2.2 Implicações para o produto

1. Manter um único desafio diário, com a mesma resposta para todos os jogadores naquele dia.
2. Separar o resultado competitivo do desafio diário da prática por tema ou comprimento.
3. Dar feedback imediato e compreensível após cada tentativa, inclusive para letras repetidas.
4. Compartilhar uma representação compacta do resultado sem letras digitadas nem resposta.
5. Tratar estatísticas e ranking como recursos opcionais; não bloquear o jogo atrás de cadastro.
6. Projetar teclado, contraste, símbolos de feedback e animações com acessibilidade desde o MVP.
7. Validar as hipóteses com testes de usabilidade e métricas observáveis após o lançamento.

### 2.3 Limites da pesquisa

As referências abaixo fundamentam padrões de produto e critérios de acessibilidade, mas não substituem pesquisa com o público deste jogo. Os valores de sucesso do MVP ainda precisam ser medidos; este PRD não presume taxas de retenção ou conversão.

## 3. Visão, objetivos e não objetivos

### 3.1 Visão

Oferecer uma pausa diária rápida e agradável para descobrir palavras em português, seja sozinho, seja comparando resultados de forma leve e sem spoilers.

### 3.2 Objetivos do MVP

- Permitir iniciar e concluir o desafio diário com poucas etapas.
- Garantir que a palavra do dia seja igual para todos e só possa ser enviada uma vez por perfil.
- Oferecer prática sem ranking, com categorias existentes e palavras de 4–7 letras.
- Permitir perfil pseudônimo por apelido, estatísticas e ranking diário.
- Permitir compartilhar o resultado sem revelar a resposta.
- Funcionar em navegadores móveis e desktop e poder ser instalado como PWA.
- Não exibir anúncios nem cobrar para jogar.
- Atender aos requisitos de acessibilidade definidos neste documento.

### 3.3 Não objetivos do MVP

- Corrida 1v1 em tempo real, salas privadas e matchmaking.
- Aplicativo nativo distribuído por lojas.
- Mensagens privadas, lista de amigos, avatares ou integração com redes sociais.
- Notificações obrigatórias, moedas, recompensas pagas ou anúncios.
- Modo offline competitivo com envio posterior de resultados.

## 4. Público e necessidades

### Jogador casual

Quer abrir o jogo no intervalo, entender as regras sem tutorial longo e concluir uma partida em poucos minutos.

### Jogador de palavras

Quer consultar o resultado, acompanhar sua evolução e comparar o desempenho sem que o ranking dependa de pagar ou jogar por mais tempo.

### Jogador que prefere temas

Quer praticar com vocabulário de uma categoria familiar, sem que isso altere o desafio diário compartilhado.

## 5. Jornada principal

1. A pessoa abre o jogo no navegador ou pela PWA.
2. A tela inicial mostra o desafio do dia, seu tamanho e se ainda está disponível.
3. Se necessário, vê instruções curtas sobre tentativas, feedback e teclado.
4. Digita uma palavra pelo teclado físico ou virtual e envia o palpite.
5. Recebe o feedback por letra e continua até acertar ou esgotar as seis tentativas.
6. Ao terminar, vê a resposta, o resultado e as ações para compartilhar, consultar estatísticas ou abrir o ranking.
7. Opcionalmente, escolhe um tema e comprimento para praticar sem afetar o resultado diário.

## 6. Regras do jogo

### 6.1 Desafio diário

- Existe uma única palavra principal por dia, igual para todos os jogadores.
- O comprimento diário varia entre 4 e 7 letras de acordo com uma programação definida antes do lançamento.
- O jogador tem seis tentativas para adivinhar a palavra.
- O desafio só pode ser concluído uma vez por perfil naquele dia.
- O ciclo diário usa um fuso horário oficial, proposto inicialmente como `America/Sao_Paulo`; a escolha precisa ser confirmada antes do lançamento.
- A resposta é revelada após a conclusão ou após a sexta tentativa.

### 6.2 Feedback por letra

- **Correta:** a letra existe na resposta e está na posição certa.
- **Presente:** a letra existe na resposta, mas em outra posição.
- **Ausente:** a letra não aparece na resposta ou as ocorrências disponíveis já foram contabilizadas.
- O cálculo deve tratar corretamente letras repetidas.
- O feedback deve ser comunicado por cor e também por símbolo, texto acessível ou anúncio para tecnologia assistiva; cor isolada não é suficiente.
- A interface deve informar claramente quando uma tentativa está incompleta ou não pertence ao vocabulário aceito, sem consumir uma tentativa.

### 6.3 Prática por tema e comprimento

- A prática permite escolher entre 4, 5, 6 e 7 letras e as categorias disponíveis.
- Categorias iniciais propostas, preservadas do PRD anterior: **Geral**, **Cinema e Séries**, **Esportes** e **Cultura Pop e Games**.
- A prática não altera o resultado do desafio diário nem o ranking diário.
- O produto deve deixar visível quando a pessoa está na prática, e não no desafio oficial.

### 6.4 Idioma e vocabulário

- O idioma inicial é português.
- A lista de respostas deve ser revisada para evitar palavras ambíguas, grafias controversas, conteúdo ofensivo ou nomes próprios inadequados ao modo geral.
- As regras de acentuação e normalização devem ser consistentes entre resposta, teclado e dicionário.
- O jogo deve aceitar apenas palavras válidas do tamanho da rodada; a política para flexões verbais, regionalismos, siglas e nomes próprios deve ser documentada para cada categoria.

## 7. Requisitos funcionais

### RF-01 — Iniciar o desafio diário

**Prioridade:** MVP  
Ao abrir o jogo, a pessoa consegue iniciar o desafio do dia sem criar conta. A tela indica o comprimento da palavra, o número de tentativas disponíveis e o estado do desafio.

**Critérios de aceite**
- Um jogador que abre o jogo pela primeira vez consegue fazer um palpite sem cadastro.
- O mesmo desafio é usado por todos os jogadores na mesma data oficial.
- A resposta secreta não é enviada ao navegador antes do fim da partida.

### RF-02 — Enviar e validar palpites

**Prioridade:** MVP  
O jogador consegue preencher e enviar palavras por teclado físico ou virtual.

**Critérios de aceite**
- O envio só ocorre quando todas as posições estão preenchidas.
- Entrada inválida ou de comprimento incorreto gera mensagem clara e não consome tentativa.
- Cada palpite aceito apresenta o feedback de todas as letras, com contagem correta de letras repetidas.
- O jogo encerra ao acertar ou após seis tentativas.

### RF-03 — Disponibilizar prática temática

**Prioridade:** MVP  
O jogador consegue iniciar uma partida de prática e escolher uma categoria e um comprimento de 4–7 letras.

**Critérios de aceite**
- A prática é identificada visualmente e não altera as estatísticas ou o ranking do desafio diário.
- A seleção só apresenta combinações de categoria e tamanho com vocabulário disponível.
- Se não houver palavras válidas para uma seleção, o sistema informa o problema e oferece opções disponíveis, sem iniciar uma partida incorreta.

### RF-04 — Criar perfil pseudônimo

**Prioridade:** MVP  
O jogador pode escolher um apelido para aparecer em estatísticas compartilhadas e no ranking, sem fornecer nome real, e-mail ou foto.

**Critérios de aceite**
- Jogar o desafio diário não depende de criar perfil.
- O apelido tem limites de tamanho e caracteres e não pode conter conteúdo ofensivo.
- O identificador do perfil não é o apelido em si; apelidos repetidos devem ser tratados sem confundir contas.
- A interface informa quais dados são públicos e permite alterar ou remover o apelido.

### RF-05 — Registrar estatísticas

**Prioridade:** MVP  
O perfil pode consultar partidas diárias jogadas, partidas vencidas, distribuição de tentativas e sequência atual/máxima.

**Critérios de aceite**
- Partidas de prática não entram nas estatísticas do desafio diário.
- Uma sequência só aumenta quando desafios diários consecutivos são concluídos conforme a regra de vitória definida.
- A interface explica como uma sequência é contada e evita tratar uma sequência perdida como punição.
- A disponibilidade e recuperação das estatísticas em outro dispositivo devem ser informadas; a proposta inicial sem cadastro é manter o perfil associado ao dispositivo.

### RF-06 — Compartilhar resultado sem spoiler

**Prioridade:** MVP  
Após terminar o desafio diário, o jogador pode copiar ou compartilhar uma representação compacta do resultado.

**Critérios de aceite**
- O texto compartilhado não contém a resposta nem as letras tentadas.
- O resultado mostra o número do desafio/data, tentativas usadas e uma grade com estados das letras.
- O jogador pode cancelar ou editar o compartilhamento antes de publicá-lo.
- O compartilhamento só fica disponível depois que o desafio termina.

### RF-07 — Exibir ranking diário

**Prioridade:** MVP  
O jogador pode consultar um ranking do desafio do dia, usando apelidos e resultados do mesmo quebra-cabeça.

**Critérios de aceite**
- O ranking não exibe dados pessoais além do apelido escolhido e dos dados de jogo necessários.
- A classificação proposta prioriza quem resolveu o desafio e, entre pessoas que resolveram, quem usou menos tentativas; resultados iguais empatam.
- A regra de classificação fica visível e não usa tempo de resposta como critério.
- Resultados não verificados pelo servidor não entram no ranking oficial.
- Deve haver proteção básica contra envios duplicados e automação abusiva.

### RF-08 — Instalar e iniciar como PWA

**Prioridade:** MVP  
O jogo pode ser instalado por navegadores compatíveis e apresenta uma opção discreta de instalação.

**Critérios de aceite**
- O manifesto contém nome, ícones e cores do produto.
- A instalação e a interface não bloqueiam o jogo com um aviso obrigatório.
- Recursos estáticos podem ser carregados do cache, mas o desafio oficial, o envio de resultado e o ranking requerem conexão.
- Se a conexão cair durante uma partida oficial, o jogo preserva o estado local e informa se o resultado ainda precisa ser confirmado pelo servidor.

### RF-09 — Preferências de acessibilidade

**Prioridade:** MVP  
O jogo pode ser operado com teclado, toque e tecnologia assistiva, e respeita preferências de movimento e som.

**Critérios de aceite**
- Todas as ações principais têm operação por teclado e foco visível.
- O estado das letras não é comunicado apenas por cor.
- Texto comum atende à meta de contraste de 4,5:1; texto grande, 3:1; componentes e estados visuais importantes, 3:1 contra cores adjacentes, conforme WCAG 2.2.
- Animações podem ser reduzidas ou desativadas; sons, se adicionados, ficam desligados por padrão ou têm controle evidente.
- Mensagens de erro, vitória e derrota são anunciadas de forma acessível.

## 8. Requisitos não funcionais

- **Compatibilidade:** versões atuais de Chrome, Safari, Firefox e Edge em Android, iOS, Windows e macOS.
- **Responsividade:** tabuleiro e teclado utilizáveis em telas pequenas, sem rolagem horizontal.
- **Desempenho:** feedback de um palpite aceito aparece sem demora perceptível; o carregamento inicial deve ser medido em dispositivos móveis e conexões reais.
- **Confiabilidade:** o servidor é a fonte de verdade da palavra e dos resultados do ranking.
- **Privacidade:** coletar apenas os dados necessários ao perfil pseudônimo e ao jogo; explicar retenção, visibilidade e exclusão antes do lançamento do ranking.
- **Segurança:** validar no servidor a palavra diária, palpites, tentativa restante e unicidade do resultado diário; limitar envios abusivos.
- **Conteúdo:** armazenar palavras por categoria e comprimento e revisar listas antes de publicação.
- **Disponibilidade offline:** o cache pode carregar a estrutura do aplicativo; não anunciar o desafio diário como concluído sem confirmação online.

## 9. Métricas de sucesso

As metas quantitativas serão definidas depois de uma versão de teste, sem presumir resultados antes de obter uma linha de base.

- **Ativação:** proporção de visitantes que enviam o primeiro palpite do desafio diário.
- **Conclusão:** proporção de partidas diárias iniciadas que terminam em acerto ou em seis tentativas.
- **Retorno:** proporção de jogadores que volta em outro dia e em até sete dias.
- **Compartilhamento:** proporção de desafios concluídos com uso da ação de compartilhar.
- **Uso da prática:** quantidade de partidas de prática iniciadas e concluídas, acompanhada separadamente do modo diário.
- **Qualidade:** falhas ao carregar/enviar resultados, palavras rejeitadas inesperadamente e problemas reportados de acessibilidade.
- **Confiança:** incidentes de resposta revelada antes do fim, resultados duplicados ou ranking incorreto.

## 10. Escopo e fases

### MVP

1. Desafio diário solo compartilhado, com seis tentativas e palavras de 4–7 letras.
2. Validação e feedback por letra.
3. Prática por categorias e comprimentos.
4. Perfil por apelido e estatísticas.
5. Compartilhamento sem spoilers.
6. Ranking diário pseudônimo com resultados verificados.
7. PWA responsiva e requisitos básicos de acessibilidade.

### Pós-MVP

- Reavaliar a corrida 1v1, salas privadas e matchmaking do PRD anterior.
- Desafios adicionais com calendário ou conjuntos de palavras temáticos.
- Sincronização do perfil entre dispositivos, caso se decida adotar autenticação.
- Idiomas adicionais, torneios, notificações e recursos sociais, somente após validar necessidade e privacidade.

## 11. Hipóteses e decisões ainda a confirmar

1. **Modo 1v1:** não houve resposta explícita sobre manter o modo multiplayer no MVP. Recomendação registrada: priorizar o solo diário e deixar o 1v1 para uma fase futura, reaproveitando a implementação atual se fizer sentido.
2. **Identidade sem conta:** a escolha foi perfil por apelido. Proposta de MVP: identificador pseudônimo persistido no dispositivo, sem e-mail ou nome real. Isso não oferece recuperação automática nem sincronização entre dispositivos.
3. **Ranking:** a proposta é um ranking diário por quebra-cabeça, com acertos ordenados por tentativas e empates compartilhados. Regras anti-abuso e moderação de apelidos precisam ser definidas antes de publicar ranking.
4. **Tamanhos variáveis:** proposta de usar um tamanho programado no desafio diário e oferecer escolha de 4–7 letras na prática. Assim, todos continuam resolvendo a mesma palavra diária.
5. **Fuso horário:** confirmar `America/Sao_Paulo` como referência para a troca do desafio.
6. **Vocabulário:** revisar o conteúdo atual das categorias e aprovar critérios editoriais para respostas e palpites válidos.
7. **Estatísticas e privacidade:** decidir prazo de retenção dos resultados, processo de exclusão de perfil e dados exibidos publicamente.
8. **Metas de lançamento:** estabelecer valores-alvo para as métricas após testes com usuários e uma linha de base.

## 12. Referências

- The New York Times Games, [Wordle](https://www.nytimes.com/games/wordle/index.html) — página oficial que descreve o formato de até seis tentativas e um desafio novo por dia.
- Contexto, [jogo oficial](https://www.contexto.me/) — referência de mecânica baseada em proximidade semântica entre palpites e resposta.
- The New York Times Games, [Connections](https://www.nytimes.com/games/connections) — página do portfólio de jogos que descreve a variedade de desafios diários e níveis de habilidade.
- W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) — recomendações de acessibilidade para conteúdo web.
- W3C, [Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — critérios de contraste mínimo.
- W3C, [Understanding Success Criterion 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) — contraste de componentes e estados visuais.
- W3C, [Understanding Success Criterion 2.1.1: Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) — operação por teclado.
- Documentação do projeto: [TECH_SPEC.md](./TECH_SPEC.md) — arquitetura técnica existente; deve ser revisada quando as decisões de produto forem aprovadas.
