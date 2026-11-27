# -*- coding: utf-8 -*-
"""把 data.enc.json 解成本機 data.json。用法：python decrypt.py"""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from crypto_io import add_common_args, data_json_path, enc_json_path, password_bytes


def decrypt(enc_path: Path, data_path: Path) -> int:
    if not enc_path.is_file():
        raise SystemExit(f"找不到加密資料：{enc_path}")
    payload = json.loads(enc_path.read_text(encoding="utf-8"))
    try:
        salt = base64.b64decode(payload["salt"])
        iv = base64.b64decode(payload["iv"])
        ct = base64.b64decode(payload["ct"])
        iterations = int(payload["iter"])
    except (KeyError, ValueError) as exc:
        raise SystemExit(f"data.enc.json 格式不正確：{exc}") from exc
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=iterations
    ).derive(password_bytes())
    try:
        plain = AESGCM(key).decrypt(iv, ct, None)
    except Exception as exc:
        raise SystemExit("解密失敗：密碼不對，或 data.enc.json 已損壞。") from exc
    try:
        parsed = json.loads(plain.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SystemExit(f"解密結果不是有效的 UTF-8 JSON：{exc}") from exc
    n = len(parsed.get("entries", []))
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_bytes(plain)
    print(f"ok {len(plain)} bytes, {n} entries -> {data_path}")
    return n


def main() -> None:
    parser = argparse.ArgumentParser(description="解密 data.enc.json 為本機 data.json")
    add_common_args(parser)
    args = parser.parse_args()
    data_path = args.data.expanduser() if args.data else data_json_path()
    enc_path = args.enc.expanduser() if args.enc else enc_json_path()
    decrypt(enc_path, data_path)


if __name__ == "__main__":
    main()
