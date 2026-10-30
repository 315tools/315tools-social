# 315tools 릴스(사용법 영상) 주간 제작 RUNBOOK

@315tools_official 에 매일 낮 12시(KST) 올라가는 사용법 릴스 7편을 매주 한 번에 만드는 방법. 카드뉴스와는 별개.
발행은 이 저장소의 GitHub Actions(`publish.yml`, 30분마다)가 한다. Business Suite 예약은 더 이상 쓰지 않는다.

## 규칙

- 매주 7편(하루 1편). 게시 기간 = 작업일(금) 다음 날 토요일 ~ 그다음 금요일, 매일 12:00 KST.
- 1080×1920 세로 MP4, 30fps, H.264/AAC, 20~35초 목표(최대 40초), 30MB 이하.
- 영어 AI 내레이션(Kokoro `af_heart`) + 영어 자막 + 효과음.
- 구성: 인트로 카드 → 실제 사이트 조작 3~4단계(STEP n/N) → 아웃트로 카드(잠금 아이콘, 체크 칩 3개, Link in bio, 주소) → **브랜드 마무리(약 3초)**: 큰 `315tools` 로고(315 흰색·tools 앰버) + 밑줄 + `three · one · five · tools` 칩 + 315tools.com + 음성 "Three, one, five tools." + 차임.
- **발음 규칙**: 315tools 는 영어로도 "three one five tools"(한글 삼일오툴즈). `say`에 숫자 `315` 금지 — Kokoro가 "three hundred fifteen"으로 읽음. 주소는 "p d f dot three one five tools dot com"처럼 풀어 쓰기. 자막(`sub`)·화면 글자는 그대로 315tools.
- **누를 곳은 반드시 `point` → `press`**: 스포트라이트 + 앰버 테두리 + 손가락 + 말풍선("Tap ~"). 입력은 `type`으로 한 글자씩.
- 사이트(pdf·image·calc·paperwork·font·game·qr, 새 사이트가 생기면 포함)를 고르게. 같은 주에 한 사이트 최대 2편. 아래 "사용한 주제"와 겹치지 않게.
- 사이트에 실제로 있는 기능만. 영상 속 결과 수치(예: 3.5 MB → 199 KB)는 실제로 녹화된 값만 말하기.
- 데모 파일은 가상 데이터만(가상 회사 "Blue Peak Trading" 등). 실존 브랜드·인물 금지.

## 파일

| 경로 | 역할 |
| --- | --- |
| `kit/reels/rec/record.js` | 사이트 녹화 + 오버레이(스포트라이트·손가락·자막·카드·브랜드 마무리) |
| `kit/reels/rec/tts.py` | 시나리오의 `say` 문장 → 음성 wav |
| `kit/reels/rec/assemble.py` | 녹화 프레임 + 음성 + 효과음 → MP4 |
| `kit/reels/rec/make_reel.sh` | 위 3개를 순서대로 실행 (한 편 만들기) |
| `kit/reels/rec/serve.py` | 사이트 저장소의 각 사이트를 로컬 포트로 띄움 |
| `kit/reels/rec/probe.js`, `probe_tab.js` | 새 시나리오용 버튼·입력칸 선택자 찾기 |
| `kit/reels/rec/sheet.sh` | 영상 10장 미리보기(검사용) |
| `kit/reels/rec/make_samples.py` | 데모 파일(가상 PDF·사진·로고) 생성 |
| `kit/reels/scn/*.json` | 검증된 시나리오 14편 |

## 만드는 순서

1. 사이트 저장소 `315tools/315tools` 를 **읽기 전용**으로 clone (녹화용, 쓰기 금지)
   ```bash
   git clone --depth 1 https://github.com/315tools/315tools /home/claude/315tools
   ```
2. 작업 폴더 준비 (저장소 밖, 예: `/home/claude/rec`)
   ```bash
   mkdir -p /home/claude/rec && cp -r kit/reels/rec/* /home/claude/rec/ && cp -r kit/reels/scn /home/claude/rec/
   cd /home/claude/rec
   npm init -y && npm i @sparticuz/chromium@131 puppeteer-core@23
   npm pack @fontsource/noto-sans@5.1.0 && tar xzf fontsource-noto-sans-5.1.0.tgz
   pip install --break-system-packages kokoro-onnx soundfile reportlab fonttools
   mkdir -p dl
   curl -L -o dl/kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
   curl -L -o dl/voices.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
   python3 make_samples.py .
   python3 serve.py /home/claude/315tools/sites &   # 백그라운드
   ```
   - 포트: home 8080 · pdf 8081 · image 8082 · calc 8083 · paperwork 8084 · font 8085 · game 8086 · qr 8087
   - `ls /home/claude/315tools/sites` 에 새 사이트가 있으면 `serve.py` 의 PORTS 에 추가하고 소개 편을 넣기.
   - 작업 환경에서는 *.315tools.com 직접 접속이 막혀 있어 저장소 원본을 띄워 녹화함(= 최신 main과 같은 화면).
3. 이번 주 7편 고르기: `scn/` 에서 안 쓴 것 우선, 모자라면 새 시나리오 작성
   - `node probe.js http://127.0.0.1:<포트>/ shot.png` 로 버튼·입력칸 선택자 확인 후 작성
   - 결과 화면 문구는 미리 한 번 실행해 확인해서 `waitFor` 에 사용
4. 한 편씩 **순서대로** 만들기 (동시에 돌리면 느려져 영상이 늘어짐)
   ```bash
   KOKORO_DIR=dl ./make_reel.sh scn/<id>.json reels/<id>.mp4
   ```
5. **검사**: `./sheet.sh reels/<id>.mp4 sheet.png` 를 직접 열어 확인 — 스포트라이트가 누르는 버튼 위에 있는지, 자막이 카드·버튼을 가리지 않는지, 결과 화면이 나오는지, 길이 40초 이하. 문제 있으면 시나리오 고쳐 다시.
6. 날짜별 폴더에 넣기: `docs/posts/<YYYY-MM-DD>/reel/reel.mp4` + `post.json`
   ```json
   {"date":"2026-11-07","type":"reel","topic":"<시나리오 id>","video":"reel.mp4","caption":"<영문 본문>","status":"ready"}
   ```
   - caption: 영문만, 이모지 약간, 단계 번호, "Link in bio", 해시태그 5~6개, **마지막 해시태그 뒤 공백 1개**. 한국어 번역은 넣지 않음.
7. `python3 scripts/publish.py --dry-run` → 7편이 대기 목록에 있는지 확인
8. `git add` / `commit` / `pull --rebase` / `push` (카드뉴스가 먼저 push 했을 수 있으니 pull --rebase 필수)
9. 확인용 `reels-captions-weekN.txt`(날짜·파일명·영문 본문·[한국어 번역])를 사용자에게 보내고, 녹화 중 사이트 버그를 발견하면 함께 알리기. 문제 있는 편은 그 `post.json` 의 `status` 를 `"hold"` 로.
10. 아래 "사용한 주제"에 이번 주 추가, 새 시나리오는 `kit/reels/scn/` 에 추가, 고친 스크립트는 `kit/reels/rec/` 에 반영 후 commit.

**이미 그 주 `docs/posts/<날짜>/reel/` 이 있으면 새로 만들지 말고**, 7일이 다 있는지만 확인한다.

## 시나리오 형식 (`scn/<id>.json`)

- `url`(로컬 포트), `frame`(도구가 iframe 안이면 생략 = `#tool-frame`, calc·game처럼 본문에 있으면 `false`), `prep`(녹화 전 동작)
- `intro{kicker,title,sub,url,say}` · `scenes[{say,sub,actions}]` · `outro{title,chips[3],url,say}`
- `say` = 읽는 문장(주소는 풀어서, 숫자 315 금지), `sub` = 자막(`<em>`은 앰버, `<br>` 줄바꿈). 장면 길이는 음성 길이에 자동으로 맞춤.
- 동작: `scroll{sel,main?,text?,offset,ms}` · `point{sel,main?,text?,up?,label,ms}` · `press{noclick?,keep?,ms}` · `type{sel,main?,text,cps,nochange?}` · `select{sel,main?,value}` · `upload{sel,files:["$SAMPLES/..."]}` · `waitFor{text|re|gone,timeout,ms}` · `draw{sel,glyphs:["A","B","C"] 또는 ["sig"],next}` · `drag{sel,label,to:{sel,fx,fy}}` · `unpoint` · `wait{ms}` · `frameEval{js}` · `mainEval{js}` · `clickLoop{sel}`
  - `main:true` = 본문(도구 선택 패널 등), 없으면 도구 칸(iframe). `text` = 그 글자를 포함한 가장 안쪽의 보이는 요소, `up:n` = 부모로 n단계
  - 탭 버튼을 누르면 사이트가 스스로 스크롤하므로 press 뒤 강조는 자동으로 걷힘(`keep:true`로 유지)
  - qr 사이트 탭(`a.tab`)은 누르면 다른 페이지(/wifi/ 등)로 이동 → `url`을 그 페이지로 시작하고 탭은 `press{noclick:true}`
  - `brand:false` 면 브랜드 마무리 생략, `brand_say` 로 마무리 음성 변경

## 알려진 사이트 버그 (2026-10-23)

- paperwork 패킹리스트: 포장 수량 입력 중에는 CBM 칸이 맞게(예: 4.32) 나오지만 칸을 벗어나면(change) 0으로 돌아감. 미리보기 합계는 정확. → 영상은 `type{nochange:true}` 로 입력 중 상태를 보여 줌. 사이트가 고쳐지면 nochange 빼도 됨.

## 사용한 주제

- **1주차** 10/17~10/23: pdf-merge(토) / game-wheel(일) / image-compress-kb(월) / calc-vat(화) / paperwork-quote(수) / font-handwriting(목) / pdf-compress(금)
- **2주차** 10/24~10/30 (로고 마무리·'three one five' 발음 첫 적용, 첫 GitHub 자동 발행): qr-wifi(토) / game-namedraw(일) / pdf-sign(월) / image-social(화) / calc-tip(수) / paperwork-packing(목) / qr-logo(금)
- **3주차** 10/31~11/6: 10/30 예약 실행 결과 확인 중 (이 줄은 확인 후 갱신)

### 아직 안 쓴 기능 (아이디어)

QR 텍스트·연락처·이메일·문자·바코드·QR 읽기 / PDF 나누기·워터마크·페이지 번호·비밀번호·텍스트 추출·양식 채우기·비교 / 이미지 크기 조절·자르기·HEIC→JPG·배경 제거·얼굴 흐리기·EXIF 제거·GIF·콜라주(증명사진은 실제 얼굴 사진 필요 — 보류) / 계산기 대출·복리·퍼센트·할인·실수령액·손익분기·마진·저축·인플레이션·은퇴 / 서류 인보이스·발주서·영수증·국가별 통관 가이드 / 게임 주사위·랜덤 숫자·동전·세계 미니게임 / 폰트 인쇄 시트 촬영 방식·한글
