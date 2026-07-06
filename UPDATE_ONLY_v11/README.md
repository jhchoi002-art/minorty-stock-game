# 소수결 게임 Ultimate v10

정식 배포용으로 정리한 버전입니다.

## 핵심 기능
- 방 만들기 / 방코드 자동 생성
- 학생 QR 접속
- 교사용 화면 / 학생 화면 / 전자칠판 화면
- 보기 3개 개별 입력 방식
- 개인전 / 팀전
- 학생 직접 조 선택 / 랜덤 균형 배정
- 교사가 학생 조 변경 가능
- 학생은 라운드 종료 전까지 선택 변경 가능
- 선택 비율 그래프
- 개인/팀 랭킹
- CSV 저장
- 한글 이름 입력 안정화

## Vercel 웹 배포
1. ZIP 압축 해제
2. Vercel에서 새 프로젝트 또는 기존 프로젝트 업데이트
3. 폴더 업로드
4. Framework: Other / Static
5. Build Command: 비워두기
6. Output Directory: 비워두기 또는 .

## Firebase Rules
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## GitHub 없이 업데이트하는 방법
이 폴더의 `Deploy_Update.bat`를 사용할 수 있습니다.
처음 한 번은 Node.js LTS 설치가 필요합니다.
