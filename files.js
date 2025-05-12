class FileManager {
    constructor() {
        // Cache DOM elements diligently
        this.filesContainer = document.getElementById('filesContainer');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileType = document.getElementById('fileType');
        this.newFileNameInput = document.getElementById('newFileNameInput');
        this.addFileModal = document.getElementById('addFileModal'); // Make sure this ID exists in files.html
        this.renameFileModal = document.getElementById('renameFileModal');
        this.executionModal = document.getElementById('executionModal'); // Keep refs even if unused for quiz
        this.executionFrame = document.getElementById('executionFrame'); // Keep refs
        this.filesPage = document.getElementById('filesPage');
        this.editPage = document.getElementById('editPage');
        this.currentEditFileName = document.getElementById('currentEditFileName');
        this.fileContent = document.getElementById('fileContent');
        this.nightModeToggleFiles = document.getElementById('nightModeToggleFiles');
        this.nightModeToggleEdit = document.getElementById('nightModeToggleEdit');
        this.viewToggleBtn = document.getElementById('viewToggleBtn');
        this.codeEditorView = document.getElementById('codeEditorView');
        this.visualEditorView = document.getElementById('visualEditorView');
        this.visualEditorContainer = document.getElementById('visualEditorContainer');
        this.pageTitle = document.getElementById('pageTitle'); // Cache page title

        // State variables
        this.files = JSON.parse(localStorage.getItem('files')) || [];
        this.currentFolderPath = []; // Array of folder IDs
        this.ascending = true;
        this.currentFileId = null; // ID of file being edited/renamed
        this.currentEditorView = 'code';
        this.visualEditorData = null; // Holds parsed data for visual editor (always an array)

        // Initialization
        this.initNightMode();
        this.displayFiles();
        console.log("FileManager initialized."); // Log successful initialization
    }

    // --- Core File System Logic ---
    generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    findFileById(files, id) {
        if (!Array.isArray(files)) return null;
        for (const file of files) {
            if (file.id === id) return file;
            if (file.type === 'Folder' && Array.isArray(file.content)) {
                const found = this.findFileById(file.content, id);
                if (found) return found;
            }
        }
        return null;
    }

    findFileAnywhere(id) {
        return this.findFileById(this.files, id);
    }

    getCurrentFolderFiles() {
        let folderContent = this.files;
        let currentLevel = this.files;
        try {
            for (const folderId of this.currentFolderPath) {
                const nextFolder = currentLevel.find(file => file.id === folderId && file.type === 'Folder');
                if (nextFolder && Array.isArray(nextFolder.content)) {
                    folderContent = nextFolder.content;
                    currentLevel = nextFolder.content;
                } else {
                    throw new Error(`Invalid folder structure or ID ${folderId} not found.`);
                }
            }
            return folderContent;
        } catch (error) {
            console.error("Error in getCurrentFolderFiles:", error, "Resetting path.");
            this.currentFolderPath = []; // Reset path if invalid
            return this.files; // Return root
        }
    }

     getParentFolderFiles(fileId) {
       const findParent = (currentFiles, targetId, parentArray) => {
            if (!Array.isArray(currentFiles)) return null;
            for (let i = 0; i < currentFiles.length; i++) {
                const file = currentFiles[i];
                if (file.id === targetId) return parentArray;
                if (file.type === 'Folder' && Array.isArray(file.content)) {
                    const found = findParent(file.content, targetId, file.content);
                    if (found) return found;
                }
            }
            return null;
        };
        return findParent(this.files, fileId, this.files); // Start search from root
    }

    updatePageTitle() {
        if (!this.pageTitle) return; // Check if element exists
        let pathString = 'Files';
        if (this.currentFolderPath.length > 0) {
            let currentLevel = this.files;
            let pathNames = [];
            let pathValid = true;
            for (const folderId of this.currentFolderPath) {
                const folder = currentLevel.find(f => f.id === folderId && f.type === 'Folder');
                if (folder) {
                    pathNames.push(folder.name || '[No Name]');
                    if (Array.isArray(folder.content)) {
                        currentLevel = folder.content;
                    } else { pathNames.push('[Inv. Content]'); pathValid = false; break; }
                } else { pathNames.push('[Not Found]'); pathValid = false; break; }
            }
            pathString = pathValid ? `Files / ${pathNames.join(' / ')}` : 'Files / [Error In Path]';
        }
        this.pageTitle.textContent = pathString;
    }

    persistFiles() {
        try {
            localStorage.setItem('files', JSON.stringify(this.files));
        } catch (e) {
            console.error("Error saving files to localStorage:", e);
            alert("Could not save file data. Storage might be full.");
        }
    }

    // --- UI Display ---
    displayFiles() {
        if (!this.filesContainer) return; // Check element exists
        this.filesContainer.innerHTML = ''; // Clear previous
        const currentFolderFiles = this.getCurrentFolderFiles();

        if (!Array.isArray(currentFolderFiles)) {
            this.filesContainer.innerHTML = '<p style="color: red;">Error loading folder contents.</p>';
            this.updatePageTitle(); return;
        }

        const sortedFiles = [...currentFolderFiles].sort((a, b) => { // Use spread for copy
            const nameA = a.name || ''; const nameB = b.name || '';
            return this.ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        if (sortedFiles.length === 0) {
             this.filesContainer.innerHTML = '<p>This folder is empty.</p>';
        } else {
            sortedFiles.forEach((file) => {
                if (!file.id) file.id = this.generateUniqueId(); // Assign ID if missing
                const fileElement = document.createElement('div');
                fileElement.classList.add('file-item');
                let fileTypeEmoji = file.type === 'JSON' ? '📄' : (file.type === 'Folder' ? '📁' : '❓');

                let actionButtons = '';
                if (file.type === 'Folder') {
                    actionButtons = `
                        <button class="button primary" onclick="fileManager.openFolder('${file.id}')">Open</button>
                        <button class="button secondary" onclick="fileManager.executeFile('${file.id}')">Execute Folder Quiz</button>
                     `;
                } else if (file.type === 'JSON') {
                     actionButtons = `
                         <button class="button primary" onclick="fileManager.openEditFileModal('${file.id}')">Edit</button>
                         <button class="button secondary" onclick="fileManager.executeFile('${file.id}')">Execute Quiz</button>
                     `;
                } else { actionButtons = `<button class="button secondary" disabled>Execute</button>`; }

                fileElement.innerHTML = `
                    <div>
                        <span>${fileTypeEmoji} ${file.name || 'Unnamed'}</span>
                        <button class="icon-button" title="Rename" onclick="fileManager.showRenameFileModal('${file.id}')">✏️</button>
                    </div>
                    <div>
                        ${actionButtons}
                        <button class="button" title="Delete" onclick="fileManager.deleteFile('${file.id}')">Delete</button>
                    </div>
                `;
                this.filesContainer.appendChild(fileElement);
            });
        }
        this.updatePageTitle();
    }

    // --- Modal Handling --- (MODIFIED) ---
    showAddFileModal() {
        console.log("Attempting to show Add File modal..."); // Keep this debug log
        if (this.addFileModal && this.fileNameInput && this.fileType) {
            this.fileNameInput.value = '';
            this.fileType.value = 'JSON'; // Reset type
            this.addFileModal.classList.remove('hidden'); // *** ADDED THIS LINE ***
            this.addFileModal.style.display = 'flex';     // Ensure display is flex
             console.log("Add File modal display set to flex and hidden class removed."); // Updated log
        } else {
             console.error("Add File Modal or its input elements not found.");
             alert("Error: Cannot open the Add File dialog.");
        }
    }

    closeAddFileModal() {
        if (this.addFileModal) {
            this.addFileModal.style.display = 'none';  // Hide it
            this.addFileModal.classList.add('hidden'); // *** ADDED THIS LINE ***
        }
    }

    showRenameFileModal(id) {
        const file = this.findFileAnywhere(id);
        if (file && this.renameFileModal && this.newFileNameInput) {
            this.currentFileId = id;
            this.newFileNameInput.value = file.name || '';
            this.renameFileModal.classList.remove('hidden'); // *** ADDED THIS LINE ***
            this.renameFileModal.style.display = 'flex';
        } else { alert('Error preparing rename dialog.'); }
    }

    closeRenameFileModal() {
        this.currentFileId = null;
        if (this.renameFileModal) {
             this.renameFileModal.style.display = 'none';
             this.renameFileModal.classList.add('hidden'); // *** ADDED THIS LINE ***
        }
    }

     closeExecutionModal() {
        if (this.executionModal) {
            this.executionModal.style.display = 'none';
            this.executionModal.classList.add('hidden'); // *** ADDED THIS LINE (Consistency) ***
            if (this.executionFrame) this.executionFrame.srcdoc = '';
        }
    }
    // --- End Modal Handling Modifications ---

    // --- Edit Page ---
    openEditFileModal(id) {
        const file = this.findFileAnywhere(id);
        if (!file) { alert('File not found.'); return; }
        if (file.type === 'Folder') { alert('Cannot edit folders directly.'); return; }

        this.currentFileId = id;
        this.currentEditFileName.textContent = file.name || '[No Name]';
        this.fileContent.value = file.content || '';
        this.visualEditorData = null;
        this.viewToggleBtn.style.display = 'none';

        if (file.type === 'JSON') {
            try {
                const jsonData = JSON.parse(file.content || 'null');
                let dataForVisual = null;
                let isFormatValid = false;

                if (Array.isArray(jsonData)) {
                    isFormatValid = jsonData.length === 0 || jsonData.every(this.isValidQuizQuestionFormat);
                    if (isFormatValid) dataForVisual = jsonData;
                } else if (this.isValidQuizQuestionFormat(jsonData)) {
                    isFormatValid = true;
                    dataForVisual = [jsonData];
                }

                if (isFormatValid) {
                    this.visualEditorData = dataForVisual;
                    this.viewToggleBtn.style.display = 'inline-block';
                } else {
                    console.warn("JSON content does not match expected quiz format for file:", id);
                }
            } catch (e) {
                console.warn(`File "${file.name}" is not valid JSON or check failed:`, e);
            }
        }

        this.switchToCodeView();
        this.filesPage.classList.add('hidden');
        this.filesPage.classList.remove('active');
        this.editPage.classList.remove('hidden');
        this.editPage.classList.add('active');
        this.syncNightModeToggles();
    }

    isValidQuizQuestionFormat(item) {
        return item && typeof item === 'object' && item !== null &&
               typeof item.question === 'string' &&
               typeof item.answers === 'object' && item.answers !== null && !Array.isArray(item.answers) &&
               typeof item.correctAnswer === 'string';
    }

    closeEditFileModal() {
        if (this.editPage) this.editPage.classList.add('hidden');
        if (this.editPage) this.editPage.classList.remove('active');
        if (this.filesPage) this.filesPage.classList.remove('hidden');
        if (this.filesPage) this.filesPage.classList.add('active');
        this.currentFileId = null;
        this.visualEditorData = null;
    }

    // --- File Operations ---
    addNewFile() {
        if (!this.fileNameInput || !this.fileType) return;
        const fileName = this.fileNameInput.value.trim();
        const type = this.fileType.value;
        if (!fileName) { alert('File name cannot be empty.'); return; }
        const currentFolderFiles = this.getCurrentFolderFiles();
        if (currentFolderFiles.some(file => file.name === fileName)) {
             alert(`"${fileName}" already exists here.`); return;
        }
        const newFile = { id: this.generateUniqueId(), name: fileName, type: type, content: type === 'Folder' ? [] : '' };
        currentFolderFiles.push(newFile);
        this.persistFiles(); this.displayFiles(); this.closeAddFileModal();
    }

    deleteFile(id) {
        const parentArray = this.getParentFolderFiles(id);
        if (!parentArray) { alert('Error: Could not find parent folder.'); return; }
        const fileIndex = parentArray.findIndex(file => file.id === id);

        if (fileIndex !== -1) {
             const file = parentArray[fileIndex];
             let confirmMsg = `Delete ${file.type} "${file.name || '[No Name]'}"?`;
             if (file.type === 'Folder') confirmMsg += '\nThis deletes all content inside!';

             if (confirm(confirmMsg)) {
                 parentArray.splice(fileIndex, 1);
                 this.persistFiles();
                 this.displayFiles();
                 if(this.editPage.classList.contains('active') && this.currentFileId === id) {
                    this.closeEditFileModal();
                 }
             }
        } else { alert('File not found for deletion.'); }
    }

    renameFile() {
        if (!this.newFileNameInput) return;
        const newName = this.newFileNameInput.value.trim();
        if (!newName) { alert('New file name cannot be empty.'); return; }
        if (!this.currentFileId) { alert('Error: No file selected.'); this.closeRenameFileModal(); return; }

        const file = this.findFileAnywhere(this.currentFileId);
        if (file) {
            const parentFolderFiles = this.getParentFolderFiles(this.currentFileId);
            if (parentFolderFiles && parentFolderFiles.some(f => f.name === newName && f.id !== this.currentFileId)) {
                alert(`"${newName}" already exists here.`); return;
            }
            file.name = newName;
            this.persistFiles();
            this.displayFiles();
            if(this.editPage.classList.contains('active') && this.currentFileId === file.id && this.currentEditFileName) {
                 this.currentEditFileName.textContent = newName;
            }
             if (file.type === 'Folder' && this.currentFolderPath.includes(file.id)) {
                  this.updatePageTitle();
             }

            this.closeRenameFileModal();
        } else { alert('Error: File not found.'); this.closeRenameFileModal(); }
    }

    // --- Navigation ---
    openFolder(id) {
        const file = this.findFileAnywhere(id);
        if (file && file.type === 'Folder') {
            const currentFolderFiles = this.getCurrentFolderFiles();
            if (currentFolderFiles.some(f => f.id === id)) {
                 if (!Array.isArray(file.content)) {
                     console.warn(`Folder "${file.name}" content is not an array. Initializing.`);
                     file.content = [];
                     this.persistFiles();
                 }
                 this.currentFolderPath.push(id);
                 this.displayFiles();
            } else {
                 console.error("Attempted to open folder not in current view:", id);
                 alert("Navigation error: Folder not found in current directory.");
            }
        } else { alert("Item is not a folder or not found."); }
    }

    goBack() {
        if (this.editPage && this.editPage.classList.contains('active')) {
            this.closeEditFileModal();
        } else if (this.currentFolderPath.length > 0) {
            this.currentFolderPath.pop();
            this.displayFiles();
        } else {
             if (this.filesPage && this.filesPage.classList.contains('active')) {
                window.location.href = 'index.html';
             } else {
                 this.closeEditFileModal();
             }
        }
    }

    // --- Saving ---
    saveFile() {
        if (!this.currentFileId) { alert('Error: No file selected.'); return; }
        const file = this.findFileAnywhere(this.currentFileId);
        if (!file) { alert('Error: File not found for saving.'); return; }

        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) { return; }
        }

        file.content = this.fileContent.value;
        this.persistFiles();
        alert('File saved successfully!');
    }

    // --- Execution ---
    executeFile(id) {
        const file = this.findFileAnywhere(id);
        if (!file) { alert('File not found.'); return; }
        let quizDataArray = [];

        if (file.type === 'JSON') {
            try {
                const parsedData = JSON.parse(file.content || 'null');
                if (this.isValidQuizQuestionFormat(parsedData)) {
                    quizDataArray = [parsedData];
                } else if (Array.isArray(parsedData) && parsedData.every(this.isValidQuizQuestionFormat)) {
                    quizDataArray = parsedData;
                } else if (parsedData) {
                    alert(`File "${file.name || id}" contains valid JSON, but it doesn't match the required Quiz format.`); return;
                } else {
                     alert(`File "${file.name || id}" is empty or has invalid JSON.`); return;
                }
            } catch (e) { alert(`Error parsing JSON in file "${file.name || id}":\n${e}`); return; }
        } else if (file.type === 'Folder') {
            quizDataArray = this.getAllJsonQuizData(file);
            if (quizDataArray.length === 0) {
                alert(`No valid quiz JSON files found in folder "${file.name}".`); return;
            }
        } else { alert(`Cannot execute file type "${file.type}" as a quiz.`); return; }

        if (quizDataArray.length > 0) this.launchQuiz(quizDataArray);
    }

    executeFileContent() {
        if (!this.currentFileId) { alert('Error: No file selected.'); return; }
        const file = this.findFileAnywhere(this.currentFileId);
        if (!file || file.type !== 'JSON') { alert('Can only execute JSON content from editor.'); return; }

        let contentToExecute = this.fileContent.value;
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) return;
             contentToExecute = this.fileContent.value;
        }

        let quizDataArray = [];
         try {
            const parsedData = JSON.parse(contentToExecute || 'null');
            if (this.isValidQuizQuestionFormat(parsedData)) {
                quizDataArray = [parsedData];
            } else if (Array.isArray(parsedData) && parsedData.every(this.isValidQuizQuestionFormat)) {
                quizDataArray = parsedData;
            } else if (parsedData) {
                alert(`Current content is valid JSON, but doesn't match the Quiz format.`); return;
            } else {
                 alert(`Current content is empty or invalid JSON.`); return;
            }
         } catch (e) { alert(`Error parsing JSON content:\n${e}`); return; }

        if (quizDataArray.length > 0) this.launchQuiz(quizDataArray);
    }

    getAllJsonQuizData(folder) {
        let allQuestions = [];
        if (folder && folder.type === 'Folder' && Array.isArray(folder.content)) {
            folder.content.forEach(file => {
                if (file.type === 'JSON') {
                    try {
                        const parsedData = JSON.parse(file.content || 'null');
                        if (this.isValidQuizQuestionFormat(parsedData)) {
                           allQuestions.push(parsedData);
                        } else if (Array.isArray(parsedData)) {
                           allQuestions = allQuestions.concat(parsedData.filter(this.isValidQuizQuestionFormat));
                        }
                    } catch (e) { console.warn(`Skipping file "${file.name}" due to JSON parse error:`, e); }
                } else if (file.type === 'Folder') {
                    allQuestions = allQuestions.concat(this.getAllJsonQuizData(file));
                }
            });
        }
        return allQuestions;
    }

    launchQuiz(quizDataArray) {
        if (!Array.isArray(quizDataArray) || quizDataArray.length === 0) {
            alert("No valid questions to execute."); return;
        }
        try {
            localStorage.setItem('quizDataToExecute', JSON.stringify(quizDataArray));
            window.location.href = 'execute.html';
        } catch (e) { alert("Error storing quiz data for execution: " + e); }
    }

    // --- Visual Editor Logic ---
    toggleEditorView() {
        if (!this.visualEditorData) {
             alert("Cannot switch to visual view. No valid quiz data loaded or format incorrect.");
             this.switchToCodeView();
             return;
        }
        if (this.currentEditorView === 'code') this.switchToVisualView();
        else this.switchToCodeView();
    }

    switchToCodeView() {
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) return;
        }
        this.codeEditorView.classList.remove('hidden');
        this.visualEditorView.classList.add('hidden');
        if (this.viewToggleBtn && this.viewToggleBtn.style.display !== 'none') {
            this.viewToggleBtn.textContent = 'Switch to Visual View';
        }
        this.currentEditorView = 'code';
    }

    switchToVisualView() {
        try {
            const currentContent = this.fileContent.value || '[]';
            const jsonData = JSON.parse(currentContent);
            let dataForVisual = null;
            let isFormatValid = false;

            if (Array.isArray(jsonData)) {
                isFormatValid = jsonData.length === 0 || jsonData.every(this.isValidQuizQuestionFormat);
                if (isFormatValid) dataForVisual = jsonData;
            } else if (this.isValidQuizQuestionFormat(jsonData)) {
                isFormatValid = true;
                dataForVisual = [jsonData];
            }

            if (!isFormatValid) {
                 throw new Error("JSON in code view doesn't match the required quiz format.");
            }

            this.visualEditorData = dataForVisual;
            this.renderVisualEditor();
            this.codeEditorView.classList.add('hidden');
            this.visualEditorView.classList.remove('hidden');
            if (this.viewToggleBtn && this.viewToggleBtn.style.display !== 'none') {
                this.viewToggleBtn.textContent = 'Switch to Code View';
            }
            this.currentEditorView = 'visual';
        } catch (e) {
            alert(`Error switching to Visual View: ${e.message}\nPlease correct the JSON in Code View.`);
            this.switchToCodeView();
        }
    }

    renderVisualEditor() {
        if (!this.visualEditorContainer) return;
        this.visualEditorContainer.innerHTML = '';

        if (!this.visualEditorData || !Array.isArray(this.visualEditorData)) {
            this.visualEditorContainer.innerHTML = '<p>Error: Invalid or no quiz data for visual editor.</p>';
            return;
        }
        if (this.visualEditorData.length === 0) {
             this.visualEditorContainer.innerHTML = '<p>No questions yet. Click "+ Add Question" below.</p>';
        }

        this.visualEditorData.forEach((questionData, qIndex) => {
            if (!this.isValidQuizQuestionFormat(questionData)) {
                 const errorDiv = document.createElement('div');
                 errorDiv.textContent = `Error: Invalid question format at index ${qIndex}. Please fix in Code View.`;
                 errorDiv.style.cssText = 'color: red; border: 1px dashed red; padding: 10px; margin-bottom: 10px;';
                 this.visualEditorContainer.appendChild(errorDiv);
                 return;
            }

            const questionDiv = document.createElement('div');
            questionDiv.classList.add('visual-question');
            questionDiv.dataset.qIndex = qIndex;

            const qLabel = document.createElement('label');
            qLabel.textContent = `Question ${qIndex + 1}:`;
            questionDiv.appendChild(qLabel);

            const questionTextarea = document.createElement('textarea');
            questionTextarea.rows = 2;
            questionTextarea.value = questionData.question || '';
            questionTextarea.oninput = (e) => { this.visualEditorData[qIndex].question = e.target.value; };
            questionDiv.appendChild(questionTextarea);

            const answersDiv = document.createElement('div');
            answersDiv.style.marginTop = '10px';
            const answers = questionData.answers || {};
            const correctAnswerKey = questionData.correctAnswer || '';

            const sortedKeys = Object.keys(answers).sort();
            if (sortedKeys.length === 0) {
                answersDiv.innerHTML = '<p style="color: orange; font-style: italic;">No answers defined for this question.</p>';
            } else {
                sortedKeys.forEach(key => {
                    answersDiv.appendChild(
                        this.createVisualAnswerElement_NewFormat(qIndex, key, answers[key], correctAnswerKey)
                    );
                });
            }
            questionDiv.appendChild(answersDiv);

             const controlsDiv = document.createElement('div');
             controlsDiv.classList.add('visual-controls');
             controlsDiv.innerHTML = `<button class="button small" onclick="fileManager.deleteVisualQuestion(${qIndex})">Delete Q</button>`;
             questionDiv.appendChild(controlsDiv);

            this.visualEditorContainer.appendChild(questionDiv);
        });
    }

    createVisualAnswerElement_NewFormat(qIndex, key, answerText, correctAnswerKey) {
         const answerDiv = document.createElement('div');
         answerDiv.classList.add('visual-answer');
         const radioLabel = document.createElement('label');
         const radioButton = document.createElement('input');
         radioButton.type = 'radio';
         radioButton.name = `correctAnswer_${qIndex}`;
         radioButton.value = key;
         radioButton.checked = (key === correctAnswerKey);
         radioButton.onchange = (e) => { if (e.target.checked) this.visualEditorData[qIndex].correctAnswer = key;};
         radioLabel.appendChild(radioButton);
         radioLabel.appendChild(document.createTextNode(`${key}) `));
         const textInput = document.createElement('input');
         textInput.type = 'text';
         textInput.value = answerText || '';
         textInput.placeholder = `Text for answer ${key}`;
         textInput.oninput = (e) => { if (!this.visualEditorData[qIndex].answers) this.visualEditorData[qIndex].answers = {}; this.visualEditorData[qIndex].answers[key] = e.target.value;};
         answerDiv.appendChild(radioLabel);
         answerDiv.appendChild(textInput);
         return answerDiv;
     }

    addVisualQuestion() {
        if (!this.visualEditorData) this.visualEditorData = [];
        this.visualEditorData.push({
            question: "New Question Title",
            answers: { A: "Option A", B: "Option B", C: "Option C" },
            correctAnswer: "A"
        });
        this.renderVisualEditor();
    }

    deleteVisualQuestion(qIndex) {
        if (!this.visualEditorData || qIndex < 0 || qIndex >= this.visualEditorData.length) {
            console.error("Invalid index for deleting question:", qIndex); return;
        }
        if (confirm(`Delete Question ${qIndex + 1}?`)) {
            this.visualEditorData.splice(qIndex, 1);
            this.renderVisualEditor();
        }
    }

    serializeVisualEditor() {
        try {
            if (!Array.isArray(this.visualEditorData)) { throw new Error("Internal Error: Visual data is not an array."); }
            if (this.visualEditorData.some(q => !this.isValidQuizQuestionFormat(q))) { throw new Error("One or more questions have an invalid format."); }
            if (this.visualEditorData.some(q => !q.answers[q.correctAnswer])) { throw new Error("One or more questions have a 'correctAnswer' key pointing to a non-existent answer."); }
            const jsonString = JSON.stringify(this.visualEditorData, null, 2);
            this.fileContent.value = jsonString;
            return true;
        } catch (e) {
            console.error("Error serializing visual editor data:", e);
            alert(`Error saving visual data: ${e.message}`);
            return false;
        }
    }

    // --- List Toggle & Night Mode ---
    toggleFileList() {
        this.ascending = !this.ascending;
        const listButton = document.querySelector('.list-button');
        if (listButton) { listButton.innerText = `List ${this.ascending ? '↑' : '↓'}`; }
        this.displayFiles();
    }

    initNightMode() {
        const nightModeSaved = localStorage.getItem('nightMode') === 'true';
        this.applyNightMode(nightModeSaved);
        if (this.nightModeToggleFiles) this.nightModeToggleFiles.checked = nightModeSaved;
        if (this.nightModeToggleEdit) this.nightModeToggleEdit.checked = nightModeSaved;
        if (this.nightModeToggleFiles) {
             this.nightModeToggleFiles.addEventListener('change', (e) => this.toggleNightMode(e.target.checked));
        }
    }

    toggleNightMode(enabled) {
        this.applyNightMode(enabled);
        localStorage.setItem('nightMode', String(enabled));
        this.syncNightModeToggles();
    }

    applyNightMode(enabled) {
         document.body.classList.toggle('night-mode', enabled);
    }

    syncNightModeToggles() {
        const isEnabled = document.body.classList.contains('night-mode');
         if (this.nightModeToggleFiles) this.nightModeToggleFiles.checked = isEnabled;
         if (this.nightModeToggleEdit) this.nightModeToggleEdit.checked = isEnabled;
    }
}
