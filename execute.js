let questions = [];
let randomizedQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let skippedQuestions = [];
let selectedAnswer = null;
let wrongAnswers = [];
let correctAnswers = [];
let retryingQuestion = false;
let retryIndex = -1;
let totalQuestions = 0;
let completedQuestions = 0;
let currentQuestionStartTime = 0;
let questionTimeStats = [];
let timeStatsRendered = false; // Flag to check if time stats have been rendered

document.addEventListener('DOMContentLoaded', () => {
    const isQuizPage = document.getElementById('quizPage');
    // No longer need to check for timeStatsPage specifically
    // const isTimeStatsPage = document.getElementById('timeStatsPage');

    if (isQuizPage) { // This script now only runs on execute.html
        const storedData = localStorage.getItem('quizDataToExecute');
        if (storedData) {
            try {
                questions = JSON.parse(storedData);
                localStorage.removeItem('quizDataToExecute');

                let originalFileName = localStorage.getItem('quizFileNameToExecute');
                 if (originalFileName) {
                    const fileNameDisplay = document.getElementById('fileNameDisplay');
                    if(fileNameDisplay) fileNameDisplay.textContent = originalFileName;
                    localStorage.removeItem('quizFileNameToExecute');
                 }

                if (!Array.isArray(questions)) {
                    if (questions && typeof questions === 'object' && questions.question && questions.answers && questions.correctAnswer) {
                         questions = [questions];
                    } else {
                        questions = []; alert("Error: Could not load valid quiz questions.");
                    }
                } else {
                     const originalLength = questions.length;
                     questions = questions.filter(q => q && typeof q === 'object' && q.question && q.answers && typeof q.answers === 'object' && q.correctAnswer);
                }
                if (questions.length > 0) {
                    localStorage.setItem('quizDataForRestart', JSON.stringify(questions)); // Store for restart
                    resetQuizStateForNewRound(false);
                    randomizedQuestions = shuffleArray(questions);
                    totalQuestions = randomizedQuestions.length;
                    completedQuestions = 0;
                    loadQuestion();
                    showSlide('quizPage');
                } else {
                     alert("No valid questions found to start the quiz."); goToHomePage();
                }
            } catch (e) {
                alert(`Error loading quiz questions: ${e.message}\nPlease check the JSON format.`);
                 localStorage.removeItem('quizDataToExecute');
                 localStorage.removeItem('quizFileNameToExecute');
                 goToHomePage();
            }
        } else {
            alert("No quiz data found. Please select a quiz file or folder to execute.");
            goToHomePage();
        }
    }
    updateNightMode();
});

function updateNightMode() {
    const nightModeToggleQuiz = document.getElementById('nightModeToggleQuiz');
    const nightModeToggleResult = document.getElementById('nightModeToggleResult');
    let currentToggle = nightModeToggleQuiz || nightModeToggleResult;
    const nightModeActive = localStorage.getItem('nightMode') === 'true';
    document.body.classList.toggle('night-mode', nightModeActive);

    if (currentToggle) {
        currentToggle.checked = nightModeActive;
        currentToggle.replaceWith(currentToggle.cloneNode(true));
        currentToggle = document.getElementById(currentToggle.id);
        currentToggle.addEventListener('change', function () {
            const isEnabled = this.checked;
            document.body.classList.toggle('night-mode', isEnabled);
            localStorage.setItem('nightMode', String(isEnabled));

             const otherToggleId = currentToggle.id === 'nightModeToggleQuiz' ? 'nightModeToggleResult' : 'nightModeToggleQuiz';
             const otherToggle = document.getElementById(otherToggleId);
             if (otherToggle) {
                 otherToggle.checked = isEnabled;
             }
             // Re-render charts if visible and night mode changes
             if (!document.getElementById('timeStatsContainer')?.classList.contains('hidden') && timeStatsRendered) {
                initializeCharts(questionTimeStats); // Assumes chart colors depend on night mode
             }
        });
    }
}


function showSlide(slideId) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => { slide.classList.add("hidden"); slide.classList.remove("active"); });
    const slideToShow = document.getElementById(slideId);
    if (slideToShow) { slideToShow.classList.remove("hidden"); slideToShow.classList.add("active"); }
}

function loadQuestion() {
    if (retryingQuestion) { currentIndex = retryIndex; }
    if (currentIndex >= 0 && currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
         if (!question || !question.question || !question.answers || typeof question.answers !== 'object') {
              alert(`Error: Invalid question data encountered at question ${currentIndex + 1}. Skipping.`);
              currentIndex++; completedQuestions++;
              if (currentIndex >= randomizedQuestions.length) showResults(); else loadQuestion();
              return;
         }
        const questionTextEl = document.getElementById('questionText');
        if(questionTextEl) questionTextEl.innerText = question.question;
        const answersContainer = document.getElementById('answersContainer');
        if (!answersContainer) return;
        answersContainer.innerHTML = '';
        const shuffledDisplayAnswers = shuffleAnswers(question.answers);
        for (let displayKey in shuffledDisplayAnswers) {
            const originalAnswerText = shuffledDisplayAnswers[displayKey];
            const originalKey = Object.keys(question.answers).find(key => question.answers[key] === originalAnswerText);
            if (!originalKey) continue;
            let answerElement = document.createElement('div');
            answerElement.classList.add('answer');
            answerElement.dataset.originalKey = originalKey; answerElement.dataset.displayKey = displayKey; answerElement.dataset.answerText = originalAnswerText;
            answerElement.innerText = `${displayKey}) ${originalAnswerText}`;
            answerElement.onclick = () => selectAnswer(answerElement);
            answersContainer.appendChild(answerElement);
        }
        selectedAnswer = null;
        const submitButton = document.getElementById('submitButton');
        const skipButton = document.getElementById('skipButton');
        const helpButton = document.querySelector('.help-button');
         if(submitButton) { submitButton.style.display = 'block'; submitButton.disabled = true; }
         if(skipButton) { skipButton.style.display = retryingQuestion ? 'none' : 'block'; skipButton.disabled = false; }
         if(helpButton) helpButton.style.display = 'block';
        currentQuestionStartTime = Date.now();
        updateProgressBar();
    } else {
        showResults();
    }
}

function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleAnswers(answersObject) {
    if (!answersObject || typeof answersObject !== 'object') return {};
    const originalKeys = Object.keys(answersObject);
    const shuffledKeys = shuffleArray(originalKeys);
    let shuffledDisplayAnswers = {};
    shuffledKeys.forEach((originalKey, index) => {
        const displayKey = String.fromCharCode(65 + index);
        shuffledDisplayAnswers[displayKey] = answersObject[originalKey];
    });
    return shuffledDisplayAnswers;
}

function selectAnswer(selectedElement) {
     if (!selectedElement || !selectedElement.dataset) return;
     const displayKey = selectedElement.dataset.displayKey;
     const originalKey = selectedElement.dataset.originalKey;
     const answerText = selectedElement.dataset.answerText;
     if (typeof displayKey === 'undefined' || typeof originalKey === 'undefined' || typeof answerText === 'undefined') {
         return;
     }
     selectedAnswer = { displayKey, originalKey, answerText };
     document.querySelectorAll('.answer').forEach(el => {
         el.classList.remove('selected'); // Only remove selected class visually
     });
     selectedElement.classList.add('selected');
     const submitButton = document.getElementById('submitButton');
     if (submitButton) submitButton.disabled = false;
 }

function submitAnswer() {
    if (!selectedAnswer) { alert('Please select an answer first.'); return; }
    const currentQuestion = randomizedQuestions[currentIndex];
    if (!currentQuestion || !currentQuestion.answers || !currentQuestion.correctAnswer) {
         alert("Error processing answer. Invalid question data."); return;
    }
    const duration = Date.now() - currentQuestionStartTime;
    const isCorrect = selectedAnswer.originalKey === currentQuestion.correctAnswer;

    document.querySelectorAll('.answer').forEach(el => {
        el.onclick = null; // Disable clicking after submission
        el.classList.remove('selected'); // Remove visual selection indicator
    });
    const submitButton = document.getElementById('submitButton');
    const helpButton = document.querySelector('.help-button');
    const skipButton = document.getElementById('skipButton');

    if(submitButton) submitButton.disabled = true;
    if(helpButton) helpButton.style.display = 'none';
    if(skipButton) skipButton.style.display = 'none';

    const selectedElement = [...document.querySelectorAll('.answer')].find(el => el.dataset.originalKey === selectedAnswer.originalKey);
    const correctElementKey = currentQuestion.correctAnswer;
    const correctElement = [...document.querySelectorAll('.answer')].find(el => el.dataset.originalKey === correctElementKey);


    if (isCorrect) {
        recordCorrectAnswer(currentIndex, selectedAnswer, duration);
        if(selectedElement) selectedElement.classList.add('correct');
    } else {
        recordWrongAnswer(currentIndex, selectedAnswer, false, duration);
        if(selectedElement) selectedElement.classList.add('wrong');
        if(correctElement) correctElement.classList.add('correct'); // Highlight correct one as well
    }

    if (!retryingQuestion) {
        completedQuestions++;
    }
    updateProgressBar();

    if (retryingQuestion) {
        retryingQuestion = false;
        retryIndex = -1;
         // Go back to results page after retrying one question
         setTimeout(() => {
             showResults();
         }, 1200); // Give slightly longer delay to see feedback
    } else {
        currentIndex++;
        setTimeout(() => {
            if (currentIndex >= randomizedQuestions.length) {
                showResults();
            } else {
                loadQuestion();
            }
        }, 1200); // Delay before loading next question or results
    }
}

function skipQuestion() {
    if (retryingQuestion) return;
     const currentQuestion = randomizedQuestions[currentIndex];
     if (!currentQuestion) return;
    const duration = Date.now() - currentQuestionStartTime;
    recordWrongAnswer(currentIndex, null, true, duration);
    completedQuestions++;
    currentIndex++;
    updateProgressBar();
    if (currentIndex >= randomizedQuestions.length) {
        showResults();
    } else {
        loadQuestion(); // Load next question immediately after skip
    }
}

function showAnswer() {
    if (currentIndex >= 0 && currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
        if (!question || !question.answers || !question.correctAnswer) return;
        const correctAnswerKey = question.correctAnswer;

        document.querySelectorAll('.answer').forEach(el => {
            el.onclick = null;
            el.classList.remove('selected', 'wrong');
            if (el.dataset.originalKey === correctAnswerKey) {
                el.classList.add('correct');
                el.style.opacity = '1';
            } else {
                 el.style.opacity = '0.6'; // Dim incorrect answers
            }
        });

         const submitButton = document.getElementById('submitButton');
         const helpButton = document.querySelector('.help-button');
         const skipButton = document.getElementById('skipButton');

         if(submitButton) submitButton.style.display = 'none';
         if(helpButton) helpButton.style.display = 'none';
         if(skipButton) {
             skipButton.style.display = 'block';
             skipButton.disabled = false;
         }
    }
}


function recordWrongAnswer(questionIndex, selectedAnswerObj, skipped = false, duration = 0) {
    const question = randomizedQuestions[questionIndex];
    if (!question) return;
    const existingStatIndex = questionTimeStats.findIndex(stat => stat.question === question.question);

    const statData = {
        question: question.question,
        selected: selectedAnswerObj ? selectedAnswerObj.answerText : null,
        correct: question.answers[question.correctAnswer] || '[Answer Not Found]',
        skipped: skipped,
        status: skipped ? 'skipped' : 'wrong',
        duration: duration
    };

    if (existingStatIndex !== -1 && retryingQuestion) { // Only overwrite if retrying
        questionTimeStats[existingStatIndex] = statData;
    } else if (existingStatIndex === -1) { // Add if new
        questionTimeStats.push(statData);
    } // Otherwise, do nothing (don't overwrite first attempt unless retrying)

    // Update simple wrongAnswers list (used for redoWrong logic primarily)
    const existingWrongIndex = wrongAnswers.findIndex(q => q.question === question.question);
     if (existingWrongIndex === -1) { // Only add to this list once
          wrongAnswers.push({
              question: question.question,
              selected: statData.selected,
              correct: statData.correct,
              skipped: statData.skipped
          });
     }
}

function recordCorrectAnswer(questionIndex, selectedAnswerObj, duration = 0) {
    const question = randomizedQuestions[questionIndex];
    if (!question) return;
    const existingStatIndex = questionTimeStats.findIndex(stat => stat.question === question.question);

    const statData = {
        question: question.question,
        correct: selectedAnswerObj.answerText,
        status: 'correct',
        duration: duration
    };

     if (existingStatIndex !== -1 && retryingQuestion) { // Only overwrite if retrying
        questionTimeStats[existingStatIndex] = statData;
         // If it was previously wrong, remove from wrongAnswers list upon correction
         removeFromWrongAnswers(question.question);
    } else if (existingStatIndex === -1) { // Add if new
        questionTimeStats.push(statData);
    } // Otherwise, do nothing

    // Update simple correctAnswers list (used for initial display)
    const existingCorrectIndex = correctAnswers.findIndex(q => q.question === question.question);
    if (existingCorrectIndex === -1) { // Only add once
        correctAnswers.push({
            question: question.question,
            correct: statData.correct
        });
        // If retrying a wrong answer and getting it right, ensure it's removed from the wrong list
        if (retryingQuestion) {
             removeFromWrongAnswers(question.question);
        }
    }
}


function removeFromWrongAnswers(questionText) {
    const index = wrongAnswers.findIndex(item => item.question === questionText);
    if (index !== -1) wrongAnswers.splice(index, 1);
}

function showResults() {
    showSlide('resultPage');
    timeStatsRendered = false; // Reset flag when showing results initially
    document.getElementById('timeStatsContainer').classList.add('hidden'); // Ensure details are hidden initially
    document.getElementById('toggleTimeDetailsButton').textContent = 'Show Time Details'; // Reset button text

    const correctList = document.getElementById('correctList');
    const wrongList = document.getElementById('wrongList');
    const scoreTextEl = document.getElementById('scoreText');
    const correctChartEl = document.getElementById('correctPercentage');
    const wrongChartEl = document.getElementById('wrongPercentage');

    if (!correctList || !wrongList || !scoreTextEl || !correctChartEl || !wrongChartEl) return;

    correctList.innerHTML = ''; wrongList.innerHTML = '';
    correctList.classList.add('hidden'); wrongList.classList.add('hidden');

    // Populate lists based on the *final* status in questionTimeStats
    const finalCorrectStats = questionTimeStats.filter(s => s.status === 'correct');
    const finalWrongStats = questionTimeStats.filter(s => s.status === 'wrong' || s.status === 'skipped');

    finalCorrectStats.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="indicator correct"></div> ${item.question} <br><i><small>(Correct: ${item.correct || 'N/A'})</small></i>`;
        li.onclick = () => retryQuestion(item.question); correctList.appendChild(li);
    });
    finalWrongStats.forEach(item => {
        const li = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
        const statusText = item.skipped ? 'Skipped' : (item.selected ? 'Wrong' : 'Wrong (Help Used?)'); // Basic check if selected is null
        let details = item.skipped ? '' : `<i><small>(Selected: ${item.selected || 'None'}, Correct: ${item.correct || 'N/A'})</small></i>`;
        li.innerHTML = `<div class="indicator ${indicatorClass}"></div> ${item.question} <br><i><small>(${statusText})</small></i> ${details}`;
        li.onclick = () => retryQuestion(item.question); wrongList.appendChild(li);
    });

    const finalCorrect = finalCorrectStats.length;
    const finalTotal = totalQuestions; // Base percentage on total questions defined

    let correctPercent = 0; let wrongPercent = 0;
    if (finalTotal > 0) {
        correctPercent = Math.round((finalCorrect / finalTotal) * 100);
        // Calculate wrong based on total questions minus correct
        const finalWrongOrSkippedCount = finalTotal - finalCorrect;
        wrongPercent = 100 - correctPercent;
    } else {
         // Handle case with 0 total questions if necessary
         finalCorrect = 0;
         finalWrongOrSkippedCount = 0;
    }

    scoreTextEl.innerText = `Score: ${correctPercent}% (${finalCorrect}/${finalTotal})`;

    correctChartEl.style.setProperty('--percentage', `${correctPercent}%`);
    wrongChartEl.style.setProperty('--percentage', `${wrongPercent}%`);
    correctChartEl.setAttribute('data-percentage', `${correctPercent}%`);
    wrongChartEl.setAttribute('data-percentage', `${wrongPercent}%`);
    // Optionally keep data-count if needed for display inside circle
    // correctChartEl.setAttribute('data-count', finalCorrect);
    // wrongChartEl.setAttribute('data-count', finalWrongOrSkippedCount);

    correctChartEl.onclick = toggleCorrectList;
    wrongChartEl.onclick = toggleWrongList;

    // No need to save to localStorage if staying on the same page
}


function updateProgressBar() {
    const barFill = document.getElementById('progressBarFill');
    const countEl = document.getElementById('questionCount');
    if (!barFill || !countEl) return;
    let percent = 0;
    if (totalQuestions > 0) {
        // Ensure completedQuestions doesn't exceed totalQuestions for display
        const displayCompleted = Math.min(completedQuestions, totalQuestions);
        percent = Math.round((displayCompleted / totalQuestions) * 100);
        countEl.innerText = `${percent}% (${displayCompleted}/${totalQuestions})`;
    } else {
         countEl.innerText = `0% (0/0)`;
    }
    barFill.style.width = `${percent}%`;
}

function retryQuestion(questionText) {
    // Find the index in the *original* full question set if possible
    const fullQuestions = JSON.parse(localStorage.getItem('quizDataForRestart') || '[]');
    const originalIndex = fullQuestions.findIndex(q => q && q.question === questionText);

    if (originalIndex !== -1) {
        // Set the current randomizedQuestions to just this one question for retry
        randomizedQuestions = [fullQuestions[originalIndex]];
        questions = [...randomizedQuestions]; // Update base questions to this single one for this session
        retryingQuestion = true;
        retryIndex = 0; // Index within the new single-question array
        currentIndex = 0;
        completedQuestions = 0; // Reset progress for the retry
        totalQuestions = 1; // Only 1 question now
        selectedAnswer = null; // Clear previous selection for this question

        showSlide('quizPage');
        loadQuestion(); // Load the specific question
    } else {
        alert("Error: Could not find the selected question details to retry.");
    }
}


function toggleCorrectList() {
    const list = document.getElementById('correctList');
    if (list) list.classList.toggle('hidden');
}

function toggleWrongList() {
    const list = document.getElementById('wrongList');
    if (list) list.classList.toggle('hidden');
}

function redoWrongAnswers() {
     // Use the simpler wrongAnswers list populated during the quiz for redo logic
     if (wrongAnswers.length === 0) {
         alert("No wrong or skipped answers recorded to redo!");
         return;
     }
     const originalQuestionsRef = JSON.parse(localStorage.getItem('quizDataForRestart') || '[]');
     const questionsToRedo = wrongAnswers
         .map(wrongItem => originalQuestionsRef.find(q => q && q.question === wrongItem.question))
         .filter(Boolean);

     if (questionsToRedo.length > 0) {
         questions = [...questionsToRedo]; // Set base questions to the redo set
         resetQuizStateForNewRound(true); // Reset and shuffle the redo set
         loadQuestion();
     } else {
         alert("Error finding the question details for wrong answers.");
     }
}


function restartQuiz() {
    let originalQuestions = [];
    const storedData = localStorage.getItem('quizDataForRestart');
    if (storedData) {
        try {
            originalQuestions = JSON.parse(storedData);
             if (!Array.isArray(originalQuestions)) originalQuestions = [];
        } catch(e) { originalQuestions = []; }
    }
     if (originalQuestions.length === 0) {
         alert("No questions loaded to restart."); return;
     }
    questions = [...originalQuestions];
    resetQuizStateForNewRound(true);
    loadQuestion();
}

function resetQuizStateForNewRound(doShuffle = true) {
    currentIndex = 0; correctCount = 0; wrongCount = 0; selectedAnswer = null;
    completedQuestions = 0;
    correctAnswers = []; wrongAnswers = []; questionTimeStats = [];
    currentQuestionStartTime = 0;
    retryingQuestion = false; retryIndex = -1;
    timeStatsRendered = false; // Reset time stats rendered flag

    // Ensure #timeStatsContainer is hidden on reset
    const timeStatsContainer = document.getElementById('timeStatsContainer');
    if(timeStatsContainer) timeStatsContainer.classList.add('hidden');
    const toggleButton = document.getElementById('toggleTimeDetailsButton');
    if(toggleButton) toggleButton.textContent = 'Show Time Details';


    if (doShuffle && questions.length > 0) {
        randomizedQuestions = shuffleArray([...questions]);
    } else {
        randomizedQuestions = [...questions]; // Use the current 'questions' array (might be full set or redo set)
    }
    totalQuestions = randomizedQuestions.length;

    const progressBarFill = document.getElementById('progressBarFill');
    const questionCount = document.getElementById('questionCount');
    if(progressBarFill) progressBarFill.style.width = '0%';
    if(questionCount) questionCount.innerText = `0% (0/${totalQuestions})`;


    showSlide('quizPage');
}

function goToHomePage() {
    window.location.href = 'index.html';
}

// Removed showTimeStats() function

function formatDuration(ms) {
    if (typeof ms !== 'number' || ms < 0) return "N/A";
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, '0');
    if (minutes > 0) {
        return `${minutes}m ${paddedSeconds}s`;
    } else {
        return `${totalSeconds}s`;
    }
}

function populateTimeTable(statsData) {
    const tbody = document.getElementById('timeStatsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(statsData) || statsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No time data available.</td></tr>';
        return;
    }

    statsData.forEach(stat => {
        const row = tbody.insertRow();

        const cellQuestion = row.insertCell();
        cellQuestion.textContent = stat.question || 'Unknown Question';

        const cellTime = row.insertCell();
        cellTime.textContent = formatDuration(stat.duration);

        const cellStatus = row.insertCell();
        const indicator = document.createElement('div');
        indicator.classList.add('indicator', stat.status);
        let statusText = 'Unknown';
        switch(stat.status) {
            case 'correct': statusText = 'Correct'; break;
            case 'wrong': statusText = 'Wrong'; break;
            case 'skipped': statusText = 'Skipped'; break;
        }
        cellStatus.appendChild(indicator);
        cellStatus.appendChild(document.createTextNode(` ${statusText}`));
    });
}

function calculateSummaryStats(statsData) {
    const totalTimeEl = document.getElementById('totalTimeValue');
    const avgTimeEl = document.getElementById('avgTimeValue');

    if (!totalTimeEl || !avgTimeEl || !Array.isArray(statsData) || statsData.length === 0) {
         if(totalTimeEl) totalTimeEl.textContent = 'N/A';
         if(avgTimeEl) avgTimeEl.textContent = 'N/A';
        return;
    }

    const totalDurationMs = statsData.reduce((sum, stat) => sum + (stat.duration || 0), 0);
    const avgDurationMs = statsData.length > 0 ? totalDurationMs / statsData.length : 0;

    totalTimeEl.textContent = formatDuration(totalDurationMs);
    avgTimeEl.textContent = formatDuration(avgDurationMs);
}

function initializeCharts(statsData) {
    const container = document.getElementById('timeStatsContainer');
    if (!container || typeof Chart === 'undefined' || !Array.isArray(statsData) || statsData.length === 0) {
        return; // Don't try to initialize if container or Chart.js is missing
    }

    // Destroy existing charts if they exist (important for re-rendering on night mode toggle)
    ['timeBarChart', 'timeLineChart', 'timeHistogramChart'].forEach(chartId => {
        const existingChart = Chart.getChart(chartId);
        if (existingChart) {
            existingChart.destroy();
        }
    });


     // Ensure chart containers are visible (they are within timeStatsContainer)
     document.getElementById('barChartContainer').style.display = 'flex';
     document.getElementById('lineChartContainer').style.display = 'flex';
     document.getElementById('histogramContainer').style.display = 'flex';
     document.getElementById('pieChartContainer').style.display = 'none';
     document.getElementById('boxPlotContainer').style.display = 'none';


    const labels = statsData.map((stat, index) => `Q${index + 1}`);
    const durationsSeconds = statsData.map(stat => (stat.duration || 0) / 1000);
    const isNightMode = document.body.classList.contains('night-mode');
    const gridColor = isNightMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const tickColor = isNightMode ? '#ccc' : '#666';
    const titleColor = isNightMode ? '#eee' : '#333';

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: tickColor }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: tickColor },
                title: { display: true, text: 'Time (seconds)', color: titleColor }
            },
            x: {
                grid: { display: false },
                ticks: { color: tickColor },
                 title: { display: true, text: 'Question', color: titleColor }
            }
        }
    };
    const histogramOptions = { ...chartOptions, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, title: { display: true, text: 'Time Bins (seconds)', color: titleColor } }, y: { ...chartOptions.scales.y, title: { display: true, text: 'Number of Questions', color: titleColor } } } };

    const barCtx = document.getElementById('timeBarChart')?.getContext('2d');
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Time per Question (seconds)',
                    data: durationsSeconds,
                    backgroundColor: statsData.map(stat => {
                        switch(stat.status) {
                            case 'correct': return 'rgba(75, 192, 192, 0.6)';
                            case 'wrong': return 'rgba(255, 99, 132, 0.6)';
                            case 'skipped': return 'rgba(255, 206, 86, 0.6)';
                            default: return 'rgba(201, 203, 207, 0.6)';
                        }
                    }),
                    borderColor: statsData.map(stat => {
                         switch(stat.status) {
                            case 'correct': return 'rgb(75, 192, 192)';
                            case 'wrong': return 'rgb(255, 99, 132)';
                            case 'skipped': return 'rgb(255, 206, 86)';
                            default: return 'rgb(201, 203, 207)';
                        }
                    }),
                    borderWidth: 1
                }]
            },
            options: chartOptions
        });
    }

    const lineCtx = document.getElementById('timeLineChart')?.getContext('2d');
     if (lineCtx) {
         const cumulativeTime = durationsSeconds.reduce((acc, duration) => {
             acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + duration);
             return acc;
         }, []);
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cumulative Time (seconds)',
                    data: cumulativeTime,
                    borderColor: isNightMode ? 'rgb(100, 181, 246)' : 'rgb(54, 162, 235)',
                    backgroundColor: isNightMode ? 'rgba(100, 181, 246, 0.2)' : 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
             options: {...chartOptions, scales: {...chartOptions.scales, y: {...chartOptions.scales.y, title: {display: true, text: 'Total Time (seconds)', color: titleColor}}}}
        });
    }

    const histogramCtx = document.getElementById('timeHistogramChart')?.getContext('2d');
    if (histogramCtx) {
        const maxTime = Math.max(...durationsSeconds, 10);
        const binSize = Math.max(Math.ceil(maxTime / 10), 5);
        const numBins = Math.ceil(maxTime / binSize);
        const bins = Array(numBins).fill(0);
        const binLabels = Array(numBins).fill(0).map((_, i) => `${i * binSize}-${(i + 1) * binSize}s`);

        durationsSeconds.forEach(time => {
            const binIndex = Math.min(Math.floor(time / binSize), numBins - 1);
             if (binIndex >= 0) bins[binIndex]++;
        });

        new Chart(histogramCtx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: '# of Questions',
                    data: bins,
                    backgroundColor: isNightMode ? 'rgba(186, 104, 200, 0.6)' : 'rgba(153, 102, 255, 0.6)',
                    borderColor: isNightMode ? 'rgb(186, 104, 200)' : 'rgb(153, 102, 255)',
                    borderWidth: 1
                }]
            },
             options: histogramOptions
        });
     }
     timeStatsRendered = true; // Mark stats as rendered
}

// New function to toggle time stats visibility
function toggleTimeStatsDetails() {
    const container = document.getElementById('timeStatsContainer');
    const button = document.getElementById('toggleTimeDetailsButton');
    if (!container || !button) return;

    const isHidden = container.classList.contains('hidden');

    if (isHidden) {
        // Populate data and render charts ONLY if they haven't been rendered yet
        if (!timeStatsRendered) {
            populateTimeTable(questionTimeStats);
            calculateSummaryStats(questionTimeStats);
            initializeCharts(questionTimeStats); // This will set timeStatsRendered = true
        }
        container.classList.remove('hidden');
        button.textContent = 'Hide Time Details';
    } else {
        container.classList.add('hidden');
        button.textContent = 'Show Time Details';
    }
}
