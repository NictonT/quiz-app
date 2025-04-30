class FileManager {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('files')) || [];
        this.currentFolderPath = []; // Array of folder names representing the path
        this.ascending = true;

        // Cache DOM elements
        this.filesContainer = document.getElementById('filesContainer');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileType = document.getElementById('fileType');
        this.newFileNameInput = document.getElementById('newFileNameInput');
        this.addFileModal = document.getElementById('addFileModal');
        this.renameFileModal = document.getElementById('renameFileModal');
        this.executionModal = document.getElementById('executionModal');
        this.executionFrame = document.getElementById('executionFrame');
        this.filesPage = document.getElementById('filesPage');
        this.editPage = document.getElementById('editPage');
        this.currentEditFileName = document.getElementById('currentEditFileName');
        this.fileContent = document.getElementById('fileContent');
        this.nightModeToggleFiles = document.getElementById('nightModeToggleFiles');
        this.nightModeToggleEdit = document.getElementById('nightModeToggleEdit');

        // Visual Editor Elements
        this.viewToggleBtn = document.getElementById('viewToggleBtn');
        this.codeEditorView = document.getElementById('codeEditorView');
        this.visualEditorView = document.getElementById('visualEditorView');
        this.visualEditorContainer = document.getElementById('visualEditorContainer');

        this.currentFileId = null; // Store ID of the file being edited/renamed
        this.currentEditorView = 'code'; // 'code' or 'visual'
        this.visualEditorData = null; // Holds the parsed JSON data for the visual editor

        // Initialize Night Mode
        this.initNightMode();

        // Initial display
        this.displayFiles();
    }

    // --- Core File System Logic ---

    generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    findFileById(files, id) {
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

     // Finds a file by ID within the *entire* file structure
     findFileAnywhere(id) {
         return this.findFileById(this.files, id);
     }

    getCurrentFolderFiles() {
        let folderContent = this.files;
        let currentLevel = this.files;
        for (const folderId of this.currentFolderPath) {
            const nextFolder = currentLevel.find(file => file.id === folderId && file.type === 'Folder');
            if (nextFolder) {
                folderContent = nextFolder.content;
                currentLevel = nextFolder.content; // Update level for next iteration
            } else {
                console.error("Could not find folder in path:", folderId);
                return []; // Path is broken
            }
        }
        return folderContent;
    }

     // Gets the actual folder object (or the root array) based on the current path
     getCurrentFolderObject() {
         if (this.currentFolderPath.length === 0) {
             return this.files; // Root
         }
         let currentLevel = this.files;
         let folder = null;
         for (const folderId of this.currentFolderPath) {
             folder = currentLevel.find(file => file.id === folderId && file.type === 'Folder');
             if (folder) {
                 currentLevel = folder.content;
             } else {
                 return null; // Path invalid
             }
         }
         return folder; // Return the last folder object found
     }


    updatePageTitle() {
        const titleElement = document.querySelector('#pageTitle');
        if (titleElement) {
            let pathString = 'Files';
            if (this.currentFolderPath.length > 0) {
                 let currentLevel = this.files;
                 let pathNames = [];
                 for (const folderId of this.currentFolderPath) {
                     const folder = currentLevel.find(f => f.id === folderId);
                     if (folder) {
                         pathNames.push(folder.name);
                         currentLevel = folder.content;
                     } else {
                         pathNames.push('Unknown Folder'); // Should not happen ideally
                         break;
                     }
                 }
                 pathString = `Files - ${pathNames.join(' / ')}`;
            }
            titleElement.textContent = pathString;
        }
    }

    persistFiles() {
        localStorage.setItem('files', JSON.stringify(this.files));
    }

    // --- UI Display Logic ---

    displayFiles() {
        this.filesContainer.innerHTML = '';
        const currentFolderFiles = this.getCurrentFolderFiles();

        if (!Array.isArray(currentFolderFiles)) {
            console.error("Error: currentFolderFiles is not an array.", currentFolderFiles);
            this.filesContainer.innerHTML = '<p>Error loading folder contents.</p>';
            return; // Prevent further execution if data is corrupt
        }


        const sortedFiles = currentFolderFiles.slice().sort((a, b) => {
            // Ensure names exist before comparing
            const nameA = a.name || '';
            const nameB = b.name || '';
            return this.ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        sortedFiles.forEach((file) => {
            if (!file.id) {
                file.id = this.generateUniqueId(); // Assign ID if missing (data correction)
            }
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item');

            let fileTypeEmoji = '❓'; // Default emoji
            if (file.type === 'JSON') fileTypeEmoji = '📄';
            else if (file.type === 'Folder') fileTypeEmoji = '📁';
            else if (file.type === 'HTML') fileTypeEmoji = '🌐';

            // Buttons vary based on type
            let actionButtons = '';
            if (file.type === 'Folder') {
                actionButtons = `
                    <button class="button primary" onclick="fileManager.openFolder('${file.id}')">Open</button>
                    <button class="button secondary" onclick="fileManager.executeFile('${file.id}')">Execute All JSON</button>
                 `;
            } else if (file.type === 'JSON' || file.type === 'HTML') {
                 actionButtons = `
                     <button class="button primary" onclick="fileManager.openEditFileModal('${file.id}')">Edit</button>
                     <button class="button secondary" onclick="fileManager.executeFile('${file.id}')">Execute</button>
                 `;
            }

            fileElement.innerHTML = `
                <div>
                    <span>${fileTypeEmoji} ${file.name || 'Unnamed File'}</span>
                    <button class="icon-button" onclick="fileManager.showRenameFileModal('${file.id}')">✏️</button>
                </div>
                <div>
                    ${actionButtons}
                    <button class="button" onclick="fileManager.deleteFile('${file.id}')">Delete</button>
                </div>
            `;
            this.filesContainer.appendChild(fileElement);
        });
        this.updatePageTitle();
    }

    // --- Modal Handling ---

    showAddFileModal() {
        this.fileNameInput.value = ''; // Clear previous input
        this.fileType.value = 'JSON'; // Reset to default
        if (this.addFileModal) this.addFileModal.style.display = 'flex';
    }

    closeAddFileModal() {
        if (this.addFileModal) this.addFileModal.style.display = 'none';
    }

    showRenameFileModal(id) {
        const file = this.findFileAnywhere(id); // Find file anywhere
        if (file) {
            this.currentFileId = id; // Store the ID of the file being renamed
            this.newFileNameInput.value = file.name;
            if (this.renameFileModal) this.renameFileModal.style.display = 'flex';
        } else {
            alert('Error: File not found for renaming.');
        }
    }

    closeRenameFileModal() {
        this.currentFileId = null; // Clear stored ID
        if (this.renameFileModal) this.renameFileModal.style.display = 'none';
    }

     openEditFileModal(id) {
        const file = this.findFileAnywhere(id); // Find file anywhere

        if (!file || file.type === 'Folder') {
            alert('Cannot edit this file type or file not found.');
            return;
        }

        this.currentFileId = id;
        this.currentEditFileName.textContent = file.name;
        this.fileContent.value = file.content || '';

        // Reset editor view
        this.switchToCodeView(); // Default to code view
        this.visualEditorData = null; // Clear previous visual data
        this.viewToggleBtn.style.display = 'none'; // Hide toggle initially

        // Check if it's JSON and potentially enable visual editor
        if (file.type === 'JSON') {
            try {
                const jsonData = JSON.parse(file.content || '[]');
                if (Array.isArray(jsonData)) { // Basic check if it looks like our quiz format
                    this.visualEditorData = jsonData;
                    this.viewToggleBtn.style.display = 'inline-block'; // Show toggle button
                }
            } catch (e) {
                // JSON is invalid or not the expected format, keep visual editor disabled
                console.warn("File content is not valid JSON or not the expected format for visual editor.");
            }
        }

        this.filesPage.classList.remove('active');
        this.filesPage.classList.add('hidden');
        this.editPage.classList.remove('hidden');
        this.editPage.classList.add('active');

        // Sync night mode toggle
        if (this.nightModeToggleEdit && this.nightModeToggleFiles) {
             this.nightModeToggleEdit.checked = this.nightModeToggleFiles.checked;
        }
    }


    closeEditFileModal() {
        this.editPage.classList.remove('active');
        this.editPage.classList.add('hidden');
        this.filesPage.classList.remove('hidden');
        this.filesPage.classList.add('active');
        this.currentFileId = null; // Clear ID
        this.visualEditorData = null; // Clear visual data
    }

    closeExecutionModal() {
        if (this.executionModal) this.executionModal.style.display = 'none';
        if (this.executionFrame) this.executionFrame.srcdoc = ''; // Clear content
    }

    // --- File Operations ---

    addNewFile() {
        const fileName = this.fileNameInput.value.trim();
        const type = this.fileType.value;

        if (!fileName) {
            alert('File name cannot be empty.');
            return;
        }

        const currentFolderFiles = this.getCurrentFolderFiles();
        // Check for duplicate names in the current folder
        if (currentFolderFiles.some(file => file.name === fileName)) {
             alert(`A file or folder named "${fileName}" already exists in this location.`);
             return;
         }

        const newFile = {
            id: this.generateUniqueId(),
            name: fileName,
            type: type,
            content: type === 'Folder' ? [] : '' // Folders have array content, others start empty
        };

        currentFolderFiles.push(newFile);
        this.persistFiles();
        this.displayFiles();
        this.closeAddFileModal();
    }

    deleteFile(id) {
         const currentFolderFiles = this.getCurrentFolderFiles();
         const fileIndex = currentFolderFiles.findIndex(file => file.id === id);

         if (fileIndex !== -1) {
             const fileName = currentFolderFiles[fileIndex].name;
             if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
                 currentFolderFiles.splice(fileIndex, 1);
                 this.persistFiles();
                 this.displayFiles(); // Refresh the view of the current folder
             }
         } else {
             alert('File not found for deletion.'); // Should not happen if UI is correct
         }
    }


    renameFile() {
        const newName = this.newFileNameInput.value.trim();
        if (!newName) {
            alert('New file name cannot be empty.');
            return;
        }
        if (!this.currentFileId) {
            alert('Error: No file selected for renaming.');
            this.closeRenameFileModal();
            return;
        }

        const file = this.findFileAnywhere(this.currentFileId); // Find the file globally

        if (file) {
            // Find the folder containing this file to check for duplicates
            const parentFolderFiles = this.getParentFolderFiles(this.currentFileId);
            if (parentFolderFiles && parentFolderFiles.some(f => f.name === newName && f.id !== this.currentFileId)) {
                alert(`A file or folder named "${newName}" already exists in this location.`);
                return;
            }

            const oldName = file.name;
            file.name = newName;

            // If the renamed item is a folder that is part of the current path, update the path name cache (if using names)
            // Note: Since we use IDs in currentFolderPath, this isn't strictly necessary, but good for consistency if path names are displayed
            // this.updatePathCacheIfNeeded(this.currentFileId, newName); // Optional

            this.persistFiles();
            this.displayFiles(); // Refresh view
            this.closeRenameFileModal(); // Also clears currentFileId
        } else {
            alert('Error: File could not be found for renaming.');
            this.closeRenameFileModal();
        }
    }

    // Helper to find the parent folder's content array
    getParentFolderFiles(fileId) {
        const findParent = (currentFiles, targetId) => {
            for (const file of currentFiles) {
                if (file.id === targetId) {
                    return currentFiles; // Found in this array, return the array itself
                }
                if (file.type === 'Folder' && Array.isArray(file.content)) {
                    const parent = findParent(file.content, targetId);
                    if (parent) return parent; // Found in subfolder, return parent array
                }
            }
            return null; // Not found in this branch
        };
        return findParent(this.files, fileId);
    }


    openFolder(id) {
        const file = this.findFileAnywhere(id); // Find folder anywhere
        if (file && file.type === 'Folder') {
            // Check if folder actually exists in the *current* view before navigating
            const currentFolderFiles = this.getCurrentFolderFiles();
            if (currentFolderFiles.some(f => f.id === id)) {
                 this.currentFolderPath.push(id); // Add folder ID to path
                 this.displayFiles();
            } else {
                 console.error("Attempted to open folder not in current view:", id);
                 alert("Error navigating to folder.");
            }
        } else {
             alert("Item is not a folder or not found.");
        }
    }

    goBack() {
        // If in edit mode, 'Back' should close the editor first
        if (this.editPage.classList.contains('active')) {
            this.closeEditFileModal();
        }
        // If in file view and not at root, go up one level
        else if (this.currentFolderPath.length > 0) {
            this.currentFolderPath.pop(); // Remove last folder ID from path
            this.displayFiles();
        } else {
            // At root, maybe navigate to a higher level app screen if applicable
            console.log("Already at root folder.");
            // Or optionally: alert("You are at the root folder.");
        }
    }

    saveFile() {
        if (!this.currentFileId) {
            alert('Error: No file is currently being edited.');
            return;
        }

        const file = this.findFileAnywhere(this.currentFileId); // Find file anywhere

        if (file) {
            // If visual editor is active, serialize its data back to the textarea first
            if (this.currentEditorView === 'visual') {
                if (!this.serializeVisualEditor()) {
                    // Serialization failed (e.g., data became invalid)
                    alert("Error serializing visual data. Please check the data or switch to Code View to fix.");
                    return;
                }
            }

            // Save the content from the textarea
            file.content = this.fileContent.value;
            this.persistFiles();
            alert('File saved successfully!');
            // Optional: Keep the editor open after saving
            // this.closeEditFileModal(); // Uncomment to close after save
        } else {
            alert('Error: File could not be found for saving.');
        }
    }

    // --- Execution Logic ---

    executeFile(id) {
        // This is called from the main file list view
        const file = this.findFileAnywhere(id);
        if (!file) {
            alert('File not found.');
            return;
        }

        if (file.type === 'HTML') {
            this.showExecutionModal(file.content);
        } else if (file.type === 'JSON') {
            // Usually you don't "execute" JSON, but maybe display it prettily?
            // For now, just alert its content as before, or show in modal?
             try {
                 const prettyJSON = JSON.stringify(JSON.parse(file.content || '{}'), null, 2);
                 this.showExecutionModal(`<pre>${prettyJSON}</pre>`); // Display formatted JSON
             } catch (e) {
                 this.showExecutionModal(`<pre>Error parsing JSON:\n${e}\n\nContent:\n${file.content || ''}</pre>`);
             }

        } else if (file.type === 'Folder') {
             // Execute all JSON *content* within the folder (recursive) - keep original behavior
             const contentToExecute = this.executeAllJsonInFolder(file);
             if (contentToExecute.length > 0) {
                 alert(`Executing the following JSON content from folder "${file.name}":\n${contentToExecute.join('\n\n---\n\n')}`);
             } else {
                 alert(`No JSON files with content found in folder "${file.name}".`);
             }
         } else {
            alert(`Cannot execute file type: ${file.type}`);
        }
    }

    executeFileContent() {
        // This is called from the editor view's "Execute" button
        if (!this.currentFileId) {
            alert('Error: No file is currently being edited.');
            return;
        }
        const file = this.findFileAnywhere(this.currentFileId);
        if (!file) {
            alert('Error: Could not find the file being edited.');
            return;
        }

        let contentToExecute = this.fileContent.value; // Get current content from textarea

        // If visual view is active, serialize it first to ensure latest changes are used
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) {
                 alert("Could not serialize visual data for execution. Please fix errors or switch to Code View.");
                 return;
            }
             contentToExecute = this.fileContent.value; // Get the newly serialized content
        }


        if (file.type === 'HTML') {
            this.showExecutionModal(contentToExecute);
        } else if (file.type === 'JSON') {
             try {
                 const prettyJSON = JSON.stringify(JSON.parse(contentToExecute || '{}'), null, 2);
                 this.showExecutionModal(`<pre>${prettyJSON}</pre>`);
             } catch (e) {
                  this.showExecutionModal(`<pre>Error parsing JSON:\n${e}\n\nContent:\n${contentToExecute || ''}</pre>`);
             }
        } else {
            alert(`Cannot execute file type "${file.type}" from the editor.`);
        }
    }

     // Recursive helper for folder execution (original functionality)
     executeAllJsonInFolder(folder) {
         let jsonContents = [];
         if (folder && folder.type === 'Folder' && Array.isArray(folder.content)) {
             folder.content.forEach(file => {
                 if (file.type === 'JSON' && file.content) {
                     jsonContents.push(file.content);
                 } else if (file.type === 'Folder') {
                     jsonContents = jsonContents.concat(this.executeAllJsonInFolder(file));
                 }
             });
         }
         return jsonContents;
     }


    showExecutionModal(htmlContent) {
        if (this.executionModal && this.executionFrame) {
            this.executionFrame.srcdoc = htmlContent; // Set content for the iframe
            this.executionModal.style.display = 'flex';
        }
    }

    // --- Editor View Toggling & Visual Editor ---

    toggleEditorView() {
        if (this.currentEditorView === 'code') {
            this.switchToVisualView();
        } else {
            this.switchToCodeView();
        }
    }

    switchToCodeView() {
        // If switching *from* visual, serialize data back to textarea first
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) {
                alert("Could not serialize visual data. Please fix errors before switching view.");
                return; // Prevent switching if serialization fails
            }
        }
        this.codeEditorView.classList.remove('hidden');
        this.visualEditorView.classList.add('hidden');
        this.viewToggleBtn.textContent = 'Switch to Visual View';
        this.currentEditorView = 'code';
    }

    switchToVisualView() {
        // Try parsing the current text area content
        try {
            // Use the content currently in the text area, as it might have been edited
            const currentContent = this.fileContent.value || '[]';
            this.visualEditorData = JSON.parse(currentContent);

            if (!Array.isArray(this.visualEditorData)) {
                 throw new Error("JSON is not an array, expected array of questions for visual editor.");
            }

            this.renderVisualEditor(); // Render based on parsed data
            this.codeEditorView.classList.add('hidden');
            this.visualEditorView.classList.remove('hidden');
            this.viewToggleBtn.textContent = 'Switch to Code View';
            this.currentEditorView = 'visual';
        } catch (e) {
            alert(`Error parsing JSON for Visual Editor: ${e.message}\nPlease correct the JSON in the Code View.`);
            this.visualEditorData = null; // Ensure data is cleared on error
        }
    }

    renderVisualEditor() {
        this.visualEditorContainer.innerHTML = ''; // Clear previous content
        if (!this.visualEditorData || !Array.isArray(this.visualEditorData)) {
            this.visualEditorContainer.innerHTML = '<p>No valid question data to display.</p>';
            return;
        }

        this.visualEditorData.forEach((question, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('visual-question');
            questionDiv.dataset.qIndex = qIndex; // Store index

            // Question Text (using textarea for multiline)
            questionDiv.innerHTML += `<label>Question ${qIndex + 1}:</label>`;
            const questionTextarea = document.createElement('textarea');
            questionTextarea.rows = 2;
            questionTextarea.value = question.question || '';
            questionTextarea.oninput = (e) => { this.visualEditorData[qIndex].question = e.target.value; };
            questionDiv.appendChild(questionTextarea);


            // Answers section
            const answersDiv = document.createElement('div');
            answersDiv.style.marginTop = '10px';
            if (Array.isArray(question.answers)) {
                question.answers.forEach((answer, aIndex) => {
                    answersDiv.appendChild(this.createVisualAnswerElement(qIndex, aIndex, answer));
                });
            }
             questionDiv.appendChild(answersDiv);

             // Controls for adding answers and deleting questions
             const controlsDiv = document.createElement('div');
             controlsDiv.classList.add('visual-controls');
             controlsDiv.style.marginTop = '5px';
             controlsDiv.innerHTML = `
                 <button class="button secondary small" onclick="fileManager.addVisualAnswer(${qIndex})">Add Answer</button>
                 <button class="button small" onclick="fileManager.deleteVisualQuestion(${qIndex})">Delete Question</button>
             `;
             questionDiv.appendChild(controlsDiv);


            this.visualEditorContainer.appendChild(questionDiv);
        });
    }

    createVisualAnswerElement(qIndex, aIndex, answer) {
         const answerDiv = document.createElement('div');
         answerDiv.classList.add('visual-answer');
         answerDiv.dataset.aIndex = aIndex; // Store answer index relative to question

         const answerText = document.createElement('input');
         answerText.type = 'text';
         answerText.placeholder = `Answer ${aIndex + 1}`;
         answerText.value = answer.text || '';
         answerText.oninput = (e) => { this.visualEditorData[qIndex].answers[aIndex].text = e.target.value; };

         const isCorrectLabel = document.createElement('label');
         isCorrectLabel.style.display = 'inline-block';
         isCorrectLabel.style.marginLeft = '10px';

         const isCorrectCheckbox = document.createElement('input');
         isCorrectCheckbox.type = 'checkbox';
         isCorrectCheckbox.checked = !!answer.correct;
         isCorrectCheckbox.onchange = (e) => { this.visualEditorData[qIndex].answers[aIndex].correct = e.target.checked; };

         isCorrectLabel.appendChild(isCorrectCheckbox);
         isCorrectLabel.appendChild(document.createTextNode(' Correct'));

         const deleteButton = document.createElement('button');
         deleteButton.textContent = '✕';
         deleteButton.classList.add('button', 'small');
         deleteButton.style.marginLeft = '10px';
         deleteButton.onclick = () => { this.deleteVisualAnswer(qIndex, aIndex); };

         answerDiv.appendChild(answerText);
         answerDiv.appendChild(isCorrectLabel);
         answerDiv.appendChild(deleteButton);

         return answerDiv;
     }


    addVisualQuestion() {
        if (!this.visualEditorData) this.visualEditorData = [];
        this.visualEditorData.push({
            question: "New Question",
            answers: [{ text: "Answer 1", correct: false }]
        });
        this.renderVisualEditor(); // Re-render the entire visual editor
    }

    deleteVisualQuestion(qIndex) {
        if (confirm(`Delete Question ${qIndex + 1}?`)) {
            this.visualEditorData.splice(qIndex, 1);
            this.renderVisualEditor();
        }
    }

     addVisualAnswer(qIndex) {
         if (!this.visualEditorData[qIndex].answers) {
             this.visualEditorData[qIndex].answers = [];
         }
         this.visualEditorData[qIndex].answers.push({ text: "New Answer", correct: false });
         this.renderVisualEditor(); // Re-render is simplest way to update UI
     }

     deleteVisualAnswer(qIndex, aIndex) {
         if (this.visualEditorData[qIndex] && this.visualEditorData[qIndex].answers) {
             this.visualEditorData[qIndex].answers.splice(aIndex, 1);
             this.renderVisualEditor();
         }
     }


    serializeVisualEditor() {
        try {
            // Basic validation (e.g., ensure question text exists)
             if (this.visualEditorData.some(q => !q.question || q.question.trim() === '')) {
                  throw new Error("One or more questions have empty text.");
             }
             // Ensure answers exist and have text
             if (this.visualEditorData.some(q => !Array.isArray(q.answers) || q.answers.length === 0 || q.answers.some(a => !a.text || a.text.trim() === ''))) {
                  throw new Error("Each question must have at least one answer, and all answers must have text.");
             }
             // Ensure at least one answer is marked correct per question (optional, depending on quiz logic)
             // if (this.visualEditorData.some(q => !q.answers.some(a => a.correct))) {
             //     throw new Error("Each question must have at least one correct answer marked.");
             // }

            const jsonString = JSON.stringify(this.visualEditorData, null, 2); // Pretty print JSON
            this.fileContent.value = jsonString;
            return true; // Indicate success
        } catch (e) {
            console.error("Error serializing visual editor data:", e);
            alert(`Error saving visual data: ${e.message}`);
            return false; // Indicate failure
        }
    }

    // --- Other UI Helpers ---

    toggleFileList() {
        this.ascending = !this.ascending;
        const listButton = document.querySelector('.list-button');
        if (listButton) {
            listButton.innerText = `List ${this.ascending ? '↑' : '↓'}`;
        }
        this.displayFiles();
    }

    // --- Night Mode ---

    initNightMode() {
        const nightModeSaved = localStorage.getItem('nightMode') === 'true';
        this.applyNightMode(nightModeSaved);
        if (this.nightModeToggleFiles) this.nightModeToggleFiles.checked = nightModeSaved;
        if (this.nightModeToggleEdit) this.nightModeToggleEdit.checked = nightModeSaved; // Sync edit toggle

        // Add listeners
        if (this.nightModeToggleFiles) {
             this.nightModeToggleFiles.addEventListener('change', (e) => this.toggleNightMode(e.target.checked));
        }
         // Listener for edit toggle is added in DOMContentLoaded after FileManager instance exists
    }

    toggleNightMode(enabled) {
        this.applyNightMode(enabled);
        localStorage.setItem('nightMode', enabled);
        // Sync both toggles
        if (this.nightModeToggleFiles) this.nightModeToggleFiles.checked = enabled;
        if (this.nightModeToggleEdit) this.nightModeToggleEdit.checked = enabled;
    }

    applyNightMode(enabled) {
         if (enabled) {
             document.body.classList.add('night-mode');
         } else {
             document.body.classList.remove('night-mode');
         }
     }

}

// --- Global Helper Functions ---
// (Ensure clearLocalStorage is defined if called from HTML)
// const clearLocalStorage = () => { ... moved inside DOMContentLoaded check in HTML ... };

// --- Global Event Listeners or Initializers ---
// Moved instantiation to DOMContentLoaded in HTML file
// const fileManager = new FileManager();

// // Make methods globally accessible IF called directly from HTML onclick (alternative is adding listeners)
// // It's generally better to add listeners, but this matches the current pattern
// window.showAddFileModal = fileManager.showAddFileModal.bind(fileManager);
// window.closeAddFileModal = fileManager.closeAddFileModal.bind(fileManager);
// window.addNewFile = fileManager.addNewFile.bind(fileManager);
// // window.editFile = fileManager.editFile.bind(fileManager); // Replaced by openEditFileModal
// // window.saveFile = fileManager.saveFile.bind(fileManager); // Handled by instance call
// window.executeFile = fileManager.executeFile.bind(fileManager);
// window.openFolder = fileManager.openFolder.bind(fileManager);
// window.deleteFile = fileManager.deleteFile.bind(fileManager);
// window.showRenameFileModal = fileManager.showRenameFileModal.bind(fileManager);
// window.closeRenameFileModal = fileManager.closeRenameFileModal.bind(fileManager);
// window.renameFile = fileManager.renameFile.bind(fileManager);
// window.toggleFileList = fileManager.toggleFileList.bind(fileManager);
// window.goBack = fileManager.goBack.bind(fileManager);
// // Note: onclick handlers in HTML will now need to call fileManager.methodName() e.g., onclick="fileManager.saveFile()"
