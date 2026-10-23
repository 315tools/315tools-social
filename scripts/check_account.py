"""연결 확인(읽기 전용): 토큰으로 계정 정보와 오늘 발행 한도를 조회한다. 게시물은 올리지 않는다."""
from __future__ import annotations

import json
import os
import sys

import requests

from common import ROOT, load_config, now_kst

GRAPH = "https://graph.instagram.com"


def main() -> int:
    cfg = load_config()
    tok, uid = os.environ.get(cfg["token_secret"], ""), os.environ.get(cfg["user_id_secret"], "")
    if not tok or not uid:
        print("Secrets 없음 (IG_TOKEN / IG_USER_ID)")
        return 1
    me = requests.get(f"{GRAPH}/me", params={"fields": "user_id,username,account_type,followers_count,media_count", "access_token": tok}, timeout=30).json()
    if "error" in me:
        print("토큰 오류 →", me["error"].get("message"))
        return 1
    ok = me.get("username") == cfg["ig_username"] and str(me.get("user_id")) == uid
    lim = requests.get(f"{GRAPH}/{uid}/content_publishing_limit",
                       params={"fields": "quota_usage,config", "access_token": tok}, timeout=30).json()
    q = (lim.get("data") or [{}])[0]
    print(f"{me.get('username')} ({me.get('account_type')}) 일치={'O' if ok else 'X'} "
          f"팔로워 {me.get('followers_count')} · 게시물 {me.get('media_count')} · 오늘 발행 {q.get('quota_usage', '?')}/{q.get('config', {}).get('quota_total', '?')}")
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "account.json").write_text(json.dumps({
        "checked_at": now_kst().isoformat(timespec="seconds"), "username": me.get("username"),
        "followers": me.get("followers_count"), "posts": me.get("media_count"), "quota_used": q.get("quota_usage")},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
