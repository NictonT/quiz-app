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

document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('quizDataToExecute');

    if (storedData) {
        try {
            questions = JSON.parse(storedData);
            localStorage.removeItem('quizDataToExecute');

            if (!Array.isArray(questions)) {
                if (questions && typeof questions === 'object' && questions.question && questions.answers && questions.correctAnswer) {
                     questions = [questions];
                } else {
                    console.error('Error: Stored quiz data is not a valid array or single question object.', questions);
                    questions = [];
                    alert("Error: Could not load valid quiz questions.");
                }
            } else {
                 const originalLength = questions.length;
                 questions = questions.filter(q => q && typeof q === 'object' && q.question && q.answers && typeof q.answers === 'object' && q.correctAnswer);
                 if (questions.length !== originalLength) {
                      console.warn(`execute.js: Filtered out ${originalLength - questions.length} invalid question objects.`);
                 }
            }

            if (questions.length > 0) {
                randomizedQuestions = shuffleArray(questions);
                totalQuestions = randomizedQuestions.length;
                completedQuestions = 0;
                loadQuestion();
                showSlide('quizPage');
            } else {
                 console.error("execute.js: No valid questions found after parsing/filtering.");
                 alert("No valid questions found to start the quiz.");
                 goToHomePage();
            }

        } catch (e) {
            console.error('Error parsing stored quiz data:', e);
            alert(`Error loading quiz questions: ${e.message}\nPlease check the JSON format.`);
             localStorage.removeItem('quizDataToExecute');
             goToHomePage();
        }
    } else {
        console.warn("execute.js: No 'quizDataToExecute' found in localStorage.");
        alert("No quiz data found. Please select a quiz file or folder to execute.");
        goToHomePage();
    }
    updateNightMode();
});

function updateNightMode() {
    const nightModeToggle = document.getElementById('nightModeToggleQuiz');
    if (!nightModeToggle) {
        console.warn("Night mode toggle not found in execute.html");
        return;
    }
    const nightModeActive = localStorage.getItem('nightMode') === 'true';
    document.body.classList.toggle('night-mode', nightModeActive);
    nightModeToggle.checked = nightModeActive;

    nightModeToggle.addEventListener('change', function () {
        const isEnabled = this.checked;
        document.body.classList.toggle('night-mode', isEnabled);
        localStorage.setItem('nightMode', String(isEnabled));
    });
}

function showSlide(slideId) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        slide.classList.add("hidden");
        slide.classList.remove("active");
    });

    const slideToShow = document.getElementById(slideId);
    if (slideToShow) {
        slideToShow.classList.remove("hidden");
        slideToShow.classList.add("active");
    } else {
         console.error(`execute.js: Slide with ID "${slideId}" not found.`);
    }
}

function loadQuestion() {
    if (retryingQuestion) {
        currentIndex = retryIndex;
    }

    if (currentIndex >= 0 && currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];

         if (!question || !question.question || !question.answers || typeof question.answers !== 'object') {
              console.error(`Invalid question structure at index ${currentIndex}:`, question);
              alert(`Error: Invalid question data encountered at question ${currentIndex + 1}. Skipping.`);
              currentIndex++;
              completedQuestions++;
              loadQuestion();
              return;
         }

        const questionTextEl = document.getElementById('questionText');
        if(questionTextEl) questionTextEl.innerText = question.question;

        const answersContainer = document.getElementById('answersContainer');
        if (!answersContainer) {
             console.error("Answers container not found!");
             return;
        }
        answersContainer.innerHTML = '';

        const shuffledDisplayAnswers = shuffleAnswers(question.answers);

        for (let displayKey in shuffledDisplayAnswers) {
            const originalAnswerText = shuffledDisplayAnswers[displayKey];
            let answerElement = document.createElement('div');
            answerElement.classList.add('answer');
            answerElement.dataset.originalKey = Object.keys(question.answers).find(key => question.answers[key] === originalAnswerText);
            answerElement.dataset.displayKey = displayKey;
            answerElement.dataset.answerText = originalAnswerText;

            answerElement.innerText = `${displayKey}) ${originalAnswerText}`;
            answerElement.onclick = () => selectAnswer(answerElement);
            answersContainer.appendChild(answerElement);
        }

        selectedAnswer = null;
        const submitButton = document.getElementById('submitButton');
        const skipButton = document.getElementById('skipButton');
        const helpButton = document.querySelector('.help-button');

         if(submitButton) {
             submitButton.style.display = 'block';
             submitButton.disabled = true;
         }
         if(skipButton) skipButton.style.display = retryingQuestion ? 'none' : 'block';
         if(helpButton) helpButton.style.display = 'block';

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
     if (!selectedElement) return;

     const displayKey = selectedElement.dataset.displayKey;
     const originalKey = selectedElement.dataset.originalKey;
     const answerText = selectedElement.dataset.answerText;

     selectedAnswer = {
         displayKey: displayKey,
         originalKey: originalKey,
         answerText: answerText
     };

     document.querySelectorAll('.answer').forEach(el => el.classList.remove('selected'));
     selectedElement.classList.add('selected');

     const submitButton = document.getElementById('submitButton');
     if (submitButton) submitButton.disabled = false;
 }

function submitAnswer() {
    if (!selectedAnswer) {
        alert('Please select an answer first.');
        return;
    }

    const currentQuestion = randomizedQuestions[currentIndex];
    if (!currentQuestion || !currentQuestion.answers || !currentQuestion.correctAnswer) {
         console.error("Cannot submit, invalid current question data:", currentQuestion);
         alert("Error processing answer. Invalid question data.");
         return;
    }

     const isCorrect = selectedAnswer.originalKey === currentQuestion.correctAnswer;

     if (isCorrect) {
         recordCorrectAnswer(currentIndex, selectedAnswer);
         removeFromWrongAnswers(currentQuestion.question);
     } else {
         recordWrongAnswer(currentIndex, selectedAnswer, false);
     }

     if (!retryingQuestion) {
         completedQuestions++;
     }

     if (retryingQuestion) {
         retryingQuestion = false;
         retryIndex = -1;
         showResults();
     } else {
         currentIndex++;
         loadQuestion();
     }

     updateProgressBar();
 }

function skipQuestion() {
    if (retryingQuestion) return;

     const currentQuestion = randomizedQuestions[currentIndex];
     if (!currentQuestion) {
          console.error("Cannot skip, invalid current question data.");
          return;
     }

    recordWrongAnswer(currentIndex, null, true);

    completedQuestions++;
    currentIndex++;
    updateProgressBar();
    loadQuestion();
}

function showAnswer() {
    if (currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
         if (!question || !question.answers || !question.correctAnswer) {
             console.error("Cannot show answer, invalid question data:", question);
             return;
         }
        const correctAnswerKey = question.correctAnswer;

        document.querySelectorAll('.answer').forEach(el => {
            if (el.dataset.originalKey === correctAnswerKey) {
                el.classList.add('correct');
                el.style.border = '2px solid green';
                el.style.fontWeight = 'bold';
            } else {
                 el.style.opacity = '0.6';
            }
             el.onclick = null;
        });

         const submitButton = document.getElementById('submitButton');
         const helpButton = document.querySelector('.help-button');
         const skipButton = document.getElementById('skipButton');

         if(submitButton) submitButton.style.display = 'none';
         if(helpButton) helpButton.style.display = 'none';
         if(skipButton) skipButton.style.display = 'block';
    }
}

function recordWrongAnswer(questionIndex, selectedAnswerObj, skipped = false) {
    const question = randomizedQuestions[questionIndex];
    if (!question) return;

    const existingWrongIndex = wrongAnswers.findIndex(q => q.question === question.question);
    if (existingWrongIndex !== -1) {
        wrongAnswers.splice(existingWrongIndex, 1);
    }

    wrongAnswers.push({
        question: question.question,
        selected: selectedAnswerObj ? selectedAnswerObj.answerText : null,
        correct: question.answers[question.correctAnswer],
        skipped: skipped
    });
}

function recordCorrectAnswer(questionIndex, selectedAnswerObj) {
    const question = randomizedQuestions[questionIndex];
     if (!question) return;

    const existingCorrectIndex = correctAnswers.findIndex(q => q.question === question.question);
    if (existingCorrectIndex !== -1) {
        correctAnswers.splice(existingCorrectIndex, 1);
    }

    correctAnswers.push({
        question: question.question,
        correct: selectedAnswerObj.answerText
    });
}

function removeFromWrongAnswers(questionText) {
    const index = wrongAnswers.findIndex(item => item.question === questionText);
    if (index !== -1) {
        wrongAnswers.splice(index, 1);
    }
}

function showResults() {
    showSlide('resultPage');

    const correctList = document.getElementById('correctList');
    const wrongList = document.getElementById('wrongList');
    const scoreTextEl = document.getElementById('scoreText');
    const correctChartEl = document.getElementById('correctPercentage');
    const wrongChartEl = document.getElementById('wrongPercentage');

    if (!correctList || !wrongList || !scoreTextEl || !correctChartEl || !wrongChartEl) {
        console.error("One or more results page elements are missing!");
        return;
    }

    correctList.innerHTML = '';
    wrongList.innerHTML = '';
    correctList.classList.add('hidden');
    wrongList.classList.add('hidden');

    correctAnswers.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<div class="indicator correct"></div> ${item.question} <br><i><small>(Correct: ${item.correct})</small></i>`;
        listItem.onclick = () => retryQuestion(item.question);
        correctList.appendChild(listItem);
    });

    wrongAnswers.forEach(item => {
        const listItem = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
         let details = item.skipped ? '<i>(Skipped)</i>' : `<i><small>(Selected: ${item.selected || 'None'}, Correct: ${item.correct})</small></i>`;
        listItem.innerHTML = `<div class="indicator ${indicatorClass}"></div> ${item.question} <br>${details}`;
        listItem.onclick = () => retryQuestion(item.question);
        wrongList.appendChild(listItem);
    });

    const finalCorrectCount = correctAnswers.length;
    const finalWrongCount = wrongAnswers.length;
    const finalTotalAttempted = finalCorrectCount + finalWrongCount;

    let correctPercentage = 0;
    let wrongPercentage = 0;

    if (finalTotalAttempted > 0) {
        correctPercentage = Math.round((finalCorrectCount / finalTotalAttempted) * 100);
        wrongPercentage = 100 - correctPercentage;
    }

    scoreTextEl.innerText = `Score: ${correctPercentage}% (${finalCorrectCount}/${finalTotalAttempted})`;

    correctChartEl.style.setProperty('--percentage', `${correctPercentage}%`);
    wrongChartEl.style.setProperty('--percentage', `${wrongPercentage}%`);

    correctChartEl.setAttribute('data-count', finalCorrectCount);
    wrongChartEl.setAttribute('data-count', finalWrongCount);

     correctChartEl.onclick = null;
     correctChartEl.onclick = toggleCorrectList;
     wrongChartEl.onclick = null;
     wrongChartEl.onclick = toggleWrongList;
}

function updateProgressBar() {
    const progressBarFill = document.getElementById('progressBarFill');
    const questionCountEl = document.getElementById('questionCount');

    if (!progressBarFill || !questionCountEl) return;

    let progressPercentage = 0;
    if (totalQuestions > 0) {
        const currentCompleted = Math.min(completedQuestions, totalQuestions);
        progressPercentage = Math.round((currentCompleted / totalQuestions) * 100);
    }

    progressBarFill.style.width = `${progressPercentage}%`;
    questionCountEl.innerText = `${progressPercentage}%`;
}

function retryQuestion(questionText) {
    const originalIndex = randomizedQuestions.findIndex(q => q.question === questionText);

    if (originalIndex !== -1) {
         retryingQuestion = true;
         retryIndex = originalIndex;
         completedQuestions = originalIndex;
         showSlide('quizPage');
         loadQuestion();
    } else {
        console.error(`Could not find question "${questionText}" to retry.`);
        alert("Error: Could not find the selected question to retry.");
    }
}

function toggleCorrectList() {
    const correctList = document.getElementById('correctList');
    if (correctList) {
        correctList.classList.toggle('hidden');
    }
}

function toggleWrongList() {
    const wrongList = document.getElementById('wrongList');
     if (wrongList) {
        wrongList.classList.toggle('hidden');
    }
}

function redoWrongAnswers() {
    if (wrongAnswers.length === 0) {
        alert("No wrong answers to redo!");
        return;
    }
    const questionsToRedo = wrongAnswers.map(item => {
        return questions.find(q => q.question === item.question);
    }).filter(q => q !== undefined);

    if (questionsToRedo.length > 0) {
        randomizedQuestions = shuffleArray(questionsToRedo);
        resetQuizStateForNewRound();
        loadQuestion();
    } else {
        alert("Error finding questions to redo.");
    }
}

function restartQuiz() {
    if (questions.length === 0) {
         alert("No questions loaded to restart.");
         return;
    }
    randomizedQuestions = shuffleArray([...questions]);
    resetQuizStateForNewRound();
    loadQuestion();
}

function resetQuizStateForNewRound() {
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    selectedAnswer = null;

    completedQuestions = 0;
    totalQuestions = randomizedQuestions.length;

    showSlide('quizPage');
    updateProgressBar();
}

function goToHomePage() {
    window.location.href = 'index.html';
}
