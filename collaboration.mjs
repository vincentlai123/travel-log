// Dependency-free Windows fallback; encrypted format is identical to build.py.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD_FILE = path.join(ROOT, '.travel-log-pass');
export const normalizePassword = value => String(value).replace(/^\uFEFF/, '').trim();
const utf8 = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

export function entryStats(plain) {
  const data = JSON.parse(utf8(plain).replace(/^\uFEFF/, ''));
  if (!data || !Array.isArray(data.entries)) throw Error('資料缺少 entries 清單。');
  const ids = new Set();
  for (const entry of data.entries) {
    if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 || ids.has(entry.id)) {
      throw Error('資料含無效或重複的 id，已停止寫入。');
    }
    ids.add(entry.id);
  }
  return { count: ids.size, maxId: Math.max(0, ...ids) };
}

function checkedPayload(payload) {
  if (!payload || !Number.isInteger(payload.iter) || payload.iter < 100000 || payload.iter > 2000000) {
    throw Error('加密資料的迭代設定不正確。');
  }
  const decoded = {};
  for (const name of ['salt', 'iv', 'ct']) {
    const value = payload[name];
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
      throw Error('加密資料的 Base64 格式不正確。');
    }
    decoded[name] = Buffer.from(value, 'base64');
  }
  if (decoded.salt.length !== 16 || decoded.iv.length !== 12 || decoded.ct.length < 16) {
    throw Error('加密資料長度不正確。');
  }
  return decoded;
}

export function encodePayload(plain, password) {
  const data = Buffer.from(utf8(plain).replace(/^\uFEFF/, ''), 'utf8');
  entryStats(data);
  const pw = normalizePassword(password);
  if (!pw) throw Error('請輸入既有日誌密碼。');
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), iter = 200000;
  const key = crypto.pbkdf2Sync(pw, salt, iter, 32, 'sha256');
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
    return { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iter };
  } finally { key.fill(0); }
}

export function decodePayload(payload, password) {
  const { salt, iv, ct } = checkedPayload(payload);
  const pw = normalizePassword(password);
  if (!pw) throw Error('請輸入既有日誌密碼。');
  const key = crypto.pbkdf2Sync(pw, salt, payload.iter, 32, 'sha256');
  let plain;
  try {
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAuthTag(ct.subarray(-16));
    plain = Buffer.concat([cipher.update(ct.subarray(0, -16)), cipher.final()]);
  } catch { throw Error('解密失敗：密碼不符或加密資料損壞，未修改任何檔案。'); }
  finally { key.fill(0); }
  entryStats(plain);
  return plain;
}

function readPassword() {
  const env = normalizePassword(process.env.TRAVEL_LOG_PASS || '');
  if (env) return env;
  const candidates = [process.env.TRAVEL_LOG_PASS_FILE, path.join(os.homedir(), '.config', 'travel-log-pass'), PASSWORD_FILE].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const value = normalizePassword(fs.readFileSync(candidate, 'utf8'));
      if (value) return value;
    } catch (error) { if (!['ENOENT', 'EACCES'].includes(error.code)) throw error; }
  }
  throw Error('尚未設定本機解密。請執行 Setup-Collaboration.cmd，只在本機視窗輸入既有密碼。');
}

function atomicWrite(target, contents) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = target + '.tmp-' + crypto.randomBytes(8).toString('hex');
  try {
    fs.writeFileSync(temporary, contents, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function writePlain(target, plain) {
  if (fs.existsSync(target)) {
    const previous = fs.readFileSync(target);
    if (previous.equals(plain)) return;
    fs.copyFileSync(target, target + '.bak-' + Date.now(), fs.constants.COPYFILE_EXCL);
  }
  atomicWrite(target, plain);
}

export async function main(args = process.argv.slice(2)) {
  const command = args.shift() || 'status';
  let dataPath = process.env.TRAVEL_LOG_DATA ? path.resolve(process.env.TRAVEL_LOG_DATA) : path.join(ROOT, 'data.json');
  let encPath = process.env.TRAVEL_LOG_ENC ? path.resolve(process.env.TRAVEL_LOG_ENC) : path.join(ROOT, 'data.enc.json');
  while (args.length) {
    const flag = args.shift(), value = args.shift();
    if (!['--data', '--enc'].includes(flag) || !value) throw Error('只支援 --data 與 --enc 路徑參數。密碼不可放在命令列。');
    if (flag === '--data') dataPath = path.resolve(value); else encPath = path.resolve(value);
  }
  if (path.resolve(dataPath) === path.resolve(encPath)) throw Error('明文與加密檔不可使用相同路徑。');
  if (command === 'status') {
    const payload = JSON.parse(fs.readFileSync(encPath, 'utf8'));
    checkedPayload(payload);
    let configured = false;
    try { readPassword(); configured = true; } catch {}
    console.log(JSON.stringify({ encryptedFilePresent: true, encryptedFormatValid: true, passwordAvailable: configured, plaintextPresent: fs.existsSync(dataPath) }));
    return;
  }
  if (command === 'configure') {
    // stdin is supplied only by the local masked-password window; never echoed.
    const proposed = normalizePassword(utf8(Buffer.from(fs.readFileSync(0, 'utf8').trim(), 'base64')));
    const plain = decodePayload(JSON.parse(fs.readFileSync(encPath, 'utf8')), proposed);
    const stats = entryStats(plain);
    writePlain(dataPath, plain);
    atomicWrite(PASSWORD_FILE, proposed);
    console.log(JSON.stringify({ configured: true, ...stats }));
    return;
  }
  if (['verify', 'decrypt'].includes(command)) {
    const plain = decodePayload(JSON.parse(fs.readFileSync(encPath, 'utf8')), readPassword());
    if (command === 'decrypt') writePlain(dataPath, plain);
    console.log(JSON.stringify({ verified: true, written: command === 'decrypt', ...entryStats(plain) }));
    return;
  }
  if (command === 'build') {
    const plain = fs.readFileSync(dataPath);
    const password = readPassword();
    // Verify the current encrypted file first, so a wrong local key cannot re-key it.
    if (fs.existsSync(encPath)) decodePayload(JSON.parse(fs.readFileSync(encPath, 'utf8')), password);
    const payload = encodePayload(plain, password);
    if (!decodePayload(payload, password).equals(Buffer.from(utf8(plain).replace(/^\uFEFF/, ''), 'utf8'))) throw Error('加密回讀驗證失敗。');
    atomicWrite(encPath, JSON.stringify(payload));
    console.log(JSON.stringify({ built: true, ...entryStats(plain) }));
    return;
  }
  throw Error('用法：node collaboration.mjs status|verify|decrypt|build|configure');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
