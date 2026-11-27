# -*- coding: utf-8 -*-
"""把本機明文 data.json 加密成 data.enc.json。用法：python build.py"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from crypto_io import add_common_args, data_json_path, enc_json_path, password_bytes

ITERATIONS = 200000


def encrypt(data_path: Path, enc_path: Path) -> int:
    if not data_path.is_file():
        raise SystemExit(f"找不到明文資料：{data_path}")
    data = data_path.read_bytes()
    try:
        parsed = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SystemExit(f"data.json 不是有效的 UTF-8 JSON：{exc}") from exc
    n = len(parsed.get("entries", []))
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS
    ).derive(password_bytes())
    ct = AESGCM(key).encrypt(iv, data, None)
    b64 = lambda x: base64.b64encode(x).decode("ascii")
    enc_path.write_text(
        json.dumps({"salt": b64(salt), "iv": b64(iv), "ct": b64(ct), "iter": ITERATIONS}),
        encoding="utf-8",
    )
    print(f"ok {len(data)} bytes, {n} entries -> {enc_path}")
    return n


def main() -> None:
    parser = argparse.ArgumentParser(description="加密 data.json 為 data.enc.json")
    add_common_args(parser)
    args = parser.parse_args()
    data_path = args.data.expanduser() if args.data else data_json_path()
    enc_path = args.enc.expanduser() if args.enc else enc_json_path()
    encrypt(data_path, enc_path)


if __name__ == "__main__":
    main()
