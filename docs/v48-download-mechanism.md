# V48 다운로드 방식 진단

V47 실제 실행: V46 상세페이지 100건 응답은 확인되었으나 직접 CSV/XLS/XLSX 링크를 발견하지 못해 원본 검증은 0건이었습니다. 이는 다운로드가 불가능하다는 뜻이 아닙니다.

V48은 공식 상세페이지에서 다운로드 버튼, JavaScript 이벤트 이름, 폼 및 스크립트 경로를 최대 10개 표본에 대해 제한된 HTML로 확인하고 GitHub Actions 아티팩트로 저장합니다. **실제 파일 링크나 다운로드 성공 여부는 아직 확인하지 않습니다.** 사이트에서 동적 요청·로그인·이용조건 등이 필요할 수 있습니다.

실행: Actions → V48 official download mechanism diagnostics → Run workflow. 검사 완료 후 `public-data-v48-diagnostics` 아티팩트 확인. HTML 전체 및 인증 정보는 저장하지 않고, 일부 버튼·폼·스크립트 단서만 보존합니다. GitHub Actions Ubuntu는 24.04로 고정하고 Node 24 기반 액션으로 전환하여 전환 리스크를 줄입니다. upload-artifact@v4는 여전히 경고가 있을 수 있으며 후속 액션 버전 확인 후 전환합니다.
