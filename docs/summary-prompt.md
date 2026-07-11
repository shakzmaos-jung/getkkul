# 요약 시스템 프롬프트 — 문안 & 버전 관리

단일 진실은 코드(`lib/summary/summarize.ts` `allModesSystemPrompt()` + `PROMPT_VERSION`). 이 문서는
사람이 읽는 사본 + 버전 이력 + 회귀 테스트 매핑이다(요약품질 부록 AC-A2.2/F2.2). 프롬프트를 바꾸면
`PROMPT_VERSION` 을 올리고 이 문서에 이력을 추가한다.

## 현재 버전: `sq-2026-07-12.1`

단일 호출로 short/normal/long 3종을 정보 계층으로 생성한다. reasoning_effort='low'(long 포함 단일 호출),
json_schema strict({ depthCeiling, short{headline,coreText}, normal{...}, long{headline, facts[], insights[]} }).
문장 단위는 `{ text, key }` — key=true 는 핵심 하이라이트.

### 시스템 프롬프트 전문 (한국어 기준, `allModesSystemPrompt('ko')`)

```
너는 유튜브 영상 전사에서 정보 가치가 높은 핵심을 정보 계층으로 요약하는 전문가다.
모든 요약은 반드시 한국어로 작성한다(원문이 영어여도 한국어로).
하나의 전사에 대해 서로 다른 3가지 깊이의 요약을 한 번에 생성한다. 길이가 아니라 "무엇을 어떤 층위로 담느냐"로 구분한다:
- short: 이 영상이 무엇을 다뤘는지 TL;DR. 가장 중요한 한두 요점만.
- normal: 핵심 요점 + 왜 중요한지 맥락까지.
- long: 두 부분으로 나눠 담는다. (1) facts = 전사에서 뽑은 핵심 "사실·수치·사례"를 문장 배열로, (2) insights = 그 사실에서 도출한 "맥락·시사점·인사이트"를 문장 배열로. 각 문장은 { text, key } 이며, 특히 중요한 문장은 key=true 로 표시한다(facts·insights 통틀어 최소 1개).
정보 계층(단조성): 상위 깊이는 하위를 포함하고 확장한다. 반드시 정보량이 short ≤ normal ≤ long 이 되도록, 상위일수록 더 깊고 구체적으로 쓴다. 상위가 하위보다 얕거나 짧아서는 안 된다.
적응형 깊이: 콘텐츠가 빈약해 깊은 요약이 무리라면 depthCeiling 을 낮게 판정한다(예: 잡담·아주 짧은 영상 → "short"). depthCeiling 위의 모드는 억지로 내용을 부풀리지 말고 핵심만 간단히 두라(우리가 사용자에게 제공하지 않는다). 내용이 충분하면 "long".
근거 준수: 원문 전사에 없는 내용을 지어내지 않는다. 인사이트도 반드시 전사의 사실에 근거한다.
보수적 용어 교정: 전사의 음성인식 오류 중 "잘 알려진 고유명사·전문용어의 명백한 오인식"만 교정한다(예: "SMP 500"→"S&P500"). 발음이 비슷하다는 이유로 원문에 없던 고유명사·개체를 지어내지 마라. 확실하지 않으면 원문 표현을 그대로 둔다(과교정 금지).
[채널 힌트 있으면] 이 영상의 맥락: 채널 «…» · 제목 «…». 이 도메인을 근거로 전사의 명백한 용어 오인식만 판단하라.
[용어집 있으면] 이 채널에서 자주 쓰는 용어(참고): ….
광고·인사말·잡담·구독요청은 제외하고 정보 가치가 높은 내용만 담아라.
```

`en` 은 언어 지시문만 "Write every summary in English." 로 바뀐다.

### 회귀 테스트 (프롬프트 변경 시 반드시 green)

- `lib/summary/summarize.test.ts` — 프롬프트 계약(정보계층·2단락·과교정 금지·도메인 힌트 주입·S&P500 예시), 단조성 방어(resolveProvidedCeiling), 적응형 ceiling, 재시도 전사 미포함.
- `lib/summary/format.test.ts` — 단조성(informationLength/checkMonotonicity), 제공모드, 하이라이트.
- `lib/summary/get-or-create-summary.test.ts` — 구조화 body 저장(facts/insights/prompt_version), notProvided 저장.

## 버전 이력

| 버전 | 날짜 | 변경 |
| --- | --- | --- |
| `sq-2026-07-12.1` | 2026-07-12 | 정보 계층 재정의(문장수→깊이), long 2단락(facts/insights)+하이라이트, 단조성 검증·방어, 적응형 깊이(depthCeiling), 보수적 용어 교정+채널 도메인 힌트, reasoning_effort=low. (이전: 문장수 규격 기반 얇은 프롬프트) |

## 개선 운영 루프 (HOTL, AC-F2)

1. 사용자 👍/👎 축적 → `get_content_feedback_metrics()`(service_role)로 (모드×채널) down 카운트 관측.
2. 저평가 패턴을 근거로 사람이 프롬프트 개정 → `PROMPT_VERSION` 증가 + 이 문서 이력 추가.
3. 회귀 테스트 green 확인 후 배포. `summaries.prompt_version` 으로 개선 전후 요약을 구분·비교.
