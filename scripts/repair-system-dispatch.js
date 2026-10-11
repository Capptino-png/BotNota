'use strict';
// Patch conservador e local: nao le nem altera credenciais, sessoes, banco ou certificados.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const TEXT_MODULE = String.raw`'use strict';
function unwrap(message) {
  let m = message;
  for (let n = 0; n < 8 && m && typeof m === 'object'; n++) {
    const next = m.ephemeralMessage?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessage?.message ||
      m.documentWithCaptionMessage?.message ||
      m.editedMessage?.message ||
      m.protocolMessage?.editedMessage;
    if (!next || next === m) break;
    m = next;
  }
  return m || {};
}
function getMessageText(message) {
  const m = unwrap(message);
  const direct = [
    m.conversation,
    m.extendedTextMessage?.text,
    m.imageMessage?.caption,
    m.videoMessage?.caption,
    m.documentMessage?.caption,
    m.buttonsResponseMessage?.selectedButtonId,
    m.templateButtonReplyMessage?.selectedId,
    m.listResponseMessage?.singleSelectReply?.selectedRowId,
    m.interactiveMessage?.body?.text,
    m.buttonsMessage?.contentText,
    m.buttonsMessage?.text,
    m.editedMessage?.message?.extendedTextMessage?.text
  ];
  for (const candidate of direct) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  const json = m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (typeof json === 'string') {
    try {
      const obj = JSON.parse(json);
      const id = obj?.id || obj?.selectedId;
      if (typeof id === 'string') return id;
    } catch (_) { /* resposta de botao malformada */ }
  }
  return '';
}
module.exports = {getMessageText, unwrap};
`;

function repairIndex(source) {
  let s = source;
  const changes = [];
  const warnings = [];

  const wrapper = /async function startyurizin\(\)\s*\{\s*\r?\nmodule\.exports\s*=\s*yurizin\s*=\s*async\s*\((upsert\s*,\s*yurizin\s*,\s*qrcode)\)\s*=>\s*\{/;
  if (wrapper.test(s)) {
    const end = /\r?\n\}\s*\r?\n\}\s*\r?\n(?=\/\* ----- \[ Detectar alterações)/;
    if (!end.test(s) || !/module\.exports\s*=\s*startyurizin\s*;/.test(s)) {
      throw new Error('Wrapper encontrado, mas fechamento diferente do esperado. Nenhum arquivo sera substituido.');
    }
    s = s.replace(wrapper, (_all, args) => 'async function startyurizin(' + args + ') {');
    s = s.replace(end, '\n}\n\n');
    changes.push('corrigido wrapper que nao despachava messages.upsert');
  }

  const originalCmd = /const isCmd\s*=\s*body\.trim\(\)\.startsWith\(prefix\);\s*\r?\nconst command\s*=\s*isCmd\s*\?\s*budy2\.trim\(\)\.slice\(1\)\.split\(\/ \+\/\)\.shift\(\)\.toLocaleLowerCase\(\)\s*:\s*null;/;
  const correctCmd = [
    "// Suporta o prefixo configurado e /, sem cortar caracteres incorretamente.",
    "const resolvedPrefix = [prefix, '/', '.'].find(p => typeof p === 'string' && p.length > 0 && body.trim().startsWith(p));",
    "const isCmd = Boolean(resolvedPrefix);",
    "const command = isCmd ? body.trim().slice(resolvedPrefix.length).split(/\\s+/)[0].toLocaleLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : null;"
  ].join('\n');
  if (originalCmd.test(s)) {
    s = s.replace(originalCmd, correctCmd);
    changes.push('corrigidos prefixos e extracao do nome do comando');
  } else if (!s.includes('const resolvedPrefix =')) {
    warnings.push('Interpretador de prefixo nao corresponde ao modelo conhecido; nao foi alterado.');
  }

  const body = /^const body = ([^\r\n]*);$/m;
  if (body.test(s) && !s.includes("require('./core/message-text')")) {
    s = s.replace(body, (_, expression) =>
      "const legacyBody = " + expression + ";\n" +
      "const body = getMessageText(info.message) || legacyBody || '';"
    );
    s = "const { getMessageText } = require('./core/message-text');\n" + s;
    changes.push('adicionada leitura de mensagens encapsuladas e botoes');
  } else if (!s.includes("require('./core/message-text')")) {
    warnings.push('Extracao de texto tem formato diferente; preservada.');
  }

  // Caso a primeira entrada do lote seja um evento sem mensagem, continua as demais.
  if (s.includes('if(!info.message) return;')) {
    s = s.replace('if(!info.message) return;', 'if(!info.message) continue;');
    changes.push('mensagens vazias nao interrompem o lote');
  }

  if (!s.includes('[SYSTEM-CMD-DEBUG]') && s.includes('const command = isCmd ?')) {
    const anchor = /(const command = isCmd \? [^\r\n]*;)/;
    s = s.replace(anchor, "$1\n" +
      "if (process.env.BOT_COMMAND_DEBUG === '1' && isCmd) console.log('[SYSTEM-CMD-DEBUG]', {command, chat: isGroup ? 'grupo' : 'privado'});");
    changes.push('adicionado diagnostico opcional de comandos');
  }

  if (!s.includes("case 'diagnostico':") && s.includes('switch(command) {')) {
    s = s.replace('switch(command) {', [
      'switch(command) {',
      "case 'diagnostico':",
      "  await yurizin.sendMessage(from, {text: 'System: recepcao e interpretacao de comandos funcionando.'}, {quoted: info});",
      '  break;'
    ].join('\n'));
    changes.push('adicionado comando seguro /diagnostico');
  }

  if (s.includes('return errorLog(error);') && !s.includes('[SYSTEM-DISPATCH-ERRO]')) {
    s = s.replace('return errorLog(error);',
      "console.error('[SYSTEM-DISPATCH-ERRO]', error && (error.stack || error.message || error));\nreturn errorLog(error);");
    changes.push('erros de execucao visiveis no terminal');
  }

  return {source: s, changes, warnings};
}

function repairConfig(source) {
  const data = JSON.parse(source);
  if (!data.Prefix || typeof data.Prefix.value !== 'string') {
    return {source, changes: [], warnings: ['settings/config.json sem Prefix.value; preservado.']};
  }
  if (data.Prefix.value === '/') return {source, changes: [], warnings: []};
  data.Prefix.value = '/';
  return {source: JSON.stringify(data, null, 2) + '\n', changes: ['prefixo padrao configurado para /'], warnings: []};
}

function syntaxCheck(code, name, root) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'system-repair-check-'));
  const tmpFile = path.join(tmpDir, name + '.js');
  try {
    fs.writeFileSync(tmpFile, code);
    cp.execFileSync(process.execPath, ['--check', tmpFile], {stdio:'pipe'});
  } finally {
    fs.rmSync(tmpDir, {recursive:true, force:true});
  }
}

function run(root) {
  const indexPath = path.join(root, 'index.js');
  const configPath = path.join(root, 'settings', 'config.json');
  const helperPath = path.join(root, 'core', 'message-text.js');
  for (const file of [indexPath, configPath]) if (!fs.existsSync(file)) {
    throw new Error('Arquivo obrigatorio nao encontrado: ' + file);
  }
  const originalIndex = fs.readFileSync(indexPath, 'utf8');
  const originalConfig = fs.readFileSync(configPath, 'utf8');
  const changedIndex = repairIndex(originalIndex);
  const changedConfig = repairConfig(originalConfig);
  if (!/module\.exports\s*=\s*startyurizin/.test(changedIndex.source)) {
    throw new Error('Exportacao do index.js nao reconhecida. Nao vou substituir esse arquivo.');
  }
  if (!changedIndex.source.includes('const resolvedPrefix =')) {
    throw new Error('Interpretador de comandos nao localizado. Nao vou aplicar um patch parcial.');
  }
  if (fs.existsSync(helperPath) && fs.readFileSync(helperPath, 'utf8') !== TEXT_MODULE) {
    throw new Error('Ja existe core/message-text.js com conteudo diferente; nao vou sobrescrever.');
  }
  syntaxCheck(changedIndex.source, 'index', root);
  syntaxCheck(TEXT_MODULE, 'message-text', root);
  JSON.parse(changedConfig.source);

  const allChanges = changedIndex.changes.concat(changedConfig.changes);
  console.log('Analise:', allChanges.join(' | ') || 'nenhuma alteracao necessaria');
  for (const warning of changedIndex.warnings.concat(changedConfig.warnings)) console.warn('Aviso:', warning);
  if (process.argv.includes('--dry-run')) {
    console.log('DRY RUN: estrutura compativel; nenhum arquivo alterado.');
    return;
  }
  const backupDir = path.join(root, '.system-repair-backup-' + Date.now());
  fs.mkdirSync(backupDir, {mode:0o700});
  fs.copyFileSync(indexPath, path.join(backupDir, 'index.js'));
  fs.copyFileSync(configPath, path.join(backupDir, 'config.json'));
  fs.chmodSync(path.join(backupDir, 'index.js'), 0o600);
  fs.chmodSync(path.join(backupDir, 'config.json'), 0o600);
  try {
    fs.mkdirSync(path.dirname(helperPath), {recursive:true});
    if (!fs.existsSync(helperPath)) fs.writeFileSync(helperPath, TEXT_MODULE, {mode:0o600});
    fs.writeFileSync(indexPath, changedIndex.source);
    fs.writeFileSync(configPath, changedConfig.source);
    syntaxCheck(fs.readFileSync(indexPath,'utf8'), 'installed-index', root);
    console.log('PATCH APLICADO. Backup em: ' + backupDir);
    console.log('Teste: BOT_COMMAND_DEBUG=1 node connect.js sim');
    console.log('No WhatsApp, envie /diagnostico e /menu.');
  } catch (error) {
    fs.copyFileSync(path.join(backupDir, 'index.js'), indexPath);
    fs.copyFileSync(path.join(backupDir, 'config.json'), configPath);
    console.error('Rollback realizado devido a:', error.message);
    throw error;
  }
}

module.exports = {repairIndex, repairConfig, TEXT_MODULE, syntaxCheck};
if (require.main === module) {
  try { run(path.resolve(process.argv.find(v => v.startsWith('--root='))?.slice(7) || process.cwd())); }
  catch (error) { console.error('PATCH NAO APLICADO:', error.message); process.exitCode=1; }
}
