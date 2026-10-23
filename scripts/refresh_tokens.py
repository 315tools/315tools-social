"""인스타 장기 토큰(60일)을 새로 받아 GitHub Secret IG_TOKEN 을 갱신한다. 매달 1일 Actions 가 실행.

필요: IG_TOKEN, 그리고 이 저장소 Secrets 를 고칠 수 있는 GH_PAT (fine-grained, Secrets 쓰기 권한만)
"""
from __future__ import annotations

import os
import subprocess
import sys

import requests

from common import load_config


def main() -> int:
    cfg = load_config()
    name = cfg["token_secret"]
    tok = os.environ.get(name)
    if not tok:
        print(f"{name} 없음")
        return 1
    d = requests.get("https://graph.instagram.com/refresh_access_token",
                     params={"grant_type": "ig_refresh_token", "access_token": tok}, timeout=30).json()
    if "access_token" not in d:
        print(f"갱신 실패 → {d.get('error', d)}")
        return 1
    subprocess.run(["gh", "secret", "set", name, "--repo", os.environ["GITHUB_REPOSITORY"], "--body", d["access_token"]],
                   check=True, env={**os.environ, "GH_TOKEN": os.environ["GH_PAT"]})
    print(f"갱신 완료, {int(d.get('expires_in', 0)) // 86400}일 유효")
    return 0


if __name__ == "__main__":
    sys.exit(main())
