'use strict';
function replaceRequired(source, find, replacement, label) {
 if (!source.match(find)) throw new Error('Estrutura nao reconhecida: ' + label);
 return source.replace(find, replacement);
}
function transform(source) {
 if(source.includes("require('./core/connection-policy')")) throw new Error('Patch ja aplicado.');
 let s=source;
 s=replaceRequired(s, /^process\.env\.NODE_TLS_REJECT_UNAUTHORIZED = '0';\r?\n\r?\n/m, '', 'TLS');
 s=replaceRequired(s, /const usePairingCode = process\.argv\.includes\('sim'\);/, [
  "const usePairingCode = process.argv.includes('sim');",
  "const { classifyDisconnect, retryDelay } = require('./core/connection-policy');",
  'let cachedNumber=null;', 'let generation=0;', 'let attempts=0;', 'let retryTimer=null;',
  'function scheduleReconnect(mine,code,message) {',
  ' if(mine!==generation || retryTimer) return;',
  ' const state=classifyDisconnect(code,message);',
  " console.log('Conexao encerrada ['+(code||'?')+']: '+state.type);",
  ' if(!state.retry || attempts>=5) {',
  "   console.error('Reconexao interrompida; credenciais preservadas. Confira biblioteca e rede.');",
  '   rl.close(); process.exit(1);',
  ' }',
  ' attempts++;',
  ' const ms=retryDelay(state.type,attempts);',
  " console.log('Tentativa '+attempts+'/5 em '+(ms/1000)+'s');",
  ' retryTimer=setTimeout(() => {',
  '   retryTimer=null;',
  "   startConnect().catch(e => { console.error('Erro na reconexao:',e.message); process.exit(1); });",
  ' },ms);',
  '}'
 ].join('\n'), 'controlador de reconexao');
 s=replaceRequired(s, /async function startConnect\(\) \{/, [
  'async function startConnect() {',' const mine=++generation;', ' let closed=false;', ' let requested=false;'
 ].join('\n'), 'geracao do socket');
 s=replaceRequired(s, /    let pairingNumber = null;[\s\S]*?(?=\n    const yurizin = makeWASocket\(\{)/, [
  '    let pairingNumber=cachedNumber;',
  '    if(usePairingCode && !state.creds.registered) {',
  '      if(!pairingNumber) {',
  "        const digits=collectNumbers(await question('Numero com codigo do pais e DDD (ex: 5513982189399): '));",
  "        pairingNumber=(digits.length===10 || digits.length===11) ? '55'+digits : digits;",
  "        if(!/^[0-9]{12,15}$/.test(pairingNumber)) throw new Error('Numero invalido; use codigo do pais + DDD + telefone.');",
  '        cachedNumber=pairingNumber;',
  '      }',
  "      console.log('Aguardando readiness/QR do socket...');",
  '    }',
  ''
 ].join('\n'), 'entrada do numero');
 s=replaceRequired(s, /    if \(usePairingCode && !state\.creds\.registered && pairingNumber\) \{[\s\S]*?\n    \}\n\n(?=    yurizin\.ev\.process)/, [
  '    async function pairingReady() {',
  '      if(closed || mine!==generation || requested || !usePairingCode || !pairingNumber || state.creds.registered) return;',
  '      requested=true;',
  '      try {',
  "        console.log('Solicitando codigo apos readiness...');",
  '        const code=await yurizin.requestPairingCode(pairingNumber);',
  "        if(mine===generation && !closed) console.log('CODIGO: '+code);",
  '      } catch(error) {',
  "        console.error('Falha ao solicitar codigo:',error.message);",
  '        closed=true;',
  "        try { yurizin.end(new Error('pairing failed')); } catch (_) {}",
  '        scheduleReconnect(mine,405,error.message);',
  '      }',
  '    }',
  ''
 ].join('\n'), 'timer de pareamento');
 s=replaceRequired(s, /            const shouldReconnect = new Boom\(lastDisconnect\?\.error\)\?\.output\?\.statusCode;/, [
  '            if(mine!==generation) return;',
  '            const shouldReconnect=lastDisconnect?.error?.output?.statusCode || new Boom(lastDisconnect?.error)?.output?.statusCode;',
  "            if(qr && connection!=='close') await pairingReady();"
 ].join('\n'), 'connection.update');
 s=replaceRequired(s, /console\.log\('\\nCodigo confirmado! Pareamento aceito!'\);\s*console\.log\('Finalizando configuracao\.\.\.'\);/, "console.log('Credenciais atualizadas; aguardando connection=open...');", 'mensagem de login');
 s=replaceRequired(s, /                case 'close':[\s\S]*?\n                    break;(?=\n\n                case 'connecting':)/, [
  "                case 'close':",
  '                    if(closed) break;',
  '                    closed=true;',
  '                    scheduleReconnect(mine,shouldReconnect,lastDisconnect?.error?.message);',
  '                    break;'
 ].join('\n'), 'desconexao');
 s=replaceRequired(s, /                case 'open':\n/, [
  "                case 'open':",
  '                    attempts=0;',
  '                    cachedNumber=null;',
  ''
 ].join('\n'), 'online');
 return s;
}
module.exports={ transform };
if (require.main===module) {
 const fs=require('fs'),path=require('path'),cp=require('child_process');
 const root=path.resolve(process.argv[2]||process.cwd());
 const file=path.join(root,'connect.js'), target=path.join(root,'core','connection-policy.js');
 const template=path.resolve(__dirname,'..','core','connection-policy.js'), temp=file+'.hive-next';
 try {
  if(!fs.existsSync(template)) throw new Error('Falta core/connection-policy.js junto do instalador.');
  if(fs.existsSync(target) && fs.readFileSync(target,'utf8')!==fs.readFileSync(template,'utf8')) throw new Error('Modulo core diferente: nao sobrescrevi.');
  const updated=transform(fs.readFileSync(file,'utf8'));
  fs.writeFileSync(temp,updated);
  cp.execFileSync(process.execPath,['--check',temp]);
  const backup=file+'.backup-'+Date.now();
  fs.copyFileSync(file,backup);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(template,target);
  fs.renameSync(temp,file);
  console.log('Patch validado e aplicado. Backup:',backup);
 } catch(error) {
  try { fs.unlinkSync(temp); } catch (_) {}
  console.error('Patch interrompido sem substituir connect.js:',error.message);
  process.exitCode=1;
 }
}
