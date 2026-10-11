# V39 Gemini 스마트 검색 연동

OpenShelf GitHub Pages는 정적 사이트이므로 **Gemini API 키를 브라우저 코드나 GitHub 저장소에 입력하지 마세요.**

## 배포 방법 (관리자 작업 필요)
1. Cloudflare Workers에 `worker/ai-smart-search.mjs` 코드를 배포합니다.
2. Worker 비밀값 `GEMINI_API_KEY`를 설정합니다. 필요시 `GEMINI_MODEL`도 설정합니다 (기본값 `gemini-3.5-flash-lite`; 사용 가능한 모델을 Google AI Studio에서 확인).
3. Cloudflare Rate Limiting 바인딩을 `AI_LIMITER` 이름으로 설정합니다. 무제한 공개 API 사용 방지를 위해 미설정 시 응답을 거부합니다.
4. Worker URL을 `ai-search-config.js`의 `endpoint` 값에 등록합니다. **키는 등록하지 않습니다.** 반드시 https 엔드포인트를 사용하세요.
5. PR/브라우저 테스트 통과 후 배포를 검증합니다. 별도 Worker가 배포되기 전에는 기존 검색만 정상 작동하며 AI 버튼은 설정 안내를 제공합니다.

동작 구조: 브라우저의 기존 OpenShelf 검색 → 관련 상위 후보 최대 12개를 Worker에 제출 → Worker가 Gemini에 필요한 데이터만 보냄 → 허용된 후보 ID만 표시. AI 오류 시 기존 검색 결과는 유지됩니다.

주의: 검색 후보 메타데이터를 제3자 Gemini API에 전송합니다. 개인 정보나 비밀정보를 질문에 넣지 마세요. 비용과 호출 제한은 소유자의 Google/Cloudflare 설정에 따릅니다.
