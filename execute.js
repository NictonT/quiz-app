// execute.js - Compact Quiz Logic

let questions = [];
let randomizedQuestions = [];
let originalQuestionsCache = [];
let currentIndex = 0;
let selectedAnswer = null;
let wrongAnswers = [];
let retryingQuestion = false;
let totalQuestions = 0;
let completedQuestions = 0;
let currentQuestionStartTime = 0;
let questionTimeStats = [];
let timeStatsRendered = false;
let currentSortColumn = null;
let currentSortDirection = 'none';
let domCache = {};

function cacheDOMElements() {
    const ids = [
        'quizPage', 'resultPage', 'fileNameDisplay', 'questionText',
        'answersContainer', 'submitButton', 'skipButton', 'progressBarFill',
        'questionCount', 'correctList', 'wrongList', 'scoreText',
        'correctPercentage', 'wrongPercentage', 'timeStatsContainer',
        'toggleTimeDetailsButton', 'timeStatsTableBody', 'totalTimeValue',
        'avgTimeValue', 'nightModeToggleQuiz', 'nightModeToggleResult',
        'timeBarChart', 'timeLineChart', 'timeHistogramChart'
    ];
    ids.forEach(id => domCache[id] = document.getElementById(id));
    domCache.helpButton = document.querySelector('.help-button');
    domCache.slides = document.querySelectorAll('.slide');
    domCache.sortIndicators = document.querySelectorAll('.sort-indicator');
}

document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    if (domCache.quizPage) {
        const storedData = localStorage.getItem('quizDataToExecute');
        if (storedData) {
            try {
                let loadedQuestions = JSON.parse(storedData);
                localStorage.removeItem('quizDataToExecute');

                let originalFileName = localStorage.getItem('quizFileNameToExecute');
                if (originalFileName && domCache.fileNameDisplay) {
                    domCache.fileNameDisplay.textContent = originalFileName;
                    localStorage.removeItem('quizFileNameToExecute');
                }

                if (!Array.isArray(loadedQuestions)) {
                    loadedQuestions = (loadedQuestions && loadedQuestions.question && loadedQuestions.answers && loadedQuestions.correctAnswer) ? [loadedQuestions] : [];
                }

                questions.length = 0;
                originalQuestionsCache = loadedQuestions.filter(q =>
                    q && typeof q === 'object' && q.question && typeof q.answers === 'object' &&
                    !Array.isArray(q.answers) && Object.keys(q.answers).length > 0 &&
                    q.correctAnswer && q.answers.hasOwnProperty(q.correctAnswer)
                );
                questions.push(...originalQuestionsCache);

                if (questions.length > 0) {
                    localStorage.setItem('quizDataForRestart', JSON.stringify(questions));
                    resetQuizStateForNewRound(false);
                    randomizedQuestions = shuffleArray(questions);
                    totalQuestions = randomizedQuestions.length;
                    loadQuestion();
                    showSlide('quizPage');
                } else {
                    alert("No valid questions found.");
                    goToHomePage();
                }
            } catch (e) {
                console.error("Quiz Load Error:", e);
                alert(`Error loading quiz questions: ${e.message}`);
                localStorage.removeItem('quizDataToExecute');
                localStorage.removeItem('quizFileNameToExecute');
                goToHomePage();
            }
        } else {
            alert("No quiz data found.");
            goToHomePage();
        }
    }
    updateNightMode();
});

function updateNightMode() {
    let currentToggle = domCache.nightModeToggleQuiz?.closest('.slide:not(.hidden)')
        ? domCache.nightModeToggleQuiz
        : domCache.nightModeToggleResult;

    const nightModeActive = localStorage.getItem('nightMode') === 'true';
    document.body.classList.toggle('night-mode', nightModeActive);

    if (domCache.nightModeToggleQuiz) domCache.nightModeToggleQuiz.checked = nightModeActive;
    if (domCache.nightModeToggleResult) domCache.nightModeToggleResult.checked = nightModeActive;

    if (currentToggle && !currentToggle.dataset.listenerAttached) {
         const newToggle = currentToggle.cloneNode(true);
         currentToggle.parentNode.replaceChild(newToggle, currentToggle);
         newToggle.dataset.listenerAttached = 'true'; // Mark as attached

         // Update cache reference is crucial after replacement
         if (newToggle.id === 'nightModeToggleQuiz') domCache.nightModeToggleQuiz = newToggle;
         if (newToggle.id === 'nightModeToggleResult') domCache.nightModeToggleResult = newToggle;

        newToggle.addEventListener('change', function () {
            const isEnabled = this.checked;
            document.body.classList.toggle('night-mode', isEnabled);
            localStorage.setItem('nightMode', String(isEnabled));
            if (domCache.nightModeToggleQuiz) domCache.nightModeToggleQuiz.checked = isEnabled;
            if (domCache.nightModeToggleResult) domCache.nightModeToggleResult.checked = isEnabled;

            if (domCache.timeStatsContainer && !domCache.timeStatsContainer.classList.contains('hidden') && timeStatsRendered) {
                initializeCharts(questionTimeStats);
            }
        });

        // Remove listener flag from the other toggle if it exists
        const otherToggle = (newToggle === domCache.nightModeToggleQuiz) ? domCache.nightModeToggleResult : domCache.nightModeToggleQuiz;
        if(otherToggle) delete otherToggle.dataset.listenerAttached;
    }
}

function showSlide(slideId) {
    domCache.slides.forEach(slide => {
        slide.classList.add("hidden");
        slide.classList.remove("active");
    });
    const slideToShow = document.getElementById(slideId); // Use ID directly as cache is static
    if (slideToShow) {
        slideToShow.classList.remove("hidden");
        slideToShow.classList.add("active");
        updateNightMode(); // Ensure correct listener is active
    }
}

function updateProgressBar() {
    if (!domCache.progressBarFill || !domCache.questionCount) return;
    let percent = 0;
    let displayCompleted = 0;
    if (totalQuestions > 0) {
        displayCompleted = Math.min(completedQuestions, totalQuestions);
        percent = Math.round((displayCompleted / totalQuestions) * 100);
        domCache.questionCount.textContent = `${percent}% (${displayCompleted}/${totalQuestions})`;
    } else {
        domCache.questionCount.textContent = `0% (0/0)`;
    }
    domCache.progressBarFill.style.width = `${percent}%`;
}

function loadQuestion() {
    const { questionText, answersContainer, submitButton, skipButton, helpButton } = domCache;
    if (retryingQuestion) currentIndex = 0;

    if (currentIndex < 0 || currentIndex >= randomizedQuestions.length) {
        showResults(); return;
    }

    const question = randomizedQuestions[currentIndex];
    if (!question?.question || typeof question.answers !== 'object' || !question.answers || Object.keys(question.answers).length === 0) {
        console.error(`Invalid question at index ${currentIndex}:`, question);
        completedQuestions++; currentIndex++; updateProgressBar();
        if (currentIndex >= randomizedQuestions.length) showResults(); else loadQuestion();
        return;
    }

    if (questionText) questionText.textContent = question.question;
    if (!answersContainer) return;

    answersContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const shuffledDisplayAnswers = shuffleAnswers(question.answers);

    for (const displayKey in shuffledDisplayAnswers) {
        const originalAnswerText = shuffledDisplayAnswers[displayKey];
        const originalKey = Object.keys(question.answers).find(key => question.answers[key] === originalAnswerText);
        if (!originalKey) continue;

        const answerElement = document.createElement('div');
        answerElement.className = 'answer';
        answerElement.dataset.originalKey = originalKey;
        answerElement.dataset.displayKey = displayKey;
        answerElement.textContent = `${displayKey}) ${originalAnswerText}`;
        answerElement.onclick = () => selectAnswer(answerElement);
        fragment.appendChild(answerElement);
    }
    answersContainer.appendChild(fragment);
    selectedAnswer = null;

    if (submitButton) { submitButton.style.display = 'block'; submitButton.disabled = true; }
    if (skipButton) { skipButton.style.display = retryingQuestion ? 'none' : 'block'; skipButton.disabled = false; }
    if (helpButton) helpButton.style.display = 'block';

    currentQuestionStartTime = Date.now();
    updateProgressBar();
}

function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleAnswers(answersObject) {
    if (!answersObject || typeof answersObject !== 'object' || Array.isArray(answersObject)) return {};
    const originalKeys = Object.keys(answersObject);
    if (originalKeys.length === 0) return {};
    const shuffledKeys = shuffleArray(originalKeys);
    const shuffledDisplayAnswers = {};
    shuffledKeys.forEach((originalKey, index) => {
        shuffledDisplayAnswers[String.fromCharCode(65 + index)] = answersObject[originalKey];
    });
    return shuffledDisplayAnswers;
}

function selectAnswer(selectedElement) {
    if (!selectedElement?.dataset?.originalKey) return;
    const { originalKey, displayKey } = selectedElement.dataset;
    const answerText = selectedElement.textContent.substring(3);
    selectedAnswer = { displayKey, originalKey, answerText };

    domCache.answersContainer?.querySelectorAll('.answer.selected').forEach(el => el.classList.remove('selected'));
    selectedElement.classList.add('selected');
    if (domCache.submitButton) domCache.submitButton.disabled = false;
}

function submitAnswer() {
    if (!selectedAnswer) return;
    if (currentIndex < 0 || currentIndex >= randomizedQuestions.length) return;
    const currentQuestion = randomizedQuestions[currentIndex];
    if (!currentQuestion?.correctAnswer) { alert("Error processing answer."); return; }

    const duration = Date.now() - currentQuestionStartTime;
    const isCorrect = selectedAnswer.originalKey === currentQuestion.correctAnswer;

    if (domCache.submitButton) domCache.submitButton.disabled = true;
    if (domCache.skipButton) domCache.skipButton.disabled = true;
    if (domCache.helpButton) domCache.helpButton.style.display = 'none';
    domCache.answersContainer?.querySelectorAll('.answer').forEach(el => el.onclick = null);

    if (isCorrect) recordCorrectAnswer(currentIndex, selectedAnswer, duration);
    else recordWrongAnswer(currentIndex, selectedAnswer, false, duration);

    if (!retryingQuestion) completedQuestions++;
    updateProgressBar();

    if (retryingQuestion) {
        retryingQuestion = false;
        showResults();
    } else {
        currentIndex++;
        if (currentIndex >= randomizedQuestions.length) showResults();
        else loadQuestion();
    }
}

function skipQuestion() {
    if (retryingQuestion || currentIndex < 0 || currentIndex >= randomizedQuestions.length) return;
    const currentQuestion = randomizedQuestions[currentIndex];
    if (!currentQuestion) return;
    const duration = Date.now() - currentQuestionStartTime;
    recordWrongAnswer(currentIndex, null, true, duration);
    completedQuestions++; currentIndex++; updateProgressBar();
    if (currentIndex >= randomizedQuestions.length) showResults(); else loadQuestion();
}

function showAnswer() {
    if (retryingQuestion || currentIndex < 0 || currentIndex >= randomizedQuestions.length) return;
    const question = randomizedQuestions[currentIndex];
    if (!question?.answers || !question.correctAnswer) return;
    const correctAnswerKey = question.correctAnswer;

    domCache.answersContainer?.querySelectorAll('.answer').forEach(el => {
        el.onclick = null;
        el.classList.remove('selected', 'wrong', 'correct');
        if (el.dataset.originalKey === correctAnswerKey) {
            el.classList.add('correct'); el.style.opacity = '1';
        } else {
            el.style.opacity = '0.6'; el.disabled = true;
        }
    });

    if (domCache.submitButton) domCache.submitButton.style.display = 'none';
    if (domCache.helpButton) domCache.helpButton.style.display = 'none';
    if (domCache.skipButton) { domCache.skipButton.style.display = 'block'; domCache.skipButton.disabled = false; }
}

function recordWrongAnswer(questionIndex, selectedAnswerObj, skipped = false, duration = 0) {
    if (questionIndex < 0 || questionIndex >= randomizedQuestions.length) return;
    const question = randomizedQuestions[questionIndex];
    if (!question) return;

    const questionText = question.question;
    const correctAnswerText = question.answers[question.correctAnswer] || '?';
    const selectedText = selectedAnswerObj ? selectedAnswerObj.answerText : (skipped ? null : '?');

    let existingStatIndex = retryingQuestion ? questionTimeStats.findIndex(stat => stat.question === questionText) : -1;

    const statData = { question: questionText, selected: selectedText, correct: correctAnswerText, skipped, status: skipped ? 'skipped' : 'wrong', duration };

    if (existingStatIndex !== -1) questionTimeStats[existingStatIndex] = statData;
    else if (!retryingQuestion) questionTimeStats.push(statData);

    const existingWrongIndex = wrongAnswers.findIndex(q => q.question === questionText);
    if (existingWrongIndex === -1) wrongAnswers.push({ question: questionText, selected: statData.selected, correct: statData.correct, skipped: statData.skipped });
    else wrongAnswers[existingWrongIndex] = { ...wrongAnswers[existingWrongIndex], selected: statData.selected, skipped: skipped }; // Update existing wrong entry
}

function recordCorrectAnswer(questionIndex, selectedAnswerObj, duration = 0) {
    if (questionIndex < 0 || questionIndex >= randomizedQuestions.length) return;
    const question = randomizedQuestions[questionIndex];
    if (!question) return;
    const questionText = question.question;

    let existingStatIndex = retryingQuestion ? questionTimeStats.findIndex(stat => stat.question === questionText) : -1;
    const statData = { question: questionText, correct: selectedAnswerObj.answerText, skipped: false, status: 'correct', duration };

    if (existingStatIndex !== -1) questionTimeStats[existingStatIndex] = statData;
    else if (!retryingQuestion) questionTimeStats.push(statData);

    if (retryingQuestion || existingStatIndex !== -1) removeFromWrongAnswers(questionText);
}

function removeFromWrongAnswers(questionText) {
    const index = wrongAnswers.findIndex(item => item.question === questionText);
    if (index !== -1) wrongAnswers.splice(index, 1);
}

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''');
}

function showResults() {
    showSlide('resultPage');
    timeStatsRendered = false;
    currentSortColumn = null; currentSortDirection = 'none';
    if(domCache.timeStatsContainer) domCache.timeStatsContainer.classList.add('hidden');
    if(domCache.toggleTimeDetailsButton) domCache.toggleTimeDetailsButton.textContent = 'Show Time Details';
    updateSortIndicators();

    const { correctList, wrongList, scoreText, correctPercentage, wrongPercentage } = domCache;
    if (!correctList || !wrongList || !scoreText || !correctPercentage || !wrongPercentage) return;

    correctList.innerHTML = ''; wrongList.innerHTML = '';
    correctList.classList.add('hidden'); wrongList.classList.add('hidden');

    const finalCorrectStats = questionTimeStats.filter(s => s.status === 'correct');
    const finalWrongOrSkippedStats = questionTimeStats.filter(s => s.status === 'wrong' || s.status === 'skipped');

    const correctFragment = document.createDocumentFragment();
    finalCorrectStats.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="indicator correct"></div> ${escapeHTML(item.question)} <br><i><small>(Answer: ${escapeHTML(item.correct || '?')})</small></i>`;
        li.onclick = () => retryQuestion(item.question);
        correctFragment.appendChild(li);
    });
    correctList.appendChild(correctFragment);

    const wrongFragment = document.createDocumentFragment();
    finalWrongOrSkippedStats.forEach(item => {
        const li = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
        const statusText = item.skipped ? 'Skipped' : 'Wrong';
        let details = item.skipped ? '' : `<i><small>(Yours: ${escapeHTML(item.selected || 'None')}, Correct: ${escapeHTML(item.correct || '?')})</small></i>`;
        li.innerHTML = `<div class="indicator ${indicatorClass}"></div> ${escapeHTML(item.question)} <br><i><small>(${statusText})</small></i> ${details}`;
        li.onclick = () => retryQuestion(item.question);
        wrongFragment.appendChild(li);
    });
    wrongList.appendChild(wrongFragment);

    const finalCorrectCount = finalCorrectStats.length;
    const finalTotal = totalQuestions;
    let correctPercent = finalTotal > 0 ? Math.round((finalCorrectCount / finalTotal) * 100) : 0;
    let wrongPercent = 100 - correctPercent;

    scoreText.textContent = `Score: ${correctPercent}% (${finalCorrectCount}/${finalTotal})`;
    correctPercentage.style.setProperty('--percentage', `${correctPercent}%`);
    wrongPercentage.style.setProperty('--percentage', `${wrongPercent}%`);
    correctPercentage.setAttribute('data-percentage', `${correctPercent}%`);
    wrongPercentage.setAttribute('data-percentage', `${wrongPercent}%`);
    correctPercentage.onclick = toggleCorrectList;
    wrongPercentage.onclick = toggleWrongList;
}

function toggleCorrectList() { domCache.correctList?.classList.toggle('hidden'); }
function toggleWrongList() { domCache.wrongList?.classList.toggle('hidden'); }

function retryQuestion(questionText) {
    if (!originalQuestionsCache?.length) { alert("Original questions unavailable."); return; }
    const questionToRetry = originalQuestionsCache.find(q => q?.question === questionText);
    if (questionToRetry) {
        randomizedQuestions = [questionToRetry];
        retryingQuestion = true;
        currentIndex = 0; completedQuestions = 0; totalQuestions = 1; selectedAnswer = null;
        showSlide('quizPage'); loadQuestion();
    } else { alert("Could not find question to retry."); }
}

function redoWrongAnswers() {
    if (wrongAnswers.length === 0) { alert("No wrong answers to redo."); return; }
    if (!originalQuestionsCache?.length) { alert("Original questions unavailable."); return; }
    const questionsToRedo = wrongAnswers.map(w => originalQuestionsCache.find(q => q?.question === w.question)).filter(Boolean);
    if (questionsToRedo.length > 0) {
        questions.length = 0; questions.push(...questionsToRedo);
        resetQuizStateForNewRound(true); loadQuestion();
    } else { alert("Error finding details for wrong answers."); }
}

function restartQuiz() {
    if (!originalQuestionsCache?.length) { alert("No questions loaded to restart."); return; }
    questions.length = 0; questions.push(...originalQuestionsCache);
    resetQuizStateForNewRound(true); loadQuestion();
}

function resetQuizStateForNewRound(doShuffle = true) {
    currentIndex = 0; selectedAnswer = null; completedQuestions = 0;
    questionTimeStats = []; wrongAnswers = [];
    currentQuestionStartTime = 0; retryingQuestion = false;
    timeStatsRendered = false; currentSortColumn = null; currentSortDirection = 'none';

    if(domCache.timeStatsContainer) domCache.timeStatsContainer.classList.add('hidden');
    if(domCache.toggleTimeDetailsButton) domCache.toggleTimeDetailsButton.textContent = 'Show Time Details';
    if(domCache.correctList) domCache.correctList.innerHTML = '';
    if(domCache.wrongList) domCache.wrongList.innerHTML = '';

    randomizedQuestions = doShuffle ? shuffleArray([...questions]) : [...questions];
    totalQuestions = randomizedQuestions.length;
    updateProgressBar();
    showSlide('quizPage');
}

function goToHomePage() { window.location.href = 'index.html'; }

function formatDuration(ms) {
    if (typeof ms !== 'number' || ms < 0 || isNaN(ms)) return "N/A";
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function sortTable(columnKey) {
    let direction = (columnKey === 'status') ? 'asc' : 'desc';
    if (currentSortColumn === columnKey) direction = currentSortDirection === 'asc' ? 'desc' : 'asc';
    currentSortColumn = columnKey; currentSortDirection = direction;

    const statusOrder = { correct: 1, skipped: 2, wrong: 3 };
    questionTimeStats.sort((a, b) => {
        let valA, valB;
        if (columnKey === 'duration') { valA = a.duration ?? 0; valB = b.duration ?? 0; }
        else if (columnKey === 'status') { valA = statusOrder[a.status] || 4; valB = statusOrder[b.status] || 4; }
        else return 0;
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    populateTimeTable(questionTimeStats); updateSortIndicators();
}

function updateSortIndicators() {
    domCache.sortIndicators?.forEach(ind => ind.className = 'sort-indicator');
    if (currentSortColumn) {
        const indicator = document.getElementById(`sort-${currentSortColumn}`);
        if (indicator) indicator.classList.add(currentSortDirection);
    }
}

function populateTimeTable(statsData) {
    const tbody = domCache.timeStatsTableBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(statsData) || statsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No time data.</td></tr>'; return;
    }
    const fragment = document.createDocumentFragment();
    statsData.forEach(stat => {
        const row = document.createElement('tr');
        const statusTextMap = { correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped' };
        row.innerHTML = `<td>${escapeHTML(stat.question || '?')}</td>
                         <td>${formatDuration(stat.duration)}</td>
                         <td><div class="indicator ${stat.status || 'unknown'}"></div> ${statusTextMap[stat.status] || 'Unknown'}</td>`;
        fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
}

function calculateSummaryStats(statsData) {
    const { totalTimeValue, avgTimeValue } = domCache;
    if (!totalTimeValue || !avgTimeValue) return;
    if (!Array.isArray(statsData) || statsData.length === 0) {
        totalTimeValue.textContent = 'N/A'; avgTimeValue.textContent = 'N/A'; return;
    }
    const validDurations = statsData.map(s => s.duration).filter(d => typeof d === 'number' && !isNaN(d) && d >= 0);
    const totalMs = validDurations.reduce((sum, d) => sum + d, 0);
    const avgMs = validDurations.length > 0 ? totalMs / validDurations.length : 0;
    totalTimeValue.textContent = formatDuration(totalMs);
    avgTimeValue.textContent = formatDuration(avgMs);
}

function initializeCharts(statsData) {
    const container = domCache.timeStatsContainer;
    if (!container || typeof Chart === 'undefined') return;
    if (!Array.isArray(statsData) || statsData.length === 0) { timeStatsRendered = true; return; } // Mark as rendered even if no data

    ['timeBarChart', 'timeLineChart', 'timeHistogramChart'].forEach(id => Chart.getChart(id)?.destroy());

    const labels = statsData.map((_, i) => `Q${i + 1}`);
    const durationsSeconds = statsData.map(s => (s.duration ?? 0) / 1000);
    const isNight = document.body.classList.contains('night-mode');
    const gridClr = isNight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const tickClr = isNight ? '#ccc' : '#666';
    const titleClr = isNight ? '#eee' : '#333';
    const barColors = { correct: `rgba(75, 192, 192, ${isNight?0.7:0.6})`, wrong: `rgba(255, 99, 132, ${isNight?0.7:0.6})`, skipped: `rgba(255, 206, 86, ${isNight?0.7:0.6})`, default: `rgba(201, 203, 207, ${isNight?0.7:0.6})` };
    const borderColors = { correct: 'rgb(75, 192, 192)', wrong: 'rgb(255, 99, 132)', skipped: 'rgb(255, 206, 86)', default: 'rgb(201, 203, 207)' };

    const baseOpts = {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { y: { beginAtZero: true, grid: { color: gridClr }, ticks: { color: tickClr }, title: { display: true, text: 'Time (s)', color: titleClr } }, x: { grid: { display: false }, ticks: { color: tickClr }, title: { display: true, text: 'Question', color: titleClr } } }
    };

    const barCtx = domCache.timeBarChart?.getContext('2d');
    if (barCtx) new Chart(barCtx, {
        type: 'bar', data: { labels, datasets: [{ data: durationsSeconds, backgroundColor: statsData.map(s => barColors[s.status] || barColors.default), borderColor: statsData.map(s => borderColors[s.status] || borderColors.default), borderWidth: 1 }] },
        options: { ...baseOpts, onClick: (e, els) => { if (els.length) { const i = els[0].index; const d = questionTimeStats[i]; alert(`Q${i + 1}: ${d.status.toUpperCase()}\n"${d.question}"\nTime: ${formatDuration(d.duration)}`); } } }
    });

    const lineCtx = domCache.timeLineChart?.getContext('2d');
    if (lineCtx) {
        const cumulative = durationsSeconds.reduce((acc, d, i) => { acc.push((i > 0 ? acc[i - 1] : 0) + d); return acc; }, []);
        new Chart(lineCtx, {
            type: 'line', data: { labels, datasets: [{ data: cumulative, borderColor: isNight ? '#64B5F6' : '#36A2EB', backgroundColor: isNight ? 'rgba(100,181,246,0.2)' : 'rgba(54,162,235,0.2)', tension: 0.1, fill: true, pointRadius: 2 }] },
            options: { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, title: { text: 'Total Time (s)', display: true, color: titleClr } } }, onClick: null }
        });
    }

    const histCtx = domCache.timeHistogramChart?.getContext('2d');
    if (histCtx) {
        const validTimes = durationsSeconds.filter(t => !isNaN(t) && t >= 0);
        if (validTimes.length > 0) {
            const maxT = Math.max(...validTimes, 5); const bins = Math.min(Math.max(Math.ceil(validTimes.length / 3), 5), 15); const binSz = Math.max(Math.ceil(maxT / bins / 5) * 5, 5); const numBins = Math.max(Math.ceil(maxT / binSz), 1);
            const histBins = Array(numBins).fill(0); const binLabels = Array(numBins).fill(0).map((_, i) => `${i * binSz}-${(i + 1) * binSz}s`);
            validTimes.forEach(t => { const idx = Math.min(Math.floor(t / binSz), numBins - 1); if (idx >= 0) histBins[idx]++; });

            new Chart(histCtx, {
                type: 'bar', data: { labels: binLabels, datasets: [{ data: histBins, backgroundColor: isNight ? 'rgba(186,104,200,0.7)' : 'rgba(153,102,255,0.6)', borderColor: isNight ? '#BA68C8' : '#9966FF', borderWidth: 1 }] },
                options: { ...baseOpts, scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, title: { text: 'Time Bins (s)', display: true, color: titleClr } }, y: { ...baseOpts.scales.y, title: { text: '# Questions', display: true, color: titleClr }, ticks: { stepSize: 1, precision: 0, color: tickClr } } },
                 onClick: (e, els) => { if(els.length){ const i=els[0].index; const min=i*binSz; const max=(i+1)*binSz; const qInBin = questionTimeStats.filter(s=>(s.duration??-1)/1000 >=min && (s.duration??-1)/1000<max); let msg=`Range ${min}-${max}s (${qInBin.length}):\n\n`+qInBin.slice(0,10).map((q,ix)=>`${ix+1}. ${q.question.substring(0,40)}... (${formatDuration(q.duration)})`).join('\n')+(qInBin.length>10?'\n...':''); alert(msg||`Range ${min}-${max}s: None`);}}
                }
            });
        }
    }
    timeStatsRendered = true;
}

function toggleTimeStatsDetails() {
    const container = domCache.timeStatsContainer; const button = domCache.toggleTimeDetailsButton;
    if (!container || !button) return;
    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
        if (!timeStatsRendered) {
            if (currentSortColumn) sortTable(currentSortColumn); else populateTimeTable(questionTimeStats);
            calculateSummaryStats(questionTimeStats); initializeCharts(questionTimeStats);
        }
        container.classList.remove('hidden'); button.textContent = 'Hide Time Details';
    } else {
        container.classList.add('hidden'); button.textContent = 'Show Time Details';
    }
}
