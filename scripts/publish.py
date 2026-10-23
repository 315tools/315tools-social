"""발행 시간이 지난 315tools 게시물(카드뉴스·릴스)을 @315tools_official 에 올린다.

Instagram API (Instagram 로그인 방식, graph.instagram.com)
  카드뉴스: 이미지 1장 → POST /{id}/media image_url  /  여러 장 → 캐러셀(children)
  릴스:     POST /{id}/media media_type=REELS video_url share_to_feed=true (cover_url 선택)
  공통:     GET /{container}?fields=status_code 로 처리 대기 → POST /{id}/media_publish creation_id
파일은 GitHub Pages 공개 주소에 있어야 한다(이미지 JPEG, 영상 MP4).

사용:  python scripts/publish.py            실제 발행
       python scripts/publish.py --dry-run  무엇을 올릴지만 출력
"""
from __future__ import annotations

import os
import sys
import time

import requests

from common import POSTS, iter_posts, load_config, now_kst, publish_time, save_post

GRAPH = "https://graph.instagram.com"
TIMEOUT = 60
MAX_ATTEMPTS = 3


class PublishError(RuntimeError):
    pass


def _check(r: requests.Response) -> dict:
    try:
        data = r.json()
    except ValueError:
        raise PublishError(f"HTTP {r.status_code}: {r.text[:300]}")
    if r.status_code >= 400 or "error" in data:
        err = data.get("error", {})
        raise PublishError(f"HTTP {r.status_code}: {err.get('message', data)}")
    return data


def wait_url(url: str, tries: int = 20) -> None:
    """Pages 배포가 끝나 파일이 열릴 때까지 기다린다(최대 약 5분)."""
    for _ in range(tries):
        try:
            if requests.head(url, timeout=15, allow_redirects=True).status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(15)
    raise PublishError(f"파일이 공개 주소에 아직 없음: {url}")


def wait_container(cid: str, token: str, tries: int = 20, gap: int = 5) -> None:
    for _ in range(tries):
        d = _check(requests.get(f"{GRAPH}/{cid}", params={"fields": "status_code,status", "access_token": token}, timeout=TIMEOUT))
        st = d.get("status_code")
        if st == "FINISHED":
            return
        if st in ("ERROR", "EXPIRED"):
            raise PublishError(f"컨테이너 처리 실패: {cid} {st} {d.get('status', '')}")
        time.sleep(gap)
    raise PublishError(f"컨테이너 처리 대기 시간 초과: {cid}")


def create_container(post: dict, folder_rel: str, cfg: dict, base: str, token: str) -> str:
    url = lambda name: f"{cfg['site_base']}/{folder_rel}/{name}"
    caption = post["caption"].rstrip() + " "  # 마지막 해시태그 뒤 공백 유지
    caption = caption[:2200]

    if post["type"] == "reel":
        v = url(post["video"])
        if not v.lower().endswith(".mp4"):
            raise PublishError(f"릴스는 MP4만: {v}")
        wait_url(v)
        data = {"media_type": "REELS", "video_url": v, "caption": caption, "share_to_feed": "true", "access_token": token}
        if post.get("cover"):
            wait_url(url(post["cover"]))
            data["cover_url"] = url(post["cover"])
        cid = _check(requests.post(f"{base}/media", data=data, timeout=TIMEOUT))["id"]
        wait_container(cid, token, tries=60, gap=10)  # 영상 처리는 몇 분 걸릴 수 있음
        return cid

    urls = [url(n) for n in post["slides"]]
    for u in urls:
        if not u.lower().endswith((".jpg", ".jpeg")):
            raise PublishError(f"JPEG만 올릴 수 있음: {u}")
        wait_url(u)
    if len(urls) == 1:
        cid = _check(requests.post(f"{base}/media", data={"image_url": urls[0], "caption": caption, "access_token": token}, timeout=TIMEOUT))["id"]
    else:
        children = []
        for u in urls[:20]:
            children.append(_check(requests.post(f"{base}/media", data={"image_url": u, "is_carousel_item": "true", "access_token": token}, timeout=TIMEOUT))["id"])
        for c in children:
            wait_container(c, token)
        cid = _check(requests.post(f"{base}/media", data={
            "media_type": "CAROUSEL", "children": ",".join(children), "caption": caption, "access_token": token}, timeout=TIMEOUT))["id"]
    wait_container(cid, token)
    return cid


def publish(post: dict, folder_rel: str, cfg: dict) -> str:
    token = os.environ.get(cfg["token_secret"], "")
    user_id = os.environ.get(cfg["user_id_secret"], "")
    if not token or not user_id:
        raise PublishError(f"Secrets 없음: {cfg['token_secret']} / {cfg['user_id_secret']}")
    base = f"{GRAPH}/{user_id}"
    cid = create_container(post, folder_rel, cfg, base, token)
    for attempt in range(5):  # 처리 직후 "Media ID is not available" 이 잠깐 나올 수 있음
        try:
            return _check(requests.post(f"{base}/media_publish", data={"creation_id": cid, "access_token": token}, timeout=TIMEOUT))["id"]
        except PublishError as e:
            if "not available" not in str(e) or attempt == 4:
                raise
            time.sleep(15)


def due_posts(cfg: dict):
    now = now_kst()
    starts = cfg.get("start_date", "0000-00-00")
    for path, post in iter_posts():
        if post.get("status") in ("published", "hold"):
            continue
        start = starts.get(post["type"], "0000-00-00") if isinstance(starts, dict) else starts
        if post["date"] < start:
            continue
        if post.get("attempts", 0) >= MAX_ATTEMPTS:
            continue  # 3번 실패하면 멈춘다. attempts 를 지우면 다시 시도.
        if publish_time(post, cfg) > now:
            continue
        yield path, post


def main() -> int:
    dry = "--dry-run" in sys.argv
    cfg = load_config()
    failures = 0
    for path, post in due_posts(cfg):
        rel = path.parent.relative_to(POSTS.parent).as_posix()
        label = f"{post['date']} {post['type']} ({post.get('topic', '')})"
        if dry:
            print(f"발행 예정: {label}")
            continue
        try:
            media_id = publish(post, rel, cfg)
            post["status"] = "published"
            post["result"] = {"media_id": media_id, "published_at": now_kst().isoformat(timespec="seconds")}
            print(f"발행 완료: {label} → {media_id}")
        except (PublishError, requests.RequestException) as e:
            failures += 1
            post["status"] = "failed"
            post["attempts"] = post.get("attempts", 0) + 1
            post["result"] = {"error": str(e), "at": now_kst().isoformat(timespec="seconds")}
            print(f"발행 실패: {label} → {e}")
        save_post(path, post)
    if dry:
        upcoming = [f"{p['date']} {p['type']}" for _, p in iter_posts() if p.get("status") not in ("published", "hold")]
        print("대기 중:", ", ".join(upcoming) or "없음")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
