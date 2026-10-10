'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classifyDisconnect, retryDelay } = require('../core/connection-policy.js');
const { transform } = require('../scripts/apply-termux-connection-patch.js');
test('401 suspende tentativas', () => assert.equal(classifyDisconnect(401).retry, false));
test('440 bloqueia conflito de sessao', () => assert.equal(classifyDisconnect(440).type, 'CONFLICT'));
test('405 permite tentativas limitadas de handshake', () => {
 assert.equal(classifyDisconnect(405).type, 'HANDSHAKE');
 assert.equal(retryDelay('HANDSHAKE', 3), 30000);
});
test('515 reinicia protocolo sem marcar online', () => {
 assert.equal(classifyDisconnect(515).type, 'RESTART');
 assert.equal(retryDelay('RESTART', 1), 500);
});
test('desconhecido recebe backoff limitado', () => assert.ok(retryDelay('UNKNOWN', 20) <= 30000));
test('patch ja aplicado e rejeitado', () => {
 const source = fs.readFileSync(path.join(__dirname, '..', 'connect.js'), 'utf8');
 assert.throws(() => transform(source), /Patch ja aplicado/);
 assert.doesNotMatch(source, /NODE_TLS_REJECT_UNAUTHORIZED = '0'/);
});
