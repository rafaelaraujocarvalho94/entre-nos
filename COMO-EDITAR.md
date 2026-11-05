# Como editar o Entre Nós

Tudo o que aparece escrito no app está na pasta `conteudo/`. Dá para editar direto no site do GitHub, sem instalar nada.

## Passo a passo no GitHub

1. Abra o arquivo, por exemplo `conteudo/textos.json`.
2. Clique no lápis (**Edit this file**).
3. Mude só o texto que está entre aspas.
4. Clique em **Commit changes** e confirme.
5. Em cerca de um minuto o site atualiza.

Se algo estiver errado no arquivo, o site **não** muda e continua na versão anterior. O GitHub manda um e-mail avisando. Para ver o motivo: aba **Actions**, clique na execução com o X vermelho e abra **Conferir o conteúdo**. A mensagem diz o arquivo, o lugar e o que corrigir.

## Regras do arquivo

Os arquivos são JSON. Quatro cuidados resolvem quase tudo:

- O texto fica entre aspas retas: `"assim"`. Dentro do texto, use aspas curvas: `“assim”`.
- Itens de uma lista ou de um bloco são separados por vírgula, mas **não** existe vírgula depois do último.
- Cada texto fica numa linha só. Não aperte Enter no meio de um texto.
- Não apague as chaves `{ }`, os colchetes `[ ]` nem os nomes antes dos dois-pontos (como `"titulo":`).

Dentro dos textos:

- Negrito: `<strong>palavra</strong>`. Nenhuma outra marcação funciona.
- `{A}` e `{B}` viram os nomes do casal. `{OUTRO}` vira o nome de quem não está escrevendo.
- Não use travessão (—) nos textos do app. Troque por vírgula, dois-pontos, ponto ou parênteses. Os versículos podem ter travessão, porque são citação.

## O que fica em `conteudo/textos.json`

| Bloco | O que é |
| --- | --- |
| `app` | Nome do app e versão mostrada em Sobre e no menu (`"beta 1"`). |
| `destaque` | O versículo em destaque na tela inicial. |
| `preparacao` | A tela antes de toda dinâmica: texto, versículo e os itens para marcar. |
| `como_funciona` | A tela Como funciona e as instruções para instalar no celular. |
| `sobre` | A tela Sobre. Preencha `responsavel` e `contato` (e-mail ou link) quando quiser mostrar. `formulario_beta` é o link do formulário de opinião dos testes (precisa começar com `https://`). |
| `privacidade` | A tela Privacidade. Quando mudar o texto, atualize `atualizado_em`. |
| `doacao` | A tela Doar. Veja abaixo. |
| `compartilhar` | A mensagem enviada quando alguém toca em Compartilhar com outro casal. |
| `aviso_biblia` | O aviso de direitos da NVI. É obrigatório enquanto o app usar a NVI. |

Campos vazios (`""`) simplesmente não aparecem no app.

## Dados de doação

Enquanto `chave_pix` e `pix_copia_e_cola` estiverem vazios, a tela Doar mostra só a frase de `texto_sem_dados`.

Para publicar os dados da igreja:

1. No app do banco da igreja, entre na área PIX, escolha **Receber** (ou Cobrar), gere um QR Code **sem valor** e copie o código **copia e cola**. Ele começa com `000201`.
2. Cole esse código em `pix_copia_e_cola`. O app desenha o QR Code a partir dele.
3. Preencha também `recebedor` (nome da igreja como aparece no banco), `cnpj`, `banco` e `chave_pix`.
4. Salve. A conferência automática verifica se o código está inteiro. Se faltar um pedaço, a publicação para e avisa.

`apoio_desenvolvedor_link` é opcional: um link separado para quem quiser apoiar quem desenvolve o app. Vazio, ele não aparece.

## As dinâmicas (`conteudo/dinamicas/`)

Cada dinâmica é um arquivo. A ordem em que aparecem no app está em `lista.json`.

### Partes da dinâmica

| Campo | O que é |
| --- | --- |
| `id` | Nome do arquivo, sem `.json`: só letras minúsculas sem acento e números. Não mude depois de publicado. |
| `versao` | Número da estrutura. Veja "Quando aumentar a versão". |
| `titulo`, `tempo`, `descricao` | Aparecem nas listas. |
| `capa` | Desenho da capa: `cordao`, `cabo`, `mapa`, `casa`, `sol` ou `aneis`. |
| `avisos_preparacao` | Itens extras na preparação, só desta dinâmica (opcional). |
| `texto_resumo` | Frase no topo do resumo final (opcional). |
| `data` | O campo de data no fim: `rotulo` (a pergunta) e `curto` (como aparece em Combinados, por exemplo "Retomar em"). `dica` é opcional. |
| `combinado` | O que aparece em Nossos combinados: `rotulo`, `descricao` e as `etapas` que formam o combinado. Não pode ser uma etapa privada. |
| `fechamento` | Versículo do fim, no resumo. |
| `etapas` | A lista de etapas, na ordem. |

### Partes de cada etapa

| Campo | O que é |
| --- | --- |
| `id`, `titulo`, `tempo` | Identificação da etapa. O `id` usa letras minúsculas sem acento. |
| `tipo` | `individual` (cada um escreve sem ver o do outro), `a_quatro_maos` (os dois escrevem juntos) ou `leitura` (só leitura, sem escrever). |
| `instrucao` | Texto lido em voz alta antes de escrever. |
| `versiculos` | Lista de `{ "texto": "...", "ref": "..." }`. |
| `regras` | Lista de lembretes curtos (opcional). |
| `pontos` | Os itens de uma etapa de leitura. |
| `campos` | O que cada um escreve. Veja abaixo. |
| `em_voz_alta` | Texto mostrado depois da revelação. |
| `pergunta` | "Para puxar a conversa", depois da revelação (opcional). |
| `privada` | `true` quando a etapa é apagada no fim e nunca entra no resumo nem no PDF. |
| `sensivel` | `true` mostra o botão "Prefiro não falar disso hoje". |
| `leitura_propria` | `true` quando cada um lê o próprio texto (como no pedido de perdão). |
| `nota` | Mostra a nota de 0 a 10 depois da revelação. `rotulo` é a frase da nota. |
| `depende_de` | A etapa é pulada para quem não tem a que responder (por exemplo, não houve mágoa contada). `texto` explica o pulo. |

### Partes de cada campo

| Campo | O que é |
| --- | --- |
| `id` | Nome do campo dentro da etapa. |
| `tipo` | `linha` (texto curto), `texto` (texto maior), `escolha` (opções) ou `escala` (nota de 0 a 10 por área). |
| `rotulo` | A pergunta. |
| `exemplo` | O texto clarinho dentro do campo. |
| `minimo` | Número mínimo de letras (padrão: 10). |
| `opcional` | `true` deixa o campo em branco. |
| `par` | Liga dois campos opcionais: se um for preenchido, o outro também precisa ser. |
| `opcoes` | Lista fixa de opções de uma `escolha`. |
| `opcoes_de` | Opções tiradas de respostas de uma etapa anterior. |
| `contexto` | Mostra, acima do campo, o que foi escrito numa etapa anterior. |
| `areas` | As áreas de uma `escala`. |

## Quando aumentar a versão

- Mudou só texto (título, instrução, versículo, rótulo, exemplo)? Não precisa mexer em `versao`.
- Mudou a estrutura (incluiu, tirou ou trocou a ordem de etapas ou campos, ou mudou um `id`)? Aumente `versao` (1 para 2, por exemplo). Quem estiver no meio dessa dinâmica recomeça, e o app avisa. As dinâmicas já concluídas continuam guardadas.

## Criar uma dinâmica nova

1. Copie um arquivo parecido e salve com o novo nome, por exemplo `gratidao.json`.
2. Mude o `id` para `gratidao` e ajuste os textos e as etapas.
3. Inclua `"gratidao"` em `lista.json`, na posição em que deve aparecer.
4. Salve. A conferência automática avisa se faltar alguma coisa.

## Versículos

- Use o texto da NVI 2023 exatamente como está na Bíblia (o YouVersion tem essa edição).
- Quando usar só parte de um versículo, marque o corte com `…`.
- O uso gratuito da NVI permite até 500 versículos, menos de 25% do texto do app e nenhum livro completo, sempre com o aviso de direitos. Hoje o app está bem abaixo disso.
- Depois de mudar versículos, a lista para revisão pode ser gerada de novo com `python3 ferramentas/listar_versiculos.py`.
