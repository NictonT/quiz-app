let questions = [];
let randomizedQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let skippedQuestions = [];
let selectedAnswer = '';
let wrongAnswers = [];
let correctAnswers = [];
let retryingQuestion = false;
let retryIndex = -1;
let totalQuestions = 0;
let completedQuestions = 0;

document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('quizData');
    if (storedData) {
        try {
            questions = JSON.parse(storedData);
            if (!Array.isArray(questions)) questions = [questions];
            randomizedQuestions = shuffleArray(questions);
            totalQuestions = randomizedQuestions.length;
            loadQuestion();
        } catch (e) {
            console.error('Error parsing stored data:', e);
        }
    }
    updateNightMode();
});

function updateNightMode() {
    const nightModeToggle = document.getElementById('nightModeToggle');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    nightModeToggle.addEventListener('change', function () {
        document.body.classList.toggle('night-mode', this.checked);
        localStorage.setItem('nightMode', this.checked);
    });
}

function showSlide(slideId) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        slide.classList.add("hidden");
        slide.classList.remove("active");
    });

    const slide = document.getElementById(slideId);
    slide.classList.remove("hidden");
    slide.classList.add("active");
}

function loadQuestion() {
    if (retryingQuestion) {
        currentIndex = retryIndex;
    }

    if (currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
        document.getElementById('questionText').innerText = question.question;
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = '';
        const shuffledAnswers = shuffleAnswers(question.answers);
        for (let key in shuffledAnswers) {
            let answerElement = document.createElement('div');
            answerElement.classList.add('answer');
            answerElement.innerText = `${key}: ${shuffledAnswers[key]}`;
            answerElement.onclick = () => selectAnswer(key, shuffledAnswers[key]);
            answersContainer.appendChild(answerElement);
        }
        document.querySelector('.help-button').style.display = 'block';
        document.getElementById('submitButton').style.display = 'block';
        document.getElementById('submitButton').disabled = true;
        document.getElementById('skipButton').style.display = retryingQuestion ? 'none' : 'block';
        updateProgressBar();
    } else {
        showResults();
    }
}

function shuffleArray(array) {
    let shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleAnswers(answers) {
    const keys = Object.keys(answers);
    const shuffledKeys = shuffleArray(keys);
    let shuffledAnswers = {};
    shuffledKeys.forEach((key, index) => {
        shuffledAnswers[String.fromCharCode(65 + index)] = answers[key];
    });
    return shuffledAnswers;
}

function selectAnswer(key, answer) {
    selectedAnswer = { key, answer };
    document.querySelectorAll('.answer').forEach(el => {
        el.classList.remove('selected');
        if (el.innerText.startsWith(key)) {
            el.classList.add('selected');
        }
    });
    document.getElementById('submitButton').disabled = false;
}

function submitAnswer() {
    if (selectedAnswer) {
        const currentQuestion = randomizedQuestions[currentIndex];
        if (selectedAnswer.answer === currentQuestion.answers[currentQuestion.correctAnswer]) {
            correctCount++;
            recordCorrectAnswer(currentIndex, selectedAnswer);
            removeFromWrongAnswers(currentQuestion.question);
        } else {
            wrongCount++;
            recordWrongAnswer(currentIndex, selectedAnswer);
        }
        if (completedQuestions < totalQuestions) {
            completedQuestions++;
        }
        if (retryingQuestion) {
            showResults();
            retryingQuestion = false;
        } else {
            currentIndex++;
            loadQuestion();
        }
        updateProgressBar();
    } else {
        alert('Please select an answer');
    }
}

function skipQuestion() {
    wrongCount++;
    recordWrongAnswer(currentIndex, null, true);
    if (completedQuestions < totalQuestions) {
        completedQuestions++;
    }
    currentIndex++;
    updateProgressBar();
    loadQuestion();
}

function showAnswer() {
    if (currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
        const correctAnswer = question.answers[question.correctAnswer];
        document.querySelectorAll('.answer').forEach(el => {
            if (el.innerText.includes(correctAnswer)) {
                el.classList.add('correct');
                el.style.backgroundColor = 'green';
            }
        });
        document.getElementById('submitButton').style.display = 'none';
        document.querySelector('.help-button').style.display = 'none';
        document.getElementById('skipButton').style.display = 'block';
    }
}

function recordWrongAnswer(index, selectedAnswer, skipped = false) {
    const question = randomizedQuestions[index];
    const existingWrong = wrongAnswers.findIndex(q => q.question === question.question);
    if (existingWrong !== -1) {
        wrongAnswers.splice(existingWrong, 1);
    }
    wrongAnswers.push({
        question: question.question,
        selected: selectedAnswer ? selectedAnswer.answer : null,
        correct: question.answers[question.correctAnswer],
        skipped: skipped
    });
}

function recordCorrectAnswer(index, selectedAnswer) {
    const question = randomizedQuestions[index];
    const existingCorrect = correctAnswers.findIndex(q => q.question === question.question);
    if (existingCorrect !== -1) {
        correctAnswers.splice(existingCorrect, 1);
    }
    correctAnswers.push({
        question: question.question,
        correct: question.answers[question.correctAnswer]
    });
}

function removeFromWrongAnswers(question) {
    const index = wrongAnswers.findIndex(item => item.question === question);
    if (index !== -1) {
        wrongAnswers.splice(index, 1);
        wrongCount--;
    }
}

function showResults() {
    showSlide('resultPage');
    const correctList = document.getElementById('correctList');
    const wrongList = document.getElementById('wrongList');
    correctList.innerHTML = '';
    wrongList.innerHTML = '';
    
    correctAnswers.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<div class="indicator correct"></div> ${item.question}`;
        listItem.onclick = () => retryQuestion(item.question, 'correct');
        correctList.appendChild(listItem);
    });
    
    wrongAnswers.forEach(item => {
        const listItem = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
        listItem.innerHTML = `<div class="indicator ${indicatorClass}"></div> ${item.question}`;
        listItem.onclick = () => retryQuestion(item.question, indicatorClass);
        wrongList.appendChild(listItem);
    });

    correctCount = correctAnswers.length;
    wrongCount = wrongAnswers.length;
    totalQuestions = correctCount + wrongCount;

    const correctPercentage = Math.round((correctCount / totalQuestions) * 100);
    const wrongPercentage = Math.round((wrongCount / totalQuestions) * 100);

    document.getElementById('correctPercentage').style.setProperty('--percentage', `${correctPercentage}%`);
    document.getElementById('wrongPercentage').style.setProperty('--percentage', `${wrongPercentage}%`);

    document.getElementById('correctPercentage').setAttribute('data-count', correctCount);
    document.getElementById('wrongPercentage').setAttribute('data-count', wrongCount);

    document.getElementById('scoreText').innerText = `Score: ${correctPercentage}%`;

    document.getElementById('correctPercentage').onclick = toggleCorrectList;
    document.getElementById('wrongPercentage').onclick = toggleWrongList;
}

function updateProgressBar() {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercentage = Math.min(Math.round((completedQuestions / totalQuestions) * 100), 100);
    progressBarFill.style.width = `${progressPercentage}%`;
    document.getElementById('questionCount').innerText = `${progressPercentage}%`;
}

function retryQuestion(questionText, type) {
    retryingQuestion = true;
    retryIndex = randomizedQuestions.findIndex(q => q.question === questionText);

    if (retryIndex !== -1) {
        showSlide('quizPage');
        currentIndex = retryIndex;
        loadQuestion();
        
        document.getElementById('skipButton').style.display = 'none';
        document.getElementById('submitButton').style.display = 'block';
        document.querySelector('.help-button').style.display = 'block';
    }
}

function toggleCorrectList() {
    const correctList = document.getElementById('correctList');
    correctList.classList.toggle('hidden');
    updateDataCount('correctPercentage', correctList);
}

function toggleWrongList() {
    const wrongList = document.getElementById('wrongList');
    wrongList.classList.toggle('hidden');
    updateDataCount('wrongPercentage', wrongList);
}

function updateDataCount(elementId, listElement) {
    const element = document.getElementById(elementId);
    const visibleCount = listElement.classList.contains('hidden') ? 0 : listElement.children.length;
    element.setAttribute('data-count', visibleCount);
}

function redoWrongAnswers() {
    randomizedQuestions = shuffleArray(wrongAnswers.map(item => {
        return questions.find(q => q.question === item.question);
    }));
    resetQuizState();
    loadQuestion();
}

function restartQuiz() {
    randomizedQuestions = shuffleArray(questions.slice());
    resetQuizState();
    loadQuestion();
}

function resetQuizState() {
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    skippedQuestions = [];
    selectedAnswer = '';
    wrongAnswers = [];
    correctAnswers = [];
    completedQuestions = 0;
    totalQuestions = randomizedQuestions.length;
    showSlide('quizPage');
    updateProgressBar();
}

function goToHomePage() {
    window.location.href = 'index.html';
}