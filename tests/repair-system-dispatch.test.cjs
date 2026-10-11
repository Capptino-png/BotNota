'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {repairIndex, repairConfig, TEXT_MODULE, syntaxCheck} = require('../scripts/repair-system-dispatch');

const fixture = [
  "async function startyurizin() {",
  "module.exports = yurizin = async(upsert, yurizin, qrcode) => {",
  "async function upsertMessage() {",
  "for(const info of upsert?.messages || []) {",
  "if(!info.message) return;",
  "const body = info.message?.conversation || info.text || '';",
  "const budy2 = body.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');",
  "const isCmd = body.trim().startsWith(prefix);",
  "const command = isCmd ? budy2.trim().slice(1).split(/ +/).shift().toLocaleLowerCase(): null;",
  "switch(command) {",
  "case 'menu': break;",
  "}",
  "}",
  "}",
  "upsertMessage().catch(async(error) => {return errorLog(error);});",
  "}",
  "}",
  "/* ----- [ Detectar alterações e salvar ] ----- */",
  "module.exports = startyurizin;"
].join('\n');

test('corrige wrapper, prefixo e wrapper de texto e preserva sintaxe', () => {
  const result=repairIndex(fixture);
  assert.ok(result.source.includes('async function startyurizin(upsert, yurizin, qrcode)'));
  assert.ok(result.source.includes('const resolvedPrefix ='));
  assert.ok(result.source.includes('case \'diagnostico\':'));
  assert.ok(result.source.includes("getMessageText(info.message)"));
  assert.ok(result.source.includes('if(!info.message) continue;'));
  syntaxCheck(result.source, 'test-index');
  assert.equal(result.changes.length >= 4,true);
});

test('patch idempotente na segunda execucao', () => {
  const once=repairIndex(fixture);
  const twice=repairIndex(once.source);
  assert.equal(once.source, twice.source);
});

test('prefixo principal atualizado sem perder outras configuracoes', () => {
  const input=JSON.stringify({Prefix:{value:'.'},OwnerNumber:{value:'redacted'},subOwners:{dono1:'owner'}});
  const data=JSON.parse(repairConfig(input).source);
  assert.equal(data.Prefix.value,'/');
  assert.equal(data.OwnerNumber.value,'redacted');
  assert.equal(data.subOwners.dono1,'owner');
});

test('modulo de texto compila e suporta encapsulamentos comuns', () => {
  syntaxCheck(TEXT_MODULE, 'message-text-test');
  assert.match(TEXT_MODULE,/viewOnceMessageV2/);
  assert.match(TEXT_MODULE,/extendedTextMessage/);
});

test('recusa wrapper ambiguo', () => {
  assert.throws(()=>repairIndex(fixture.replace('/* ----- [ Detectar alterações e salvar ] ----- */','/* marker desconhecido */')),/fechamento diferente/);
});
