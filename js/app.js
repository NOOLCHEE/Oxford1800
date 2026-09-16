let allWords = [];       // 전체 파싱된 CSV 데이터 저장 배열
let filteredWords = [];  // 필터 및 검색이 적용된 실시간 데이터 배열

// 퀴즈 상태 제어 변수
let choiceQuizData = [];
let choiceCurrentIdx = 0;
let choiceCorrectCount = 0;
let writeQuizData = [];
let writeCurrentIdx = 0;
let writeCorrectCount = 0;
const SCORE_STORAGE_KEY = 'oxford1800-score-records';
const COMPLETED_WORDS_STORAGE_KEY = 'oxford1800-completed-words';

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
        
        populateDayFilter(document.getElementById('level-filter').value);
        renderWordList();
        renderScoreRecords();
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

// 2. 난이도에 맞는 DAY 필터 선택지 주입
function populateDayFilter(level = 'ALL') {
    const dayFilter = document.getElementById('day-filter');
    const previousDay = dayFilter.value;
    const range = level === 'Normal' ? [1, 30] : level === 'Hard' ? [31, 60] : null;
    const days = range
        ? Array.from({ length: range[1] - range[0] + 1 }, (_, index) => `DAY_${String(range[0] + index).padStart(2, '0')}`)
        : [...new Set(allWords.map(w => w.day))].sort();

    dayFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'ALL';
    allOption.textContent = range
        ? `DAY ${String(range[0]).padStart(2, '0')}~${String(range[1]).padStart(2, '0')}`
        : '전체 DAY 선택';
    dayFilter.appendChild(allOption);
    
    days.forEach(day => {
        if (!day) return;
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day.replace('_', ' '); // DAY_01 -> DAY 01 로 깔끔하게 표기
        dayFilter.appendChild(option);
    });

    dayFilter.value = days.includes(previousDay) ? previousDay : 'ALL';
}

// 3. 조건부 검색 필터 핸들러
function handleFilterChange() {
    const levelVal = document.getElementById('level-filter').value;
    populateDayFilter(levelVal);
    const dayVal = document.getElementById('day-filter').value;
    const searchVal = document.getElementById('search-bar').value.toLowerCase().trim();

    filteredWords = allWords.filter(item => {
        const matchDay = (dayVal === 'ALL' || item.day === dayVal);
        const dayNumber = Number(item.day.replace('DAY_', ''));
        const matchLevel = (levelVal === 'ALL' || item.level === levelVal);
        const matchLevelDayRange = levelVal === 'Normal'
            ? dayNumber >= 1 && dayNumber <= 30
            : levelVal === 'Hard'
                ? dayNumber >= 31 && dayNumber <= 60
                : true;
        const matchSearch = (!searchVal || 
                             item.word.toLowerCase().includes(searchVal) || 
                             item.meaning.toLowerCase().includes(searchVal));
        return matchDay && matchLevel && matchLevelDayRange && matchSearch;
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

    const completedWords = getCompletedWords();
    filteredWords.forEach(item => {
        const card = document.createElement('div');
        const wordKey = getWordKey(item);
        const isCompleted = completedWords.includes(wordKey);
        card.className = `word-card${isCompleted ? ' completed' : ''}`;
        card.innerHTML = `
            <div class="word-card-inner">
                <div class="word-card-face front">
                    <div class="word-header">
                        <div class="word-title-group">
                            <span class="word-title">${item.word}</span>
                            ${item.audio ? `<button class="audio-icon-btn" data-audio="${escapeHTML(item.audio)}" data-word="${escapeHTML(item.word)}" onclick="playAudio(this.dataset.audio, this.dataset.word)" aria-label="${escapeHTML(item.word)} 발음 듣기" title="발음 듣기">🔊</button>` : ''}
                        </div>
                        <div class="word-header-actions">
                            <button class="complete-btn" data-word-key="${escapeHTML(wordKey)}" aria-label="학습 완료" title="학습 완료">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>
                                </svg>
                            </button>
                            <span class="badge ${item.level.toLowerCase() === 'hard' ? 'hard' : ''}">${item.level}</span>
                        </div>
                    </div>
                    <div class="word-meaning">${item.meaning}</div>
                </div>
                <div class="word-card-face back">
                    <div class="completed-icon" data-word-key="${escapeHTML(wordKey)}" role="button" tabindex="0" aria-label="학습 완료 해제" title="학습 완료 해제">
                        <svg viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">
                            <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="4"/>
                            <path d="M18 33.5 27 42l19-20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="5"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
        card.querySelectorAll('.complete-btn').forEach(button => {
            button.addEventListener('click', () => toggleWordCompleted(button.dataset.wordKey));
        });
        const completedIcon = card.querySelector('.completed-icon');
        completedIcon?.addEventListener('click', () => toggleWordCompleted(completedIcon.dataset.wordKey));
        completedIcon?.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleWordCompleted(completedIcon.dataset.wordKey);
            }
        });
        container.appendChild(card);
    });
}

function getWordKey(item) {
    return `${item.day}|${item.word}`;
}

function getCompletedWords() {
    try {
        const completedWords = JSON.parse(localStorage.getItem(COMPLETED_WORDS_STORAGE_KEY) || '[]');
        return Array.isArray(completedWords) ? completedWords : [];
    } catch (error) {
        console.warn('학습 완료 상태를 불러오지 못했습니다.', error);
        return [];
    }
}

function toggleWordCompleted(wordKey) {
    const completedWords = getCompletedWords();
    const completedIndex = completedWords.indexOf(wordKey);
    if (completedIndex >= 0) completedWords.splice(completedIndex, 1);
    else completedWords.push(wordKey);
    localStorage.setItem(COMPLETED_WORDS_STORAGE_KEY, JSON.stringify(completedWords));
    renderWordList();
}

// 외부 TTS를 우선 사용하고, 차단되면 브라우저 음성으로 재생합니다.
function playAudio(url, word) {
    const speakWord = () => {
        if (!word || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    };

    if (!url) {
        speakWord();
        return;
    }

    const audio = new Audio(url);
    audio.addEventListener('error', speakWord, { once: true });
    audio.play().catch(speakWord);
}

// 5. 상단 반응형 메뉴 전환 제어
function switchTab(tabId) {
    setActiveTab(tabId, event.currentTarget);

    if (tabId === 'tab-choice') initChoiceQuiz();
    if (tabId === 'tab-write') initWriteQuiz();
    if (tabId === 'tab-scores') renderScoreRecords();
}

function setActiveTab(tabId, activeButton = null) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (activeButton) activeButton.classList.add('active');
    else {
        const tabButton = [...document.querySelectorAll('.tab-btn')].find(button => button.getAttribute('onclick')?.includes(tabId));
        tabButton?.classList.add('active');
    }
}

function getScoreRecords() {
    try {
        const records = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || '[]');
        return Array.isArray(records) ? records : [];
    } catch (error) {
        console.warn('점수 기록을 불러오지 못했습니다.', error);
        return [];
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}

function getScoreFilterLabel() {
    const day = document.getElementById('day-filter').value;
    const level = document.getElementById('level-filter').value;
    const search = document.getElementById('search-bar').value.trim();
    const dayLabel = day !== 'ALL'
        ? day.replace('_', ' ')
        : level === 'Normal'
            ? 'DAY 01~30'
            : level === 'Hard'
                ? 'DAY 31~60'
                : '전체 DAY';
    return [dayLabel, level !== 'ALL' ? level : '전체 난이도', search ? `검색: ${search}` : '전체 단어'].join(' · ');
}

function saveScoreRecord(mode, correct, total) {
    const records = getScoreRecords();
    const key = `${mode}|${document.getElementById('day-filter').value}|${document.getElementById('level-filter').value}|${document.getElementById('search-bar').value.trim().toLowerCase()}`;
    const existingIndex = records.findIndex(item => item.key === key);
    const existingRecord = existingIndex >= 0 ? records[existingIndex] : null;
    const currentScore = total > 0 ? correct / total : 0;
    const previousScore = existingRecord && existingRecord.total > 0
        ? existingRecord.correct / existingRecord.total
        : -1;

    if (existingRecord && currentScore <= previousScore) {
        return;
    }

    const playerName = (prompt('최고기록을 경신했습니다! 이름을 등록해 주세요.', existingRecord?.name || '') || '').trim() || '익명';
    const record = {
        key,
        mode,
        correct,
        total,
        name: playerName,
        day: document.getElementById('day-filter').value,
        level: document.getElementById('level-filter').value,
        filterLabel: getScoreFilterLabel(),
        updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(records));
    renderScoreRecords();
    setActiveTab('tab-scores');
}

function deleteScoreRecord(key) {
    const records = getScoreRecords().filter(record => record.key !== key);
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(records));
    renderScoreRecords();
}

function retryScoreRecord(record) {
    const [, day, level, ...searchParts] = record.key.split('|');
    const search = searchParts.join('|');
    const levelFilter = document.getElementById('level-filter');
    const dayFilter = document.getElementById('day-filter');
    const searchBar = document.getElementById('search-bar');

    levelFilter.value = level || 'ALL';
    populateDayFilter(levelFilter.value);
    dayFilter.value = dayFilter.querySelector(`option[value="${day}"]`) ? day : 'ALL';
    searchBar.value = search;
    handleFilterChange();

    const tabId = record.mode === 'choice' ? 'tab-choice' : 'tab-write';
    setActiveTab(tabId);
    if (record.mode === 'choice') initChoiceQuiz();
    else initWriteQuiz();
}

function renderScoreRecords() {
    const container = document.getElementById('score-list-container');
    if (!container) return;
    const records = getScoreRecords().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (records.length === 0) {
        container.innerHTML = '<p class="empty-score">아직 기록된 점수가 없습니다. 퀴즈를 완료해 보세요.</p>';
        return;
    }
    container.innerHTML = records.map(record => {
        const updatedAt = new Date(record.updatedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
        const modeLabel = record.mode === 'choice' ? '객관식' : '주관식';
        const playerName = record.name || '익명';
        const recordDay = record.day || record.key.split('|')[1] || 'ALL';
        const recordFilterLabel = record.filterLabel || '';
        const dayLabel = recordDay !== 'ALL'
            ? recordDay.replace('_', ' ')
            : record.level === 'Normal' || recordFilterLabel.includes('DAY 01~30')
                ? 'DAY 01~30'
                : record.level === 'Hard' || recordFilterLabel.includes('DAY 31~60')
                    ? 'DAY 31~60'
                    : '전체 DAY';
        const score = record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0;
        return `<div class="score-row">
            <span class="score-meta"><span class="score-mode ${record.mode === 'choice' ? 'choice' : 'write'}">${modeLabel}</span><span class="score-detail"><span class="score-day">${escapeHTML(dayLabel)}</span><span class="score-date">${escapeHTML(updatedAt)}</span></span></span>
            <span class="score-result"><span class="score-label">최고점수</span><span class="score-record-name">${escapeHTML(playerName)}</span><span class="score-value">${score}점</span></span>
            <span class="score-actions">
                <button class="retry-score-btn" data-score-key="${escapeHTML(record.key)}">재도전</button>
                <button class="delete-score-btn" data-score-key="${escapeHTML(record.key)}">삭제</button>
            </span>
        </div>`;
    }).join('');
    container.querySelectorAll('.retry-score-btn').forEach(button => {
        const record = records.find(item => item.key === button.dataset.scoreKey);
        button.addEventListener('click', () => retryScoreRecord(record));
    });
    container.querySelectorAll('.delete-score-btn').forEach(button => {
        button.addEventListener('click', () => deleteScoreRecord(button.dataset.scoreKey));
    });
}

// 6. 🎯 객관식 테스트 엔진 (4지 선다 자동 오답 보기 풀 결합)
function getQuizWords() {
    const selectedDay = document.getElementById('day-filter').value;
    return selectedDay === 'ALL'
        ? [...allWords]
        : allWords.filter(item => item.day === selectedDay);
}

function initChoiceQuiz() {
    const quizWords = getQuizWords();
    if (quizWords.length < 4) {
        alert("객관식 테스트를 출제하려면 선택한 DAY에 4개 이상의 단어가 필요합니다.");
        switchTab('tab-list');
        return;
    }
    choiceQuizData = quizWords.sort(() => 0.5 - Math.random()).slice(0, Math.min(10, quizWords.length));
    choiceCurrentIdx = 0;
    choiceCorrectCount = 0;
    showChoiceQuestion();
}

function showChoiceQuestion() {
    document.getElementById('choice-result').textContent = '';
    const currentItem = choiceQuizData[choiceCurrentIdx];

    document.getElementById('choice-progress').textContent = `${choiceCurrentIdx + 1} / ${choiceQuizData.length}`;
    document.getElementById('choice-question').textContent = currentItem.word;

    // 사지선다 배열 생성 (정답 1개 기본 포함)
    let options = [currentItem.meaning];
    const wrongPool = getQuizWords().filter(w => w.meaning !== currentItem.meaning);
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
        choiceCorrectCount++;
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

    if (choiceCurrentIdx === choiceQuizData.length - 1) {
        saveScoreRecord('choice', choiceCorrectCount, choiceQuizData.length);
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
    const quizWords = getQuizWords();
    if (quizWords.length === 0) {
        alert("주관식 퀴즈를 출제할 데이터가 없습니다.");
        switchTab('tab-list');
        return;
    }
    writeQuizData = quizWords.sort(() => 0.5 - Math.random()).slice(0, Math.min(10, quizWords.length));
    writeCurrentIdx = 0;
    writeCorrectCount = 0;
    showWriteQuestion();
}

function showWriteQuestion() {
    document.getElementById('write-result').textContent = '';
    document.getElementById('write-input').value = '';
    document.getElementById('write-input').disabled = false;
    
    const currentItem = writeQuizData[writeCurrentIdx];
    document.getElementById('write-progress').textContent = `${writeCurrentIdx + 1} / ${writeQuizData.length}`;
    document.getElementById('write-question').textContent = currentItem.meaning;
    document.getElementById('write-hint').textContent = `힌트: ${createWriteHint(currentItem.word)}`;
    document.getElementById('write-input').focus();
}

function createWriteHint(word) {
    const characters = [...word];
    const letterIndexes = characters
        .map((character, index) => /[a-zA-Z]/.test(character) ? index : -1)
        .filter(index => index >= 0);
    const shuffledIndexes = [...letterIndexes].sort(() => Math.random() - 0.5);
    const revealedIndexes = new Set(shuffledIndexes.slice(0, Math.min(2, letterIndexes.length)));

    return characters.map((character, index) => {
        if (!/[a-zA-Z]/.test(character)) return character;
        return revealedIndexes.has(index) ? character : '_';
    }).join('');
}

function checkWriteAnswer() {
    const userInput = document.getElementById('write-input').value.trim().toLowerCase();
    const currentItem = writeQuizData[writeCurrentIdx];
    const targetAnswer = currentItem.word.trim().toLowerCase();
    const resultDiv = document.getElementById('write-result');

    if (!userInput) return;

    document.getElementById('write-input').disabled = true;

    if (userInput === targetAnswer) {
        writeCorrectCount++;
        resultDiv.textContent = "⭕ 정답입니다!";
        resultDiv.className = "result-text success";
    } else {
        resultDiv.textContent = `❌ 오답입니다! 정답 스펠링: ${currentItem.word}`;
        resultDiv.className = "result-text error";
    }

    if (writeCurrentIdx === writeQuizData.length - 1) {
        saveScoreRecord('write', writeCorrectCount, writeQuizData.length);
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
