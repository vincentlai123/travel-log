# -*- coding: utf-8 -*-
"""旅遊日誌加解密共用函式。密碼與明文路徑不可寫進 repo。"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent
DEFAULT_ENC = REPO_DIR / "data.enc.json"
BOX_DATA = Path("/home/box/shared/旅遊日誌/data.json")


def _strip_pw(text: str) -> bytes:
    return text.lstrip("\ufeff").strip().encode("utf-8")


def password_bytes() -> bytes:
    env = os.environ.get("TRAVEL_LOG_PASS")
    if env:
        pw = _strip_pw(env)
        if pw:
            return pw
    candidates = []
    env_file = os.environ.get("TRAVEL_LOG_PASS_FILE")
    if env_file:
        candidates.append(Path(env_file).expanduser())
    candidates.extend(
        [
            Path.home() / ".config" / "travel-log-pass",
            REPO_DIR / ".travel-log-pass",
        ]
    )
    for path in candidates:
        try:
            if path.is_file():
                pw = _strip_pw(path.read_text(encoding="utf-8"))
                if pw:
                    return pw
        except OSError:
            continue
    raise SystemExit(
        "找不到密碼。請設定環境變數 TRAVEL_LOG_PASS，"
        "或把密碼寫入本機檔案 ~/.config/travel-log-pass（單行，不要提交到 Git）。"
    )


def data_json_path() -> Path:
    env = os.environ.get("TRAVEL_LOG_DATA")
    if env:
        return Path(env).expanduser()
    if BOX_DATA.parent.is_dir():
        return BOX_DATA
    return REPO_DIR / "data.json"


def enc_json_path() -> Path:
    env = os.environ.get("TRAVEL_LOG_ENC")
    if env:
        return Path(env).expanduser()
    return DEFAULT_ENC


def add_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--data",
        type=Path,
        default=None,
        help="明文 data.json 路徑（預設：環境變數 TRAVEL_LOG_DATA，或 box 共用檔，或 repo 內 data.json）",
    )
    parser.add_argument(
        "--enc",
        type=Path,
        default=None,
        help="加密 data.enc.json 路徑（預設：環境變數 TRAVEL_LOG_ENC，或 repo 內 data.enc.json）",
    )
