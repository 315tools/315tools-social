"""발행 없이 시험: 인스타가 이미지·릴스 영상을 받아 처리(FINISHED)하는지만 확인한다.
컨테이너만 만들고 media_publish 는 부르지 않으므로 계정에는 아무것도 올라가지 않는다(쓰지 않은 컨테이너는 24시간 뒤 사라짐).
파일: docs/test/card.jpg, docs/test/reel.mp4
"""
from __future__ import annotations

import os
import sys

import requests

from common import load_config
from publish import GRAPH, TIMEOUT, PublishError, _check, wait_container, wait_url


def main() -> int:
    cfg = load_config()
    tok, uid = os.environ.get(cfg["token_secret"], ""), os.environ.get(cfg["user_id_secret"], "")
    base = f"{GRAPH}/{uid}"
    bad = 0
    tests = [
        ("카드(이미지)", {"image_url": f"{cfg['site_base']}/test/card.jpg"}, 20, 5),
        ("릴스(영상)", {"media_type": "REELS", "video_url": f"{cfg['site_base']}/test/reel.mp4", "share_to_feed": "true"}, 60, 10),
    ]
    for name, data, tries, gap in tests:
        try:
            wait_url(data.get("image_url") or data["video_url"])
            cid = _check(requests.post(f"{base}/media", data={**data, "caption": "test (not published)", "access_token": tok}, timeout=TIMEOUT))["id"]
            wait_container(cid, tok, tries=tries, gap=gap)
            print(f"{name}: 처리 완료(FINISHED) — 발행은 하지 않음")
        except (PublishError, requests.RequestException) as e:
            bad += 1
            print(f"{name}: 실패 → {e}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
