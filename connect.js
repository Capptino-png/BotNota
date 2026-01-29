process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { 'default': makeWASocket, useMultiFileAuthState, makeInMemoryStore, DisconnectReason, WAGroupMetadata, relayWAMessage, MediaPathMap, mentionedJid, processTime, MediaType, MessageType, Presence, Mimetype, Browsers, delay, fetchLatestBaileysVersion, MessageRetryMap, extractGroupMetadata, generateWAMessageFromContent, proto, otherOpts, makeCacheableSignalKeyStore, PHONENUMBER_MCC, isJidNewsletter, isJidBroadcast, isJidStatusBroadcast } = require('@fadzzzslebew/baileys');

const { LoggerB, Boom, AssemblyAI, axios, fs, cheerio, crypto, util, randomBytes, emoji, P, NodeCache, linkfy, request, ms, FileType, os, ffmpeg, fetch, exec, spawn, moment, colors, readline, execSync } = require('./exports.js');

const { addComandosId, deleteComandos, getComandoBlock, getComandos, addComandos, tabela, destrava, destrava2, mess, psycatgames, vyroEngine, linguagem, getInfo, writeExifImg, writeExif, countDays, timeDate, obeso, capitalizeFirstLetter, simih, TimeCount, getBuffer, fetchJson, fetchText, formatNumberDecimal, generateMessageID, convertBytes, getGroupAdmins, getMembros, isFiltered, addFilter, chyt, getExtension, getRandom, convertSticker, nit, supre, extractMetadata, addBanned, unBanned, BannedExpired, cekBannedUser, formatDateOriginal, validmove, setGame, whatMusicAr, palavrasANA, quizanimais, enigmaArchive, garticArchives, Sticker } = require('./exports.js');

const { images, config, creds, countMessage, sotoy, definitions, daily, muted, premium, ban, limitefll, joguinhodavelhajs, ads, joguinhodavelhajs2, grupos, aluguel, chaves, anotar, antispam, Limit_CMD, advices, tools, level2, packname, namoro1, namoro2 } = require('./exports.js');

const API_URL = creds["APIs"].website;

const { extractAcronymFromCity, DLT_FL, getFileBuffer, shuffle, sleep, sendPoll, enviarfiguUrl, listCommands, fuzzySimilarity, extractDDD, extractStateFromNumber, extractStateFromDDD, ANT_LTR_MD_EMJ, date, hora, time, sayLog, inputLog, infoLog, successLog, errorLog, warningLog } = require('./exports.js');

var qrcode = "./arquivos/database/qr-code";
const usePairingCode = process.argv.includes('sim');

if(!usePairingCode && !fs.existsSync(`${qrcode}/creds.json`)) console.log(colors.yellow("- Aviso: Se voce nao estiver outro aparelho em maos para realizar a leitura do qr-code, voce usar a 2 opcao seria ela ( sh start.sh sim ), sem os parenteses e voce conectara com codigo de emparelhamento.\n") + "–");

function collectNumbers(inputString) {
    return inputString.replace(/\D/g, '');
}

const originalConsoleInfo = console.info;
console.info = function () {
    const message = util.format(...arguments);
    const forbiddenStrings = ["Closing session: SessionEntry", "Removing old closed session: SessionEntry {", "Another forbidden string", "Closing stale open session for new outgoing prekey bundle"];
    if (forbiddenStrings.some(msg => message.includes(msg))) return;
    originalConsoleInfo.apply(console, arguments);
};

const store = makeInMemoryStore({ logger: P().child({ level: "silent", stream: "store" }) });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const msgRetryCounterCache = new NodeCache();

async function startConnect() {
    const { state, saveCreds } = await useMultiFileAuthState(qrcode);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    async function getMessage(key) {
        if (!store) return proto.Message.fromObject({});
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg ? msg.message : undefined;
    }

    let pairingNumber = null;
    if(usePairingCode && !state.creds.registered) {
        console.log('\n=== CONFIGURACAO DE PAREAMENTO ===\n');
        const phoneNumber = await question("Digite seu numero (com DDD, ex: 13982189399): ");
        
        if (!phoneNumber) {
            console.log('ERRO: Numero de telefone invalido!');
            process.exit(0);
        }
        
        pairingNumber = collectNumbers(phoneNumber);
        
        if (pairingNumber.length < 10) {
            console.log('ERRO: Numero muito curto! Use: DDD + numero (min. 10 digitos)');
            process.exit(0);
        }
        
        console.log(`OK: Numero configurado: ${pairingNumber}`);
        console.log('Preparando conexao...\n');
    }

    const yurizin = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
        },
        browser: ['Ubuntu', 'Chrome', '110.0'],
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(message?.interactiveMessage);
            if (requiresPatch) {
                message = {viewOnceMessage: {message: {messageContextInfo: {deviceListMetadataVersion: 2, deviceListMetadata: {}}, ...message}}};
            }
            return message;
        },
        keepAliveIntervalMs: 60 * 1000,
        shouldSyncHistoryMessage: () => false,
        getMessage,
        msgRetryCounterCache
    });

    if (usePairingCode && !state.creds.registered && pairingNumber) {
        let codeRequested = false;
        setTimeout(async () => {
            if (!yurizin.authState.creds.registered && !codeRequested) {
                codeRequested = true;
                try {
                    console.log('Solicitando codigo de pareamento...\n');
                    const code = await yurizin.requestPairingCode(pairingNumber);
                    console.log('===================================');
                    console.log('     CODIGO:', code);
                    console.log('===================================\n');
                    console.log('INSTRUCOES:');
                    console.log('1. Abra o WhatsApp no celular');
                    console.log('2. Toque em "Aparelhos conectados"');
                    console.log('3. Toque em "Conectar aparelho"');
                    console.log('4. Digite o codigo acima');
                    console.log('Voce tem 60 segundos!\n');
                } catch (error) {
                    console.log('ERRO ao solicitar codigo:', error.message);
                    if (error.message.includes('not-authorized')) {
                        console.log('DICA: Tente limpar a pasta qr-code e executar novamente');
                    }
                    process.exit(1);
                }
            }
        }, 3000);
    }

    yurizin.ev.process(async(events) => {
        if(events["connection.update"]) {
            const update = events["connection.update"];
            const { connection, lastDisconnect, isNewLogin, qr } = update;
            const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode;

            if (isNewLogin) {
                console.log('\nCodigo confirmado! Pareamento aceito!');
                console.log('Finalizando configuracao...');
            }

            switch (connection) {
                case 'close':
                    if(shouldReconnect) {
                        if(shouldReconnect == 401) {
                            console.log("ERRO: Sessao invalidada. Limpando dados...");
                            try { 
                                await fs.emptyDir(qrcode); 
                                await fs.remove(qrcode); 
                            } catch(e) {}
                            console.log("Execute novamente: sh start.sh sim");
                            process.exit(0);
                        } else if(shouldReconnect == 408) {
                            console.log("Timeout. Reconectando...");
                            setTimeout(() => startConnect(), 3000);
                        } else if(shouldReconnect == 428) {
                            console.log("Conexao perdida. Reconectando...");
                            setTimeout(() => startConnect(), 3000);
                        } else if(shouldReconnect == 440) {
                            console.log("ERRO: Codigo expirou! Execute novamente.");
                            try { 
                                await fs.emptyDir(qrcode); 
                                await fs.remove(qrcode); 
                            } catch(e) {}
                            process.exit(0);
                        } else {
                            console.log(`Conexao fechada [${shouldReconnect}]:`, lastDisconnect?.error?.message || 'Erro desconhecido');
                            setTimeout(() => startConnect(), 5000);
                        }
                    }
                    break;

                case 'connecting':
                    console.log('Versao do Bot: 2.5.0');
                    console.log(`WhatsApp-Web: ${version}`);
                    console.log(require('cfonts').render((`YURI|ADV`), {font: 'block', align: "center", gradient: ['red', 'magenta']}).string);
                    if (usePairingCode) {
                        console.log('Modo: Codigo de Pareamento');
                    }
                    console.log('Conectando...');
                    break;

                case 'open':
                    console.log('\n===================================');
                    console.log('   BOT ONLINE E FUNCIONANDO!');
                    console.log('===================================\n');
                    console.log(`Conectado como: ${yurizin.user.id.split(':')[0]}`);
                    console.log(`Nome: ${yurizin.user.name || 'Nao definido'}\n`);
                    break;
            }
        }

        if(events["group.join-request"]) {
            const jr = events["group.join-request"];
            console.log(jr);
            const VRF_JSON_GRUPO = fs.existsSync(`./arquivos/database/groups/db/${jr.id}.json`);
            if(VRF_JSON_GRUPO) {
                try {
                    var JSON_GROUP_CONFIG = JSON.parse(fs.readFileSync(`./arquivos/database/groups/db/${jr.id}.json`));
                } catch(e) {
                    console.log(`Erro ao ler config do grupo ${jr.id}:`, e.message);
                }
            }
        }

        if(events["group-participants.update"]){
            try {
                var yuri2 = events["group-participants.update"];
                if(!fs.existsSync(`./arquivos/database/groups/db/${yuri2.id}.json`)) return;
                var jsonGp = JSON.parse(fs.readFileSync(`./arquivos/database/groups/db/${yuri2.id}.json`));
                if(!yuri2.participants || !yuri2.participants[0]) return;
                if(yuri2.participants[0].startsWith(yurizin.user.id.split(':')[0])) return;
                try {var grpmdt = await yurizin.groupMetadata(yuri2.id)} catch(e) {return}
                const isGroup2 = grpmdt.id.endsWith('@g.us');
                try {
                    var GroupMetadata_ = isGroup2 ? await yurizin.groupMetadata(yuri2.id): ""
                } catch (e) {return}
                const membros_ = isGroup2 ? GroupMetadata_.participants : '';
                const groupAdmins_ = isGroup2 ? getGroupAdmins(membros_) : '';

                if(yuri2.action == 'add') {
                    num = yuri2.participants[0];
                    if(definitions.listanegraG && definitions.listanegraG.includes(num)){
                        yurizin.sendMessage(GroupMetadata_.id,{text: mess.blackList(GroupMetadata_, yuri2), mentions: yuri2.participants});
                        yurizin.groupParticipantsUpdate(GroupMetadata_.id, [yuri2.participants[0]], 'remove');
                    }
                }

                if(yuri2.action == 'add' && jsonGp[0].listanegra && jsonGp[0].listanegra.includes(yuri2.participants[0])) {
                    await yurizin.sendMessage(GroupMetadata_.id,{text: mess.blackList(GroupMetadata_, yuri2), mentions: yuri2.participants});
                    await yurizin.groupParticipantsUpdate(GroupMetadata_.id, [yuri2.participants[0]], 'remove');
                }

                if(jsonGp[0].antifake && jsonGp[0].antifake.status && yuri2.action === 'add' && !yuri2.participants[0].startsWith('55')) {
                    if(jsonGp[0].antifake.message != "0") {
                        yurizin.sendMessage(GroupMetadata_.id, {text: jsonGp[0].antifake.message});
                    }
                    setTimeout(async() => { await yurizin.groupParticipantsUpdate(GroupMetadata_.id, [yuri2.participants[0]], 'remove') }, 1000);
                }

                if(jsonGp[0].ANTI_DDD && jsonGp[0].ANTI_DDD.active && yuri2.action == 'add' && jsonGp[0].ANTI_DDD.listaProibidos && jsonGp[0].ANTI_DDD.listaProibidos.includes(extractDDD(yuri2.participants[0].split('@')[0]))) {
                    yurizin.sendMessage(GroupMetadata_.id,{text: mess.forbiddenStateFromDDD(yuri2.participants[0], extractStateFromDDD, extractDDD), mentions: yuri2.participants});
                    setTimeout(async() => { yurizin.groupParticipantsUpdate(GroupMetadata_.id, [yuri2.participants[0]], 'remove') }, 1000);
                }

                if(!jsonGp[0].wellcome || (!jsonGp[0].wellcome[1].bemvindo2 && !jsonGp[0].wellcome[0].bemvindo1)) return;
                try { var mdata_2 = isGroup2 ? await yurizin.groupMetadata(yuri2.id): "" } catch (e) {return};
                const isWelcomed = jsonGp[0].wellcome[0].legendabv != null;
                const isByed = jsonGp[0].wellcome[0].legendasaiu != 0;
                const isWelcomed2 = jsonGp[0].wellcome[1].legendabv != null;
                const isByed2 = jsonGp[0].wellcome[1].legendasaiu != 0;
                const groupDesc = await mdata_2.desc;
                if(jsonGp[0].antifake && jsonGp[0].antifake.status == true && !yuri2.participants[0].startsWith('55')) return;
                if(jsonGp[0].wellcome[0].bemvindo1 == true) {
                    try {ppimg = await yurizin.profilePictureUrl(yuri2.participants[0])} catch(e) {ppimg = images['defaultProfile'].value}
                    shortpc = await axios.get(`https://tinyurl.com/api-create.php?url=${ppimg}`);
                    if(yuri2.action === 'add') {
                        if(isWelcomed) {
                            teks = jsonGp[0].wellcome[0].legendabv
                                .replace('#hora#', time)
                                .replace('#nomedogp#', mdata_2.subject)
                                .replace('#numerodele#', '@'+yuri2.participants[0].split('@')[0])
                                .replace('#numerobot#', yurizin.user.id)
                                .replace('#prefixo#', jsonGp[0].multiprefix == true ? jsonGp[0].prefixos[0] : config["Prefix"].value)
                                .replace('#descrição#', groupDesc)
                                .replace('#estado#', extractStateFromNumber(yuri2.participants[0].split('@')[0]))
                        } else {
                            teks = welcome(yuri2.participants[0].split('@')[0], mdata_2.subject);
                        };
                        welcomeEnter = await axios.get(`https://tinyurl.com/api-create.php?url=${images['Welcome'].Enter}`);
                        await yurizin.sendMessage(mdata_2.id, {image: {url: API_URL + `/api/photomod/welcome?titulo=Bem-vindo(a)!&perfil=${shortpc.data}&fundo=${welcomeEnter.data}&desc=${mess.phrasesWelcome(mdata_2, yuri2, encodeURIComponent)}`}, mentions: yuri2.participants, caption: teks});
                    } else if(yuri2.action === 'remove') {
                        mem = yuri2.participants[0]
                        try { ppimg = await yurizin.profilePictureUrl(`${mem.split('@')[0]}@c.us`)} catch(e){ppimg = images['defaultProfile'].value}
                        if(isByed) {
                            teks = jsonGp[0].wellcome[0].legendasaiu
                                .replace('#hora#', time)
                                .replace('#nomedogp#', mdata_2.subject)
                                .replace('#numerodele#', yuri2.participants[0].split('@')[0])
                                .replace('#numerobot#', yurizin.user.id)
                                .replace('#prefixo#', jsonGp[0].multiprefix == true ? jsonGp[0].prefixos[0] : config["Prefix"].value)
                                .replace('#descrição#', groupDesc)
                                .replace('#estado#', extractStateFromNumber(yuri2.participants[0].split('@')[0]))
                        } else {
                            teks = bye(yuri2.participants[0].split('@')[0])
                        }
                        welcomeLeft = await axios.get(`https://tinyurl.com/api-create.php?url=${images['Welcome'].Left}`);
                        await yurizin.sendMessage(mdata_2.id, {image: {url: API_URL + `/api/photomod/welcome?titulo=Adeus!&perfil=${shortpc.data}&fundo=${welcomeLeft}&desc=${mess.phrasesLeft(yuri2, encodeURIComponent)}`}, caption: teks, mentions: yuri2.participants})
                    }
                }

                if(jsonGp[0].wellcome[1].bemvindo2 == true){
                    if(yuri2.action === 'add') {
                        if(isWelcomed2) {
                            teks = jsonGp[0].wellcome[1].legendabv
                                .replace('#hora#', time)
                                .replace('#nomedogp#', mdata_2.subject)
                                .replace('#numerodele#', yuri2.participants[0].split('@')[0])
                                .replace('#numerobot#', yurizin.user.id)
                                .replace('#prefixo#', jsonGp[0].multiprefix == true ? jsonGp[0].prefixos[0] : config["Prefix"].value)
                                .replace('#descrição#', groupDesc)
                                .replace('#estado#', extractStateFromNumber(yuri2.participants[0].split('@')[0]))
                        } else {
                            teks = welcome2(yuri2.participants[0].split('@')[0], mdata_2.subject)
                        }
                        yurizin.sendMessage(mdata_2.id, {text: teks, mentions: yuri2.participants})
                    } else if(yuri2.action === 'remove') {
                        var mem = yuri2.participants[0]
                        if(isByed2) {
                            teks = jsonGp[0].wellcome[1].legendasaiu
                                .replace('#hora#', time)
                                .replace('#nomedogp#', mdata_2.subject)
                                .replace('#numerodele#', mem.split('@')[0])
                                .replace('#numerobot#', yurizin.user.id)
                                .replace('#prefixo#', jsonGp[0].multiprefix == true ? jsonGp[0].prefixos[0] : config["Prefix"].value)
                                .replace('#descrição#', groupDesc)
                                .replace('#estado#', extractStateFromNumber(yuri2.participants[0].split('@')[0]))
                        } else {
                            teks = bye2(mem.split('@')[0])
                        }
                        yurizin.sendMessage(mdata_2.id, {text: teks, mentions: yuri2.participants})
                    }
                }
            } catch (error) {
                console.log('Erro:', error.message);
            }
        }

        if(events["messages.upsert"]) {
            var upsert = events["messages.upsert"];
            try {
                const startyurizin = require('./index.js');
                startyurizin(upsert, yurizin, qrcode).catch((error) => console.log('Erro:', error.message));
            } catch(e) {
                console.log('Erro ao carregar index.js:', e.message);
            }
        }

        if(events["creds.update"]) {
            try {
                await saveCreds();
            } catch(e) {
                console.log('Erro ao salvar credenciais:', e.message);
            }
        }
    })

    return yurizin;
}

startConnect().catch(err => {
    console.log('Erro fatal:', err.message);
    process.exit(1);
});
