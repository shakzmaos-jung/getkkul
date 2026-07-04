# ADR-0002 — summary_length enum: 영문 키 채택

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-05
- **결정자**: Chess (운영자)
- **관련 스펙**: SSR §G (data model), REQ-D2, REQ-D3

## 맥락

SSR §G 초안은 요약 길이 enum을 한국어 값(`'짧게' / '보통' / '길게'`)으로 기술했다.
그러나 v1은 요약을 한국어 기본 + 영어 전환(REQ-D3)으로 다국어 지원한다. DB enum 값이
한국어에 묶이면 영어 UI에서 값-라벨 역매핑이 필요하고, 코드 전반에 한글 리터럴이 흩어진다.

## 결정

`summary_length` enum 값을 **영문 키**로 정의한다:

```
create type summary_length as enum ('short', 'normal', 'long');   -- 기본 'normal'
```

- `user_settings.summary_length` 와 `summaries.length_mode` 가 이 enum을 공용한다.
- 사용자 표시 라벨(짧게 / 보통 / 길게)은 `messages/ko.json` 의 i18n 키로 관리한다.
- 3단계 길이라는 스펙 *의도*(REQ-D2)는 불변. 저장 *값 표기*만 변경한다.

## 결과

- SSR §G 의 `summary_length` / `length_mode` enum 표기를 `['short','normal','long']` 로 갱신.
- 길이 모드 정의(REQ-D2 AC-D2.1 문장·불릿 개수)는 그대로 각 키에 매핑:
  short = 핵심 1~3문장 + 불릿 2~5 / normal = 1~7문장 + 불릿 2~10 / long = 1~12문장 + 불릿 10~20.
