import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encodePayload, decodePayload, entryStats, normalizePassword } from './collaboration.mjs';

const plain = Buffer.from(JSON.stringify({ 說明: '測試資料', entries: [{ id: 1, 名稱: '測試店家' }, { id: 3, 名稱: 'Test' }] }));
const password = 'synthetic-test-password';
const root = path.dirname(fileURLToPath(import.meta.url));

test('Node encryption decrypts through the website WebCrypto format', async () => {
  const payload = encodePayload(plain, password);
  const keyMaterial = await crypto.webcrypto.subtle.importKey('raw', Buffer.from(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(payload.salt, 'base64'), iterations: payload.iter, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const decrypted = await crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(payload.iv, 'base64') }, key, Buffer.from(payload.ct, 'base64'));
  assert.deepEqual(Buffer.from(decrypted), plain);
});

test('Website WebCrypto encryption decrypts through Node', async () => {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), iter = 200000;
  const keyMaterial = await crypto.webcrypto.subtle.importKey('raw', Buffer.from(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = Buffer.from(await crypto.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  assert.deepEqual(decodePayload({ salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iter }, password), plain);
});

test('wrong passwords, tampering, and duplicate ids are rejected', () => {
  const payload = encodePayload(plain, password);
  assert.throws(() => decodePayload(payload, 'wrong'));
  const ct = Buffer.from(payload.ct, 'base64'); ct[ct.length - 1] ^= 1;
  assert.throws(() => decodePayload({ ...payload, ct: ct.toString('base64') }, password));
  assert.throws(() => encodePayload(Buffer.from('{"entries":[{"id":1},{"id":1}]}'), password));
  assert.throws(() => decodePayload({ ...payload, iter: 1 }, password));
  assert.equal(normalizePassword('\uFEFF  test\r\n'), 'test');
  assert.deepEqual(entryStats(plain), { count: 2, maxId: 3 });
});

test('decrypt preserves the previous plaintext, and bad-key build never overwrites ciphertext', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-log-test-'));
  const dataPath = path.join(directory, 'data.json'), encPath = path.join(directory, 'data.enc.json');
  try {
    const ciphertext = JSON.stringify(encodePayload(plain, password));
    fs.writeFileSync(encPath, ciphertext); fs.writeFileSync(dataPath, '{"entries":[]}');
    const run = (command, key) => spawnSync(process.execPath, [path.join(root, 'collaboration.mjs'), command, '--data', dataPath, '--enc', encPath], { env: { ...process.env, TRAVEL_LOG_PASS: key }, encoding: 'utf8' });
    assert.equal(run('decrypt', 'wrong').status, 1);
    assert.equal(fs.readFileSync(dataPath, 'utf8'), '{"entries":[]}');
    assert.equal(run('decrypt', password).status, 0);
    assert.deepEqual(fs.readFileSync(dataPath), plain);
    const backups = fs.readdirSync(directory).filter(name => name.startsWith('data.json.bak-'));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(directory, backups[0]), 'utf8'), '{"entries":[]}');
    assert.equal(run('build', 'wrong').status, 1);
    assert.equal(fs.readFileSync(encPath, 'utf8'), ciphertext);
    assert.equal(run('build', password).status, 0);
    assert.deepEqual(decodePayload(JSON.parse(fs.readFileSync(encPath, 'utf8')), password), plain);
  } finally {
    // Remove only the known immediate files in this unique test directory.
    for (const name of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, name));
    fs.rmdirSync(directory);
  }
});

test('local setup validates before saving and accepts a masked-window Base64 stdin handoff', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-log-test-'));
  try {
    const modulePath = path.join(directory, 'collaboration.mjs');
    const encPath = path.join(directory, 'data.enc.json');
    fs.copyFileSync(path.join(root, 'collaboration.mjs'), modulePath);
    const ciphertext = JSON.stringify(encodePayload(plain, password));
    fs.writeFileSync(encPath, ciphertext);
    const run = value => spawnSync(process.execPath, [modulePath, 'configure', '--data', path.join(directory, 'data.json'), '--enc', encPath], { input: Buffer.from(value).toString('base64'), encoding: 'utf8' });
    assert.equal(run('wrong').status, 1);
    assert.equal(fs.existsSync(path.join(directory, '.travel-log-pass')), false);
    assert.equal(fs.existsSync(path.join(directory, 'data.json')), false);
    const result = run('\uFEFF' + password + '\r\n');
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { configured: true, count: 2, maxId: 3 });
    assert.equal(result.stdout.includes(password), false);
    assert.equal(fs.readFileSync(path.join(directory, '.travel-log-pass'), 'utf8'), password);
    assert.deepEqual(fs.readFileSync(path.join(directory, 'data.json')), plain);
    assert.equal(fs.readFileSync(encPath, 'utf8'), ciphertext);
  } finally {
    for (const name of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, name));
    fs.rmdirSync(directory);
  }
});
