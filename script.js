document.addEventListener('DOMContentLoaded', () => {
    const nightModeToggle = document.getElementById('nightModeToggle');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    nightModeToggle.addEventListener('change', function () {
        document.body.classList.toggle('night-mode', this.checked);
        localStorage.setItem('nightMode', this.checked);
    });
});

function executeQuiz() {
    const jsonInput = document.getElementById('jsonInput').value;
    localStorage.setItem('quizData', jsonInput);
    window.location.href = 'execute.html';
}

function goToFilesPage() {
    window.location.href = 'files.html';
}
