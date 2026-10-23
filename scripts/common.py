"""공용 유틸: 경로, 설정, 게시물 읽기/쓰기."""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"            # GitHub Pages 공개 폴더
POSTS = DOCS / "posts"          # docs/posts/<YYYY-MM-DD>/<card|reel>/post.json + 파일
KST = timezone(timedelta(hours=9))


def load_config() -> dict:
    cfg = json.loads((ROOT / "config" / "account.json").read_text(encoding="utf-8"))
    owner = os.environ.get("GITHUB_REPOSITORY_OWNER")
    if owner and "OWNER" in cfg["site_base"]:
        cfg["site_base"] = cfg["site_base"].replace("OWNER", owner.lower())
    return cfg


def now_kst() -> datetime:
    return datetime.now(KST)


def iter_posts():
    """(post.json 경로, 데이터)를 날짜순으로."""
    for p in sorted(POSTS.glob("*/*/post.json")):
        yield p, json.loads(p.read_text(encoding="utf-8"))


def save_post(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def publish_time(post: dict, cfg: dict) -> datetime:
    if post.get("publish_at"):
        return datetime.fromisoformat(post["publish_at"])
    hh, mm = cfg["times"][post["type"]].split(":")
    d = datetime.fromisoformat(post["date"])
    return d.replace(hour=int(hh), minute=int(mm), tzinfo=KST)
