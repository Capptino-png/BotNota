# BotNota/Notabot - ciclo de conexao inspirado no HiveMind

A branch muda apenas a conexao. Nao altera index.js nem os comandos e nao toca no HiveMind.

## Alteracoes
- O codigo de pareamento espera o evento QR/readiness, em vez do timer de 3 segundos.
- Garante apenas uma tentativa de reconexao agendada por geracao de socket e limita tentativas.
- 401: credenciais invalidas, bloqueia; 440: conflito, bloqueia; 515: restart de protocolo; 405: falha de handshake, retry limitado.
- ONLINE somente quando connection=open.
- Nao apaga sessoes e remove NODE_TLS_REJECT_UNAUTHORIZED=0.
- Completa 55 para numeros brasileiros com 10 ou 11 digitos.

## Termux

Execute na copia instalada sob o diretorio privado do Termux:

    cd ~/notabot &&
    mkdir -p core scripts &&
    curl -fL --retry 2 https://raw.githubusercontent.com/Capptino-png/BotNota/feat/termux-connection-hivemind-pattern/core/connection-policy.js -o core/connection-policy.js &&
    curl -fL --retry 2 https://raw.githubusercontent.com/Capptino-png/BotNota/feat/termux-connection-hivemind-pattern/scripts/apply-termux-connection-patch.js -o scripts/apply-termux-connection-patch.js &&
    node scripts/apply-termux-connection-patch.js .

O instalador verifica trechos, cria backup de connect.js e executa node --check antes de alterar. Se o arquivo local divergiu, aborta sem substituir connect.js.

Depois de confirmar dependencias, inicie apenas um processo:

    cd ~/notabot && node connect.js sim

Nao execute o loop de start.sh junto com esse comando, nem duas sessoes da mesma conta no Render/Termux.

## Problemas separados

O package.json publicado no GitHub tem dependencias vazias, enquanto a copia do Termux pode ter varias dependencias. Nao substitua o package.json local por esse arquivo vazio.

O sharp@0.32.6 nao possui libvips precompilado na combinacao Android ARM64 demonstrada; npm install --ignore-scripts pode evitar a instalacao, mas nao garante funcionamento de pacotes nativos. O patch de conexao nao resolve esse problema.

O fork @fadzzzslebew/baileys nao foi testado com uma sessao real. Se nao emitir QR/readiness, o pareamento ficara aguardando, exigindo uma adaptacao especifica. Erro 405 pode envolver versao de protocolo, rede, numero ou biblioteca.

## Seguranca

O repositorio publico ainda contem arquivos de sessao do WhatsApp e um certificado .p12 versionados. Atualizar gitignore nao remove arquivos ja rastreados nem historico. Revogue/rotacione credenciais potencialmente expostas, retire segredos do indice e avalie saneamento do historico. Nunca suba auth, certificados ou dados de usuarios.

## Verificacao

    node --check connect.js
    node --test tests/connection-policy.test.cjs
