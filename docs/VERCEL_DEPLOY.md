**Vercel 배포 안내**

- **필수 준비물**:
  - Vercel 계정
  - GitHub 레포지토리(현재 프로젝트를 푸시한 상태)
  - Vercel에서 발급한 `VERCEL_TOKEN` (프로젝트/조직에 대한 권한 필요)
  - Vercel 대시보드에서 확인한 `VERCEL_ORG_ID`와 `VERCEL_PROJECT_ID`(또는 프로젝트 연결 시 필요)

- **프로세스 요약**:
  1. 이 저장소를 GitHub에 푸시합니다.
  2. GitHub 리포지토리의 `Settings` → `Secrets and variables` → `Actions`에 다음 시크릿을 추가합니다:
     - `VERCEL_TOKEN` : Vercel Personal Token
     - `VERCEL_ORG_ID` : Vercel 조직 ID
     - `VERCEL_PROJECT_ID` : Vercel 프로젝트 ID
  3. Vercel 대시보드에서 같은 프로젝트에 `PUBG_API_KEY` 등 프로덕션 환경변수를 설정합니다.
  4. `main` 브랜치로 푸시하면 `.github/workflows/deploy-vercel.yml`이 자동으로 빌드/배포합니다.

- **참고 명령**:
```bash
# main 브랜치에 푸시(예시)
git add .
git commit -m "Add Vercel deploy config"
git push origin main
```

- **대시보드에서 ID 찾는 방법**:
  - Vercel 프로젝트 페이지 주소에서 `projectId`를 찾거나 Vercel CLI(`vercel projects ls`)를 사용하세요.

- **문제 발생 시 점검 포인트**:
  - GitHub Actions 로그 (빌드/배포 단계)
  - Vercel 대시보드의 빌드 로그
  - 프로덕션 환경변수가 제대로 설정되었는지 확인

***
파일: `vercel.json`과 `.github/workflows/deploy-vercel.yml`이 추가되었습니다.
