# 315tools 인스타 자동 발행

@315tools_official 에 카드뉴스(매일 21:00)와 릴스(매일 12:00, KST)를 자동으로 올리는 저장소. 0315 미디어(`315tools/0315-media`)와 같은 방식이고, 저장소는 따로 둔다.

## 흐름

1. **매주 금요일 Claude 예약 작업**이 다음 주(토~금) 카드뉴스 7개와 릴스 7편을 만들어 이 저장소에 push 한다.
   - `docs/posts/<날짜>/card/` — `01.jpg`(1080×1350) + `post.json`
   - `docs/posts/<날짜>/reel/` — `reel.mp4`(1080×1920) + `post.json`
2. **GitHub Actions**(`publish.yml`, 30분마다)가 발행 시간이 지난 게시물을 인스타 API로 올리고 결과를 `post.json` 에 적는다.
3. 토큰은 매달 1일 자동 갱신(`refresh-token.yml`), 매주 월요일 연결 확인(`check.yml` → `reports/account.json`).

`config/account.json` 의 `start_date`(2026-10-31) 이전 게시물은 올리지 않는다. 2주차(10/24~10/30)는 Business Suite에 예약돼 있기 때문.

## post.json

```json
{"date": "2026-10-31", "type": "card", "topic": "QR 연락처", "slides": ["01.jpg"], "caption": "영문 본문 … #315tools ", "status": "ready"}
{"date": "2026-10-31", "type": "reel", "topic": "pdf-split", "video": "reel.mp4", "caption": "…", "status": "ready"}
```
- 본문은 영문만(한국어 번역은 넣지 않음). 마지막 해시태그 뒤 공백 1개.
- `"status": "hold"` → 발행 안 함. 3번 실패하면 자동으로 멈춤 → `result.error` 확인 후 `"attempts"` 를 지우면 다시 시도.
- 특정 시각으로 바꾸려면 `"publish_at": "2026-10-31T19:00:00+09:00"`.

## 처음 한 번 설정

1. **Settings → Pages**: Source `Deploy from a branch`, Branch `main` / 폴더 `/docs`
2. **Settings → Secrets and variables → Actions** (값은 채팅에 붙여넣지 말 것)

| 이름 | 내용 |
| --- | --- |
| `IG_TOKEN_TOOLS` | @315tools_official 인스타 로그인 방식 장기 토큰 |
| `IG_USER_ID` | @315tools_official 인스타 사용자 ID |
| `GH_PAT` | 토큰 자동 갱신용 (이 저장소 Secrets 쓰기 권한만 준 fine-grained 토큰) |

## 파일

| 경로 | 역할 |
| --- | --- |
| `config/account.json` | 계정, 발행 시각, 시작일 |
| `scripts/publish.py` | 발행 (`--dry-run` 으로 대기 목록만 확인) |
| `scripts/check_account.py` | 토큰·계정·발행 한도 확인 (게시 안 함) |
| `scripts/refresh_tokens.py` | 토큰 매달 갱신 |
