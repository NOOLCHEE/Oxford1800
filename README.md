# Oxford 1800 words
> Oxford 사전 기반 단어 학습 앱. CSV 단어장을 바탕으로 단어를 학습하고 객관식·주관식 퀴즈를 풀 수 있는 순수 프론트엔드 웹 앱입니다.

---

## 주요 기능
- CSV 기반 Oxford 단어장 로드 및 단어·뜻 검색
- Normal `DAY 01~30`, Hard `DAY 31~60` 난이도 및 DAY 필터
- 단어별 학습 완료 상태 저장과 카드 뒤집기 표시
- 단어 옆 스피커 아이콘을 통한 발음 재생
- 객관식 4지선다 및 주관식 철자 퀴즈
- 퀴즈별 최고점수 이름 등록 및 점수 기록 저장
- 점수 기록 재도전, 개별 삭제, 최고점수 갱신

## 🛠️ 기술 스택 (Tech Stack)
* **Frontend**: HTML5, CSS3, Modern JavaScript (ES6+)
* **Data Format**: `data/oxford_1800.csv`
* **Storage**: 브라우저 `localStorage`에 학습 완료 상태와 점수 기록 저장 (서버 전송 없음)

## ⚙️ 실행 방법 (How to Run)

이 프로젝트는 서버 설치가 전혀 필요 없는 구조입니다.

### 로컬 환경에서 실행
1. 프로젝트 파일을 다운로드하거나 복사합니다.
2. 폴더 내의 `index.html` 파일을 더블 클릭하여 웹 브라우저(Chrome, Edge 등)로 열면 **즉시 실행**됩니다.

브라우저에서 `index.html`을 열거나 정적 파일 서버로 프로젝트 폴더를 제공하면 됩니다. CSV를 `fetch`로 읽기 때문에 브라우저 정책에 따라 정적 서버 사용을 권장합니다.

## 📂 폴더 구조 (Folder Structure)
```text
├── data/
│   └── oxford_1800.csv       # 단어 데이터 파일
├── js/
│   └── app.js                # [최종] 로드 및 퀴즈 엔진 자바스크립트 파일
├── index.html                # [최종] 화면 마크업 및 스타일 파일
└── README.md
```

## 배포
정적 파일 프로젝트이므로 GitHub Pages, Cloudflare Pages, Vercel, Netlify 등에 저장소를 연결해 배포할 수 있습니다.

## 라이선스
이 프로젝트는 **MIT License**를 따릅니다.
