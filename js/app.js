let allWords = [];       // 전체 파싱된 CSV 데이터 저장 배열
let filteredWords = [];  // 필터 및 검색이 적용된 실시간 데이터 배열

// 퀴즈 상태 제어 변수
let choiceQuizData = [];
let choiceCurrentIdx = 0;
let writeQuizData = [];
let writeCurrentIdx = 0;

// 페이지가 완전히 열리면 데이터 로드 함수 가동
document.addEventListener("DOMContentLoaded", () => {
    loadCSVData();
});

// 1. AJAX 통신으로 oxford_1800.csv 파일 가져오기
async function loadCSVData() {
    try {
        const response = await fetch('data/oxford_1800.csv');
        if (!response.ok) throw new Error("oxford_1800.csv 파일을 찾을 수 없습니다.");
        
        const csvText = await response.text();
        allWords = parseCSV(csvText);
        filteredWords = [...allWords];
        
        populateDayFilter();
        renderWordList();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        document.getElementById('word-list-container').innerHTML = 
            `<p style="color:red; font-weight:bold; grid-column: 1/-1; text-align:center; padding: 30px 0;">
                오류: 'data/oxford_1800.csv' 파일을 읽어오지 못했습니다.<br>폴더명과 파일 이름을 다시 한 번 체크해 주세요.
            </p>`;
    }
}

// 📌 따옴표 컴마 처리 기술이 탑재된 고급 CSV 파서 엔진
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return []; // 데이터가 없거나 헤더만 있으면 빈 배열 반환
    
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 빈 라인 패스

        const row = [];
        let inQuotes = false;
        let currentToken = "";

        // 한 글자씩 검사하며 따옴표 안의 쉼표 보호 분리 로직 실행
        for (let j = 0; char = line[j], j < line.length; j++) {
            if (char === '"') {
                inQuotes = !inQuotes; // 따옴표 시작/끝 토글
            } else if (char === ',' && !inQuotes) {
                row.push(currentToken.trim().replace(/^"|"$/g, ''));
                currentToken = "";
            } else {
                currentToken += char;
            }
        }
        row.push(currentToken.trim().replace(/^"|"$/g, '')); // 마지막 데이터 처리

        // 실제 구조 매핑: WORD_ID, WORD, MEANING, DAY, STATUS, LEVEL, AUDIO
        if (row.length >= 3) {
            result.push({
                word: row[1] ? row[1].trim() : '',
                meaning: row[2] ? row[2].trim() : '',
                day: row[3] ? row[3].trim() : 'DAY_01',
                status: row[4] ? row[4].trim() : '미암기',
                level: row[5] ? row[5].trim() : 'Normal',
                audio: row[6] ? row[6].trim() : ''
            });
        }
    }
    return result;
}

// 2. 대시보드 고유 DAY 필터 주입
function populateDayFilter() {
    const dayFilter = document.getElementById('day-filter');
    const days = [...new Set(allWords.map(w => w.day))].sort();
    
    days.forEach(day => {
        if (!day) return;
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day.replace('_', ' '); // DAY_01 -> DAY 01 로 깔끔하게 표기
        dayFilter.appendChild(option);
    });
}

// 3. 조건부 검색 필터 핸들러
function handleFilterChange() {
    const dayVal = document.getElementById('day-filter').value;
    const levelVal = document.getElementById('level-filter').value;
    const searchVal = document.getElementById('search-bar').value.toLowerCase().trim();

    filteredWords = allWords.filter(item => {
        const matchDay = (dayVal === 'ALL' || item.day === dayVal);
        const matchLevel = (levelVal === 'ALL' || item.level === levelVal);
        const matchSearch = (!searchVal || 
                             item.word.toLowerCase().includes(searchVal) || 
                             item.meaning.toLowerCase().includes(searchVal));
        return matchDay && matchLevel && matchSearch;
    });

    renderWordList();
}

// 4. 단어 리스트 컴포넌트 렌더링
function renderWordList() {
    const container = document.getElementById('word-list-container');
    container.innerHTML = '';

    if (filteredWords.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-light); padding: 40px 0;">조건에 맞는 단어가 없습니다.</p>';
        return;
    }

    filteredWords.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div class="word-header">
                <span class="word-title">${item.word}</span>
                <span class="badge ${item.level.toLowerCase() === 'hard' ? 'hard' : ''}">${item.level}</span>
            </div>
            <div class="word-meaning">${item.meaning}</div>
            ${item.audio ? `<button class="audio-btn" onclick="playAudio('${item.audio}')">🔊 발음 듣기</button>` : ''}
        `;
        container.appendChild(card);
    });
}

// 원본 구글 TTS 발음 연동 함수
function playAudio(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(e => console.log("음원 파일 재생 지연:", e));
}

// 5. 상단 반응형 메뉴 전환 제어
function switchTab(tabId) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'tab-choice') initChoiceQuiz();
    if (tabId === 'tab-write') initWriteQuiz();
}

// 6. 🎯 객관식 테스트 엔진 (4지 선다 자동 오답 보기 풀 결합)
function initChoiceQuiz() {
    if (filteredWords.length < 4) {
        alert("객관식 테스트를 출제하기 위해 최저 4개 이상의 검색 단어가 화면에 활성화되어 있어야 합니다.");
        switchTab('tab-list');
        return;
    }
    choiceQuizData = [...filteredWords].sort(() => 0.5 - Math.random()).slice(0, Math.min(10, filteredWords.length));
    choiceCurrentIdx = 0;
    showChoiceQuestion();
}

function showChoiceQuestion() {
    document.getElementById('choice-result').textContent = '';
    const currentItem = choiceQuizData[choiceCurrentIdx];

    document.getElementById('choice-progress').textContent = `${choiceCurrentIdx + 1} / ${choiceQuizData.length}`;
    document.getElementById('choice-question').textContent = currentItem.word;

    // 사지선다 배열 생성 (정답 1개 기본 포함)
    let options = [currentItem.meaning];
    const wrongPool = allWords.filter(w => w.meaning !== currentItem.meaning);
    const shuffledWrong = wrongPool.sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < 3; i++) {
        if (shuffledWrong[i]) options.push(shuffledWrong[i].meaning);
    }
    options.sort(() => 0.5 - Math.random()); // 보기 배치 완전 랜덤화

    const optionsContainer = document.getElementById('choice-options');
    optionsContainer.innerHTML = '';
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => checkChoiceAnswer(opt, currentItem.meaning, btn);
        optionsContainer.appendChild(btn);
    });
}

function checkChoiceAnswer(selected, correct, clickedBtn) {
    const resultDiv = document.getElementById('choice-result');
    document.querySelectorAll('#choice-options .option-btn').forEach(btn => btn.disabled = true);

    if (selected === correct) {
        resultDiv.textContent = "⭕ 정답입니다!";
        resultDiv.className = "result-text success";
        clickedBtn.style.backgroundColor = "#d1fae5";
        clickedBtn.style.borderColor = "var(--success)";
    } else {
        resultDiv.textContent = `❌ 오답입니다! 정답: ${correct}`;
        resultDiv.className = "result-text error";
        clickedBtn.style.backgroundColor = "#fee2e2";
        clickedBtn.style.borderColor = "var(--error)";
    }
}

function nextChoiceQuestion() {
    if (choiceCurrentIdx < choiceQuizData.length - 1) {
        choiceCurrentIdx++;
        showChoiceQuestion();
    } else {
        alert("🏁 객관식 단어 테스트를 모두 정복하셨습니다!");
        initChoiceQuiz();
    }
}

// 7. ✍️ 주관식 철자 타이핑 테스트 엔진
function initWriteQuiz() {
    if (filteredWords.length === 0) {
        alert("주관식 퀴즈를 출제할 데이터가 없습니다.");
        switchTab('tab-list');
        return;
    }
    writeQuizData = [...filteredWords].sort(() => 0.5 - Math.random()).slice(0, Math.min(10, filteredWords.length));
    writeCurrentIdx = 0;
    showWriteQuestion();
}

function showWriteQuestion() {
    document.getElementById('write-result').textContent = '';
    document.getElementById('write-input').value = '';
    document.getElementById('write-input').disabled = false;
    
    const currentItem = writeQuizData[writeCurrentIdx];
    document.getElementById('write-progress').textContent = `${writeCurrentIdx + 1} / ${writeQuizData.length}`;
    document.getElementById('write-question').textContent = currentItem.meaning;
    document.getElementById('write-input').focus();
}

function checkWriteAnswer() {
    const userInput = document.getElementById('write-input').value.trim().toLowerCase();
    const currentItem = writeQuizData[writeCurrentIdx];
    const targetAnswer = currentItem.word.trim().toLowerCase();
    const resultDiv = document.getElementById('write-result');

    if (!userInput) return;

    document.getElementById('write-input').disabled = true;

    if (userInput === targetAnswer) {
        resultDiv.textContent = "⭕ 정답입니다!";
        resultDiv.className = "result-text success";
    } else {
        resultDiv.textContent = `❌ 오답입니다! 정답 스펠링: ${currentItem.word}`;
        resultDiv.className = "result-text error";
    }
}

function nextWriteQuestion() {
    if (writeCurrentIdx < writeQuizData.length - 1) {
        writeCurrentIdx++;
        showWriteQuestion();
    } else {
        alert("🏁 주관식 스펠링 테스트를 모두 끝마치셨습니다!");
        initWriteQuiz();
    }
}
