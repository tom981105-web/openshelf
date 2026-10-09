# OpenShelf automation

현재 사용하는 Google Apps Script 관련 파일만 유지합니다.

## Files

- `OpenShelf_Admin_v6_4_Code.gs`
  - 현재 배포용 통합 번들
  - 관리자 웹앱 + 시간별 자동수집 트리거 + 공개 Gemini 추천 엔드포인트 포함
- `admin-webapp.gs`
  - 관리자 웹앱 원본 소스
- `google-apps-script-trigger.gs`
  - GitHub Actions 자동수집 워크플로를 호출하는 스케줄러 원본 소스
- `README.md`
  - 이 문서

이전 Admin 배포 번들(v3, v4.x, v5.x, v6.0, v6.3)은 현재 사용하지 않으므로 저장소에서 제거했습니다. 필요 시 Git 히스토리에서 복구할 수 있습니다.

## Apps Script 설정

Script Properties에 다음 값을 사용합니다.

- `GITHUB_TOKEN`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `GEMINI_API_KEY`
- 선택: `GEMINI_MODEL`

현재 배포를 갱신할 때는 `OpenShelf_Admin_v6_4_Code.gs` 전체 내용을 Apps Script의 `Code.gs`에 반영한 뒤 기존 웹앱 배포에 새 버전을 배포합니다.
