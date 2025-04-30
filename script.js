document.addEventListener('DOMContentLoaded', () => {
    // Use a unique ID for this page's toggle if necessary
    const nightModeToggle = document.getElementById('nightModeToggleMain');
    if (nightModeToggle) {
        const nightModeActive = localStorage.getItem('nightMode') === 'true';
        document.body.classList.toggle('night-mode', nightModeActive);
        nightModeToggle.checked = nightModeActive;

        nightModeToggle.addEventListener('change', function () {
            const isEnabled = this.checked;
            document.body.classList.toggle('night-mode', isEnabled);
            // Ensure consistency: update the shared localStorage item
            localStorage.setItem('nightMode', String(isEnabled));
        });
    } else {
        console.warn("Night mode toggle 'nightModeToggleMain' not found.");
        // Apply class based on storage anyway, even if toggle isn't there
         const nightModeActive = localStorage.getItem('nightMode') === 'true';
         document.body.classList.toggle('night-mode', nightModeActive);
    }
});

// Helper function (copied logic from files.js) to check question format
function isValidQuizQuestionFormat(item) {
    return item && typeof item === 'object' && item !== null &&
           typeof item.question === 'string' &&
           typeof item.answers === 'object' && item.answers !== null && !Array.isArray(item.answers) &&
           typeof item.correctAnswer === 'string';
}

function executeQuizFromInput() {
    const jsonInputTextArea = document.getElementById('jsonInput');
    if (!jsonInputTextArea) {
        alert("Error: Text area element not found.");
        return;
    }

    // 1. Get the value and trim whitespace
    const jsonInput = jsonInputTextArea.value.trim();

    // 2. Check if the trimmed value is empty
    if (!jsonInput) {
        // If it's empty, show the specific alert and stop the function
        alert("You didn't type anything! Please enter JSON data into the text area.");
        return; // Exit the function
    }

    // 3. If it's not empty, proceed with parsing and validation
    let parsedData;
    let quizDataArray;

    try {
        parsedData = JSON.parse(jsonInput);

        // Validate and ensure it's an array
        if (isValidQuizQuestionFormat(parsedData)) {
            quizDataArray = [parsedData]; // Wrap single object
            console.log("Input is a single valid question object. Wrapping in array.");
        } else if (Array.isArray(parsedData)) {
            if (parsedData.length > 0 && !parsedData.every(isValidQuizQuestionFormat)) {
                const firstInvalid = parsedData.find(item => !isValidQuizQuestionFormat(item));
                console.error("Invalid item found in array:", firstInvalid);
                throw new Error("One or more objects in the JSON array do not match the required quiz format (question, answers object, correctAnswer).");
            }
            quizDataArray = parsedData; // It's a valid array
            console.log("Input is an array. Validating elements.");
        } else {
            throw new Error("The entered JSON is not a valid quiz question object or an array of question objects.");
        }

        // Check if the resulting array is empty (e.g., user entered `[]`)
        if (quizDataArray.length === 0) {
             alert("The JSON represents an empty quiz. Nothing to execute.");
             return;
        }

        // Store using the key expected by execute.js
        localStorage.setItem('quizDataToExecute', JSON.stringify(quizDataArray));
        console.log(`Stored ${quizDataArray.length} questions from input for execution.`);

        // Redirect to the quiz execution page
        window.location.href = 'execute.html';

    } catch (e) {
        console.error("Error processing JSON input:", e);
        // Keep the more specific JSON error alert
        alert(`Invalid JSON or incorrect format:\n${e.message}\nPlease check the structure.`);
    }
}

function goToFilesPage() {
    window.location.href = 'files.html';
}
