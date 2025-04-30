class FileManager {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('files')) || [];
        this.currentFolderPath = [];
        this.ascending = true;

        this.filesContainer = document.getElementById('filesContainer');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileType = document.getElementById('fileType');
        this.newFileNameInput = document.getElementById('newFileNameInput');
        this.addFileModal = document.getElementById('addFileModal');
        this.renameFileModal = document.getElementById('renameFileModal');
        // Keep execution modal elements even if quiz logic changed
        this.executionModal = document.getElementById('executionModal');
        this.executionFrame = document.getElementById('executionFrame');
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

        this.currentFileId = null;
        this.currentEditorView = 'code';
        this.visualEditorData = null; // Will hold array: [ { question, answers: {A,B,..}, correctAnswer } ]

        this.initNightMode();
        this.displayFiles();
    }

    // --- Core File System Logic --- (Mostly unchanged) ---
    generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    findFileById(files, id) {
        if (!Array.isArray(files)) return null;
        for (const file of files) {
            if (file.id === id) {
                return file;
            } else if (file.type === 'Folder' && Array.isArray(file.content)) {
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
        for (const folderId of this.currentFolderPath) {
            const nextFolder = currentLevel.find(file => file.id === folderId && file.type === 'Folder');
            if (nextFolder && Array.isArray(nextFolder.content)) {
                folderContent = nextFolder.content;
                currentLevel = nextFolder.content;
            } else {
                console.error("getCurrentFolderFiles: Invalid path or folder structure.", this.currentFolderPath, folderId);
                this.currentFolderPath = [];
                return this.files;
            }
        }
        return folderContent;
    }

    getParentFolderFiles(fileId) {
       const findParent = (currentFiles, targetId, parentArray) => {
            if (!Array.isArray(currentFiles)) return null;
            for (let i = 0; i < currentFiles.length; i++) {
                const file = currentFiles[i];
                if (file.id === targetId) {
                    return parentArray;
                }
                if (file.type === 'Folder' && Array.isArray(file.content)) {
                    const found = findParent(file.content, targetId, file.content);
                    if (found) return found;
                }
            }
            return null;
        };
        return findParent(this.files, fileId, this.files);
    }

    updatePageTitle() {
        const titleElement = document.querySelector('#pageTitle');
        if (titleElement) {
            let pathString = 'Files';
            if (this.currentFolderPath.length > 0) {
                 let currentLevel = this.files;
                 let pathNames = [];
                 let pathValid = true;
                 for (const folderId of this.currentFolderPath) {
                     const folder = currentLevel.find(f => f.id === folderId);
                     if (folder && folder.type === 'Folder') {
                         pathNames.push(folder.name);
                         if(Array.isArray(folder.content)){
                            currentLevel = folder.content;
                         } else { pathNames.push('[Inv]'); pathValid = false; break; }
                     } else { pathNames.push('[Unk]'); pathValid = false; break; }
                 }
                 pathString = pathValid ? `Files / ${pathNames.join(' / ')}` : 'Files / [Error]';
            }
            titleElement.textContent = pathString;
        }
    }

    persistFiles() {
        localStorage.setItem('files', JSON.stringify(this.files));
    }

    // --- UI Display Logic --- (Update folder execute button text) ---
    displayFiles() {
        this.filesContainer.innerHTML = '';
        const currentFolderFiles = this.getCurrentFolderFiles();

        if (!Array.isArray(currentFolderFiles)) {
            this.filesContainer.innerHTML = '<p style="color: red;">Error loading folder contents.</p>';
            this.updatePageTitle(); return;
        }

        const sortedFiles = currentFolderFiles.slice().sort((a, b) => {
            const nameA = a.name || ''; const nameB = b.name || '';
            return this.ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        sortedFiles.forEach((file) => {
            if (!file.id) { file.id = this.generateUniqueId(); }
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item');

            let fileTypeEmoji = '❓';
            if (file.type === 'JSON') fileTypeEmoji = '📄';
            else if (file.type === 'Folder') fileTypeEmoji = '📁';

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
        this.updatePageTitle();
    }

    // --- Modal Handling --- (Unchanged) ---
    showAddFileModal() {
        this.fileNameInput.value = '';
        this.fileType.value = 'JSON';
        if (this.addFileModal) this.addFileModal.style.display = 'flex';
        console.log("Add file modal shown"); // Debugging
    }

    closeAddFileModal() {
        if (this.addFileModal) this.addFileModal.style.display = 'none';
    }

    showRenameFileModal(id) {
        const file = this.findFileAnywhere(id);
        if (file) {
            this.currentFileId = id;
            this.newFileNameInput.value = file.name;
            if (this.renameFileModal) this.renameFileModal.style.display = 'flex';
        } else { alert('Error: File not found for renaming.'); }
    }

    closeRenameFileModal() {
        this.currentFileId = null;
        if (this.renameFileModal) this.renameFileModal.style.display = 'none';
    }

    closeExecutionModal() {
        if (this.executionModal) this.executionModal.style.display = 'none';
        if (this.executionFrame) this.executionFrame.srcdoc = '';
    }

    // --- Edit Page Handling --- (Update check for visual editor) ---
     openEditFileModal(id) {
        const file = this.findFileAnywhere(id);
        console.log("Opening edit modal for file:", file); // Debug

        if (!file) { alert('File not found.'); return; }
        if (file.type === 'Folder') { alert('Cannot edit folders directly.'); return; }

        this.currentFileId = id;
        this.currentEditFileName.textContent = file.name;
        this.fileContent.value = file.content || '';

        this.switchToCodeView(); // Default view
        this.visualEditorData = null; // Reset data
        this.viewToggleBtn.style.display = 'none'; // Hide button initially

        if (file.type === 'JSON') {
            try {
                const currentContent = file.content || '[]'; // Assume array if empty
                const jsonData = JSON.parse(currentContent);
                console.log("Parsed JSON for visual check:", jsonData); // Debug

                // Check if it's an array OR a single object matching the structure
                 let isQuizFormat = false;
                 if (Array.isArray(jsonData) && jsonData.length > 0) {
                      // Check first element structure
                      isQuizFormat = jsonData.every(item => item && typeof item.question === 'string' && typeof item.answers === 'object' && item.answers !== null && typeof item.correctAnswer === 'string');
                 } else if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
                      // Check if single object matches structure
                       isQuizFormat = typeof jsonData.question === 'string' && typeof jsonData.answers === 'object' && jsonData.answers !== null && typeof jsonData.correctAnswer === 'string';
                       // If single object, wrap in array for consistent handling
                       if(isQuizFormat) {
                            this.visualEditorData = [jsonData]; // Store as array
                       }
                 } else if (Array.isArray(jsonData) && jsonData.length === 0) {
                    isQuizFormat = true; // Allow visual editor for empty array
                 }


                if (isQuizFormat) {
                    // If visualEditorData wasn't set above (because it was already an array), set it now.
                    if (!this.visualEditorData) {
                        this.visualEditorData = jsonData;
                    }
                    console.log("Format matches, enabling visual view button."); // Debug
                    this.viewToggleBtn.style.display = 'inline-block';
                } else {
                    console.warn("JSON structure doesn't match expected quiz format for visual editor.");
                }
            } catch (e) {
                console.warn("File content is not valid JSON or error during check.", e);
            }
        }

        this.filesPage.classList.add('hidden');
        this.filesPage.classList.remove('active');
        this.editPage.classList.remove('hidden');
        this.editPage.classList.add('active');

        if (this.nightModeToggleEdit && this.nightModeToggleFiles) {
             this.nightModeToggleEdit.checked = this.nightModeToggleFiles.checked;
        }
    }

    closeEditFileModal() {
        this.editPage.classList.add('hidden');
        this.editPage.classList.remove('active');
        this.filesPage.classList.remove('hidden');
        this.filesPage.classList.add('active');
        this.currentFileId = null;
        this.visualEditorData = null;
    }

    // --- File Operations (Add, Delete, Rename) --- (Unchanged) ---
    addNewFile() {
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
             let confirmMsg = `Delete ${file.type} "${file.name}"?`;
             if (file.type === 'Folder') confirmMsg += '\nThis deletes all content inside!';
             if (confirm(confirmMsg)) {
                 parentArray.splice(fileIndex, 1);
                 this.persistFiles();
                 this.displayFiles(); // Refresh current view
             }
         } else { alert('File not found for deletion.'); }
    }
    renameFile() {
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
            if(this.editPage.classList.contains('active') && this.currentEditFileName && this.currentFileId === file.id) {
                 this.currentEditFileName.textContent = newName;
            }
            this.closeRenameFileModal();
        } else { alert('Error: File not found.'); this.closeRenameFileModal(); }
    }

    // --- Navigation --- (Unchanged) ---
    openFolder(id) {
        const file = this.findFileAnywhere(id);
        if (file && file.type === 'Folder') {
            const currentFolderFiles = this.getCurrentFolderFiles();
            if (currentFolderFiles.some(f => f.id === id)) {
                 this.currentFolderPath.push(id); this.displayFiles();
            } else { alert("Error navigating to folder."); }
        } else { alert("Item is not a folder or not found."); }
    }
    goBack() {
        if (this.editPage.classList.contains('active')) { this.closeEditFileModal(); }
        else if (this.currentFolderPath.length > 0) { this.currentFolderPath.pop(); this.displayFiles(); }
        else { window.location.href = 'index.html'; }
    }

    // --- Saving --- (Unchanged) ---
    saveFile() {
        if (!this.currentFileId) { alert('Error: No file selected.'); return; }
        const file = this.findFileAnywhere(this.currentFileId);
        if (file) {
            if (this.currentEditorView === 'visual') {
                if (!this.serializeVisualEditor()) { return; } // Error alert inside serialize
            }
            file.content = this.fileContent.value;
            this.persistFiles(); alert('File saved successfully!');
        } else { alert('Error: File not found for saving.'); }
    }

    // --- Execution Logic (MAJOR CHANGES) ---
    executeFile(id) {
        const file = this.findFileAnywhere(id);
        if (!file) { alert('File not found.'); return; }

        let quizDataArray = [];

        if (file.type === 'JSON') {
            try {
                const parsedData = JSON.parse(file.content || 'null');
                if (!parsedData) {
                    alert(`File "${file.name}" is empty or contains invalid JSON.`); return;
                }
                // Handle both single object and array of objects
                if (Array.isArray(parsedData)) {
                    quizDataArray = parsedData;
                } else if (typeof parsedData === 'object' && parsedData !== null) {
                    quizDataArray = [parsedData]; // Wrap single object in array
                } else {
                     alert(`File "${file.name}" does not contain a valid quiz JSON object or array.`); return;
                }
            } catch (e) {
                alert(`Error parsing JSON in file "${file.name}":\n${e}`); return;
            }
        } else if (file.type === 'Folder') {
            quizDataArray = this.getAllJsonQuizData(file);
            if (quizDataArray.length === 0) {
                alert(`No valid quiz JSON files found in folder "${file.name}".`); return;
            }
        } else {
            alert(`Cannot execute file type "${file.type}" as a quiz.`); return;
        }

        // Proceed to execute if data was found
        if (quizDataArray.length > 0) {
            this.launchQuiz(quizDataArray);
        } else {
            // This case should ideally be caught earlier
             alert("No valid quiz data found to execute.");
        }
    }

    executeFileContent() {
        if (!this.currentFileId) { alert('Error: No file selected.'); return; }
        const file = this.findFileAnywhere(this.currentFileId);
        if (!file || file.type !== 'JSON') { alert('Can only execute JSON content from editor.'); return; }

        let contentToExecute = this.fileContent.value;
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) { return; } // Error handled in serialize
             contentToExecute = this.fileContent.value; // Use serialized content
        }

        let quizDataArray = [];
         try {
            const parsedData = JSON.parse(contentToExecute || 'null');
             if (!parsedData) {
                 alert(`Current content is empty or invalid JSON.`); return;
             }
             if (Array.isArray(parsedData)) {
                 quizDataArray = parsedData;
             } else if (typeof parsedData === 'object' && parsedData !== null) {
                 quizDataArray = [parsedData];
             } else {
                  alert(`Current content is not a valid quiz JSON object or array.`); return;
             }
         } catch (e) {
             alert(`Error parsing JSON content:\n${e}`); return;
         }

        if (quizDataArray.length > 0) {
            this.launchQuiz(quizDataArray);
        }
    }

    // Helper to get all valid quiz data from a folder recursively
    getAllJsonQuizData(folder) {
        let allQuestions = [];
        if (folder && folder.type === 'Folder' && Array.isArray(folder.content)) {
            folder.content.forEach(file => {
                if (file.type === 'JSON') {
                    try {
                        const parsedData = JSON.parse(file.content || 'null');
                        if (Array.isArray(parsedData)) {
                           // Add questions if they match the format
                           allQuestions = allQuestions.concat(parsedData.filter(q => q && q.question && q.answers && q.correctAnswer));
                        } else if (typeof parsedData === 'object' && parsedData !== null && parsedData.question && parsedData.answers && parsedData.correctAnswer) {
                           allQuestions.push(parsedData); // Add single valid question object
                        }
                    } catch (e) {
                        console.warn(`Skipping file "${file.name}" due to JSON parse error:`, e);
                    }
                } else if (file.type === 'Folder') {
                    allQuestions = allQuestions.concat(this.getAllJsonQuizData(file));
                }
            });
        }
        return allQuestions;
    }

    // Helper to launch the quiz page
    launchQuiz(quizDataArray) {
        if (!Array.isArray(quizDataArray) || quizDataArray.length === 0) {
            alert("No valid questions to execute.");
            return;
        }
        try {
            // **IMPORTANT**: Store data under the key your execute.js expects!
            // Your execute.js uses 'quizData'. If you want to use 'quizDataToExecute',
            // change 'quizData' below to 'quizDataToExecute' AND update your execute.js.
            localStorage.setItem('quizDataToExecute', JSON.stringify(quizDataArray)); // Storing the data
            window.location.href = 'execute.html'; // Redirecting
        } catch (e) {
            alert("Error storing quiz data for execution: " + e);
        }
    }

    // --- Visual Editor Logic (ADAPTED for new format, editing limited) ---
    toggleEditorView() {
        if (this.currentEditorView === 'code') { this.switchToVisualView(); }
        else { this.switchToCodeView(); }
    }

    switchToCodeView() {
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) { return; } // Error handled inside
        }
        this.codeEditorView.classList.remove('hidden');
        this.visualEditorView.classList.add('hidden');
        if (this.viewToggleBtn.style.display !== 'none') {
            this.viewToggleBtn.textContent = 'Switch to Visual View';
        }
        this.currentEditorView = 'code';
    }

    switchToVisualView() {
        try {
            const currentContent = this.fileContent.value || '[]';
            let jsonData = JSON.parse(currentContent);

             // Ensure visualEditorData is always an array
            if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
                // If single object, wrap in array for consistent handling
                if (jsonData.question && jsonData.answers && jsonData.correctAnswer) {
                    this.visualEditorData = [jsonData];
                } else {
                    throw new Error("Single JSON object doesn't match quiz format.");
                }
            } else if (Array.isArray(jsonData)) {
                 // Basic validation on array elements
                 if (jsonData.length > 0 && !jsonData.every(item => item && item.question && item.answers && item.correctAnswer)) {
                      throw new Error("Some items in the JSON array do not match the quiz format.");
                 }
                this.visualEditorData = jsonData;
            } else {
                 throw new Error("JSON is not a valid object or array for the visual editor.");
            }

            this.renderVisualEditor(); // Render the new structure
            this.codeEditorView.classList.add('hidden');
            this.visualEditorView.classList.remove('hidden');
             if (this.viewToggleBtn.style.display !== 'none') {
                this.viewToggleBtn.textContent = 'Switch to Code View';
            }
            this.currentEditorView = 'visual';
        } catch (e) {
            alert(`Error switching to Visual View: ${e.message}\nPlease correct the JSON in the Code View.`);
            this.visualEditorData = null;
             this.codeEditorView.classList.remove('hidden'); // Ensure code view is visible on error
             this.visualEditorView.classList.add('hidden');
             this.currentEditorView = 'code';
             if (this.viewToggleBtn.style.display !== 'none') {
                this.viewToggleBtn.textContent = 'Switch to Visual View';
             }
        }
    }

    // Renders based on array: [ { question, answers: {A,B,..}, correctAnswer } ]
    renderVisualEditor() {
        this.visualEditorContainer.innerHTML = '';
        if (!this.visualEditorData || !Array.isArray(this.visualEditorData)) {
            this.visualEditorContainer.innerHTML = '<p>No valid quiz data loaded (must be an array of questions).</p>';
            return;
        }
        if (this.visualEditorData.length === 0) {
             this.visualEditorContainer.innerHTML = '<p>No questions yet. Click "+ Add Question" below.</p>';
        }

        this.visualEditorData.forEach((questionData, qIndex) => {
            // Ensure questionData is a valid object
            if (typeof questionData !== 'object' || questionData === null) {
                console.error(`Invalid data format at index ${qIndex}`, questionData);
                return; // Skip invalid entries
            }

            const questionDiv = document.createElement('div');
            questionDiv.classList.add('visual-question');
            questionDiv.dataset.qIndex = qIndex;

            // Question Text
            questionDiv.innerHTML += `<label>Question ${qIndex + 1}:</label>`;
            const questionTextarea = document.createElement('textarea');
            questionTextarea.rows = 2;
            questionTextarea.value = questionData.question || '';
            questionTextarea.oninput = (e) => {
                this.visualEditorData[qIndex].question = e.target.value;
            };
            questionDiv.appendChild(questionTextarea);

            // Answers (using radio buttons for the A/B/C format)
            const answersDiv = document.createElement('div');
            answersDiv.style.marginTop = '10px';
            const answers = questionData.answers || {}; // Default to empty object
            const correctAnswerKey = questionData.correctAnswer || '';

            // Ensure answers is an object
             if (typeof answers !== 'object' || answers === null) {
                 console.warn(`Answers for question ${qIndex + 1} is not an object.`, answers);
                 questionData.answers = {}; // Attempt to fix
             }


            // Sort keys A, B, C... for consistent order
            const sortedKeys = Object.keys(answers).sort();

            sortedKeys.forEach(key => {
                answersDiv.appendChild(
                    this.createVisualAnswerElement_NewFormat(qIndex, key, answers[key], correctAnswerKey)
                );
            });
            questionDiv.appendChild(answersDiv);

             // Controls
             const controlsDiv = document.createElement('div');
             controlsDiv.classList.add('visual-controls');
             // Adding/Deleting specific letter answers (A/B/C) is complex and omitted for now
             controlsDiv.innerHTML = `
                 <!-- <button class="button secondary small" onclick="fileManager.addVisualAnswer(${qIndex})">+ Answer</button> -->
                 <button class="button small" onclick="fileManager.deleteVisualQuestion(${qIndex})">Delete Q</button>
             `;
             questionDiv.appendChild(controlsDiv);

            this.visualEditorContainer.appendChild(questionDiv);
        });
    }

    // Creates answer element for the new format: { A: "text", B: "text" }
    createVisualAnswerElement_NewFormat(qIndex, key, answerText, correctAnswerKey) {
         const answerDiv = document.createElement('div');
         answerDiv.classList.add('visual-answer');

         const radioLabel = document.createElement('label');
         const radioButton = document.createElement('input');
         radioButton.type = 'radio';
         radioButton.name = `correctAnswer_${qIndex}`; // Group radios per question
         radioButton.value = key;
         radioButton.checked = (key === correctAnswerKey);
         radioButton.onchange = (e) => {
             if (e.target.checked) {
                 this.visualEditorData[qIndex].correctAnswer = key;
                 // Optionally re-render to ensure UI consistency if needed, but might be slow
                 // this.renderVisualEditor();
             }
         };

         radioLabel.appendChild(radioButton);
         radioLabel.appendChild(document.createTextNode(`${key}) `)); // Add "A) ", "B) "

         const textInput = document.createElement('input');
         textInput.type = 'text';
         textInput.value = answerText || '';
         textInput.placeholder = `Text for answer ${key}`;
         textInput.oninput = (e) => {
             // Ensure answers object exists
             if (!this.visualEditorData[qIndex].answers) {
                 this.visualEditorData[qIndex].answers = {};
             }
             this.visualEditorData[qIndex].answers[key] = e.target.value;
         };

         // Delete button for individual answers is complex for this format, omitted
         // const deleteButton = ...

         answerDiv.appendChild(radioLabel);
         answerDiv.appendChild(textInput);
         // answerDiv.appendChild(deleteButton);

         return answerDiv;
     }

    // Simplified Add Question for the new format
    addVisualQuestion() {
        if (!this.visualEditorData) this.visualEditorData = [];
        // Add a basic structure matching the user's format
        this.visualEditorData.push({
            question: "New Question Title",
            answers: {
                A: "Option A text",
                B: "Option B text",
                C: "Option C text"
             },
            correctAnswer: "A" // Default correct answer
        });
        this.renderVisualEditor();
    }

    // Delete Question remains the same (operates on the top-level array)
    deleteVisualQuestion(qIndex) {
        if (confirm(`Delete Question ${qIndex + 1}?`)) {
            if (this.visualEditorData && this.visualEditorData[qIndex] !== undefined) {
                this.visualEditorData.splice(qIndex, 1);
                this.renderVisualEditor();
            } else { console.error("Attempted to delete non-existent question:", qIndex); }
        }
    }

     // Add/Delete Answer functions are removed as they don't easily fit the {A,B,C} object structure

    // Serialize back to the user's expected format (array of objects)
    serializeVisualEditor() {
        try {
             if (!Array.isArray(this.visualEditorData)) {
                  throw new Error("Internal Error: Visual data is not an array.");
             }
             // Add more specific validation for the new format if needed
             if (this.visualEditorData.some(q => !q.question || !q.answers || !q.correctAnswer || typeof q.answers !== 'object')) {
                  throw new Error("One or more questions are missing required fields (question, answers object, correctAnswer).");
             }
              if (this.visualEditorData.some(q => !q.answers[q.correctAnswer])) {
                   throw new Error("One or more questions have a 'correctAnswer' key that doesn't exist in their 'answers' object.");
              }

            const jsonString = JSON.stringify(this.visualEditorData, null, 2); // Pretty print
            this.fileContent.value = jsonString;
            return true;
        } catch (e) {
            console.error("Error serializing visual editor data:", e);
            alert(`Error during serialization: ${e.message}`);
            return false;
        }
    }


    // --- List Toggle & Night Mode --- (Unchanged) ---
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
        if (this.nightModeToggleFiles) { this.nightModeToggleFiles.addEventListener('change', (e) => this.toggleNightMode(e.target.checked)); }
    }
    toggleNightMode(enabled) {
        this.applyNightMode(enabled);
        localStorage.setItem('nightMode', enabled);
        if (this.nightModeToggleFiles) this.nightModeToggleFiles.checked = enabled;
        if (this.nightModeToggleEdit) this.nightModeToggleEdit.checked = enabled;
    }
    applyNightMode(enabled) {
         document.body.classList.toggle('night-mode', enabled);
     }
}
