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
        this.visualEditorData = null;

        this.initNightMode();
        this.displayFiles();
    }

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
                console.error("Could not find folder in path or folder content is not an array:", folderId);
                this.currentFolderPath = [];
                return this.files;
            }
        }
        return folderContent;
    }

     getCurrentFolderObject() {
         if (this.currentFolderPath.length === 0) {
             return this.files;
         }
         let currentLevel = this.files;
         let folder = null;
         for (const folderId of this.currentFolderPath) {
             folder = currentLevel.find(file => file.id === folderId && file.type === 'Folder');
             if (folder && Array.isArray(folder.content)) {
                 currentLevel = folder.content;
             } else {
                 return null;
             }
         }
         return folder;
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
                         if(Array.isArray(folder.content)){
                            currentLevel = folder.content;
                         } else {
                             pathNames.push('Invalid Folder');
                             break;
                         }
                     } else {
                         pathNames.push('Unknown Folder');
                         break;
                     }
                 }
                 pathString = `Files / ${pathNames.join(' / ')}`;
            }
            titleElement.textContent = pathString;
        }
    }

    persistFiles() {
        localStorage.setItem('files', JSON.stringify(this.files));
    }

    displayFiles() {
        this.filesContainer.innerHTML = '';
        const currentFolderFiles = this.getCurrentFolderFiles();

        if (!Array.isArray(currentFolderFiles)) {
            console.error("Error: currentFolderFiles is not an array.", currentFolderFiles);
            this.filesContainer.innerHTML = '<p>Error loading folder contents.</p>';
            this.updatePageTitle();
            return;
        }


        const sortedFiles = currentFolderFiles.slice().sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return this.ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        sortedFiles.forEach((file) => {
            if (!file.id) {
                file.id = this.generateUniqueId();
            }
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item');

            let fileTypeEmoji = '❓';
            if (file.type === 'JSON') fileTypeEmoji = '📄';
            else if (file.type === 'Folder') fileTypeEmoji = '📁';
            else if (file.type === 'HTML') fileTypeEmoji = '🌐';

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
            } else {
                 actionButtons = `
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

    showAddFileModal() {
        this.fileNameInput.value = '';
        this.fileType.value = 'JSON';
        if (this.addFileModal) this.addFileModal.style.display = 'flex';
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
        } else {
            alert('Error: File not found for renaming.');
        }
    }

    closeRenameFileModal() {
        this.currentFileId = null;
        if (this.renameFileModal) this.renameFileModal.style.display = 'none';
    }

     openEditFileModal(id) {
        const file = this.findFileAnywhere(id);

        if (!file || file.type === 'Folder') {
            alert('Cannot edit this file type or file not found.');
            return;
        }

        this.currentFileId = id;
        this.currentEditFileName.textContent = file.name;
        this.fileContent.value = file.content || '';

        this.switchToCodeView();
        this.visualEditorData = null;
        this.viewToggleBtn.style.display = 'none';

        if (file.type === 'JSON') {
            try {
                const jsonData = JSON.parse(file.content || '[]');
                if (Array.isArray(jsonData)) {
                    this.visualEditorData = jsonData;
                    this.viewToggleBtn.style.display = 'inline-block';
                }
            } catch (e) {
                console.warn("File content is not valid JSON or not the expected format for visual editor.");
            }
        }

        this.filesPage.classList.remove('active');
        this.filesPage.classList.add('hidden');
        this.editPage.classList.remove('hidden');
        this.editPage.classList.add('active');

        if (this.nightModeToggleEdit && this.nightModeToggleFiles) {
             this.nightModeToggleEdit.checked = this.nightModeToggleFiles.checked;
        }
    }


    closeEditFileModal() {
        this.editPage.classList.remove('active');
        this.editPage.classList.add('hidden');
        this.filesPage.classList.remove('hidden');
        this.filesPage.classList.add('active');
        this.currentFileId = null;
        this.visualEditorData = null;
    }

    closeExecutionModal() {
        if (this.executionModal) this.executionModal.style.display = 'none';
        if (this.executionFrame) this.executionFrame.srcdoc = '';
    }

    addNewFile() {
        const fileName = this.fileNameInput.value.trim();
        const type = this.fileType.value;

        if (!fileName) {
            alert('File name cannot be empty.');
            return;
        }

        const currentFolderFiles = this.getCurrentFolderFiles();
        if (currentFolderFiles.some(file => file.name === fileName)) {
             alert(`A file or folder named "${fileName}" already exists in this location.`);
             return;
         }

        const newFile = {
            id: this.generateUniqueId(),
            name: fileName,
            type: type,
            content: type === 'Folder' ? [] : ''
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
                 this.displayFiles();
             }
         } else {
             alert('File not found for deletion.');
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

        const file = this.findFileAnywhere(this.currentFileId);

        if (file) {
            const parentFolderFiles = this.getParentFolderFiles(this.currentFileId);
            if (parentFolderFiles && parentFolderFiles.some(f => f.name === newName && f.id !== this.currentFileId)) {
                alert(`A file or folder named "${newName}" already exists in this location.`);
                return;
            }

            const oldName = file.name;
            file.name = newName;

            this.persistFiles();
            this.displayFiles();
            if(this.editPage.classList.contains('active') && this.currentEditFileName) {
                 this.currentEditFileName.textContent = newName;
            }
            this.closeRenameFileModal();
        } else {
            alert('Error: File could not be found for renaming.');
            this.closeRenameFileModal();
        }
    }

    getParentFolderFiles(fileId) {
        const findParent = (currentFiles, targetId, parentArray = this.files) => {
            if (!Array.isArray(currentFiles)) return null;
            for (const file of currentFiles) {
                if (file.id === targetId) {
                    return parentArray;
                }
                if (file.type === 'Folder' && Array.isArray(file.content)) {
                    const found = findParent(file.content, targetId, currentFiles);
                    if (found) return found;
                }
            }
            return null;
        };
        // Special case: if the file is at the root, return the root array
        if (this.files.some(f => f.id === fileId)) {
            return this.files;
        }
        return findParent(this.files, fileId);
    }


    openFolder(id) {
        const file = this.findFileAnywhere(id);
        if (file && file.type === 'Folder') {
            const currentFolderFiles = this.getCurrentFolderFiles();
            if (currentFolderFiles.some(f => f.id === id)) {
                 this.currentFolderPath.push(id);
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
        if (this.editPage.classList.contains('active')) {
            this.closeEditFileModal();
        }
        else if (this.currentFolderPath.length > 0) {
            this.currentFolderPath.pop();
            this.displayFiles();
        } else {
            console.log("Already at root folder.");
        }
    }

    saveFile() {
        if (!this.currentFileId) {
            alert('Error: No file is currently being edited.');
            return;
        }

        const file = this.findFileAnywhere(this.currentFileId);

        if (file) {
            if (this.currentEditorView === 'visual') {
                if (!this.serializeVisualEditor()) {
                    alert("Error serializing visual data. Please check the data or switch to Code View to fix.");
                    return;
                }
            }

            file.content = this.fileContent.value;
            this.persistFiles();
            alert('File saved successfully!');
        } else {
            alert('Error: File could not be found for saving.');
        }
    }

    executeFile(id) {
        const file = this.findFileAnywhere(id);
        if (!file) {
            alert('File not found.');
            return;
        }

        if (file.type === 'HTML') {
            this.showExecutionModal(file.content || '');
        } else if (file.type === 'JSON') {
             try {
                 const prettyJSON = JSON.stringify(JSON.parse(file.content || '{}'), null, 2);
                 this.showExecutionModal(`<pre style="white-space: pre-wrap; word-wrap: break-word;">${prettyJSON}</pre>`);
             } catch (e) {
                 this.showExecutionModal(`<pre style="color: red; white-space: pre-wrap; word-wrap: break-word;">Error parsing JSON:\n${e}\n\nContent:\n${file.content || ''}</pre>`);
             }

        } else if (file.type === 'Folder') {
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
        if (!this.currentFileId) {
            alert('Error: No file is currently being edited.');
            return;
        }
        const file = this.findFileAnywhere(this.currentFileId);
        if (!file) {
            alert('Error: Could not find the file being edited.');
            return;
        }

        let contentToExecute = this.fileContent.value;

        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) {
                 alert("Could not serialize visual data for execution. Please fix errors or switch to Code View.");
                 return;
            }
             contentToExecute = this.fileContent.value;
        }


        if (file.type === 'HTML') {
            this.showExecutionModal(contentToExecute);
        } else if (file.type === 'JSON') {
             try {
                 const prettyJSON = JSON.stringify(JSON.parse(contentToExecute || '{}'), null, 2);
                 this.showExecutionModal(`<pre style="white-space: pre-wrap; word-wrap: break-word;">${prettyJSON}</pre>`);
             } catch (e) {
                  this.showExecutionModal(`<pre style="color: red; white-space: pre-wrap; word-wrap: break-word;">Error parsing JSON:\n${e}\n\nContent:\n${contentToExecute || ''}</pre>`);
             }
        } else {
            alert(`Cannot execute file type "${file.type}" from the editor.`);
        }
    }

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
            this.executionFrame.srcdoc = htmlContent;
            this.executionModal.style.display = 'flex';
        }
    }

    toggleEditorView() {
        if (this.currentEditorView === 'code') {
            this.switchToVisualView();
        } else {
            this.switchToCodeView();
        }
    }

    switchToCodeView() {
        if (this.currentEditorView === 'visual') {
            if (!this.serializeVisualEditor()) {
                alert("Could not serialize visual data. Please fix errors before switching view.");
                return;
            }
        }
        this.codeEditorView.classList.remove('hidden');
        this.visualEditorView.classList.add('hidden');
        this.viewToggleBtn.textContent = 'Switch to Visual View';
        this.currentEditorView = 'code';
    }

    switchToVisualView() {
        try {
            const currentContent = this.fileContent.value || '[]';
            this.visualEditorData = JSON.parse(currentContent);

            if (!Array.isArray(this.visualEditorData)) {
                 throw new Error("JSON is not an array, expected array of questions for visual editor.");
            }

            this.renderVisualEditor();
            this.codeEditorView.classList.add('hidden');
            this.visualEditorView.classList.remove('hidden');
            this.viewToggleBtn.textContent = 'Switch to Code View';
            this.currentEditorView = 'visual';
        } catch (e) {
            alert(`Error parsing JSON for Visual Editor: ${e.message}\nPlease correct the JSON in the Code View.`);
            this.visualEditorData = null;
        }
    }

    renderVisualEditor() {
        this.visualEditorContainer.innerHTML = '';
        if (!this.visualEditorData || !Array.isArray(this.visualEditorData)) {
            this.visualEditorContainer.innerHTML = '<p>No valid question data to display.</p>';
            return;
        }

        this.visualEditorData.forEach((question, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('visual-question');
            questionDiv.dataset.qIndex = qIndex;

            questionDiv.innerHTML += `<label>Question ${qIndex + 1}:</label>`;
            const questionTextarea = document.createElement('textarea');
            questionTextarea.rows = 2;
            questionTextarea.value = question.question || '';
            questionTextarea.oninput = (e) => { this.visualEditorData[qIndex].question = e.target.value; };
            questionDiv.appendChild(questionTextarea);

            const answersDiv = document.createElement('div');
            answersDiv.style.marginTop = '10px';
            if (Array.isArray(question.answers)) {
                question.answers.forEach((answer, aIndex) => {
                    answersDiv.appendChild(this.createVisualAnswerElement(qIndex, aIndex, answer));
                });
            }
             questionDiv.appendChild(answersDiv);

             const controlsDiv = document.createElement('div');
             controlsDiv.classList.add('visual-controls');
             controlsDiv.style.marginTop = '5px';
             controlsDiv.innerHTML = `
                 <button class="button secondary small" onclick="fileManager.addVisualAnswer(${qIndex})">+ Answer</button>
                 <button class="button small" onclick="fileManager.deleteVisualQuestion(${qIndex})">Delete Q</button>
             `;
             questionDiv.appendChild(controlsDiv);

            this.visualEditorContainer.appendChild(questionDiv);
        });
    }

    createVisualAnswerElement(qIndex, aIndex, answer) {
         const answerDiv = document.createElement('div');
         answerDiv.classList.add('visual-answer');
         answerDiv.dataset.aIndex = aIndex;

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
            answers: [{ text: "Answer 1", correct: true }]
        });
        this.renderVisualEditor();
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
         this.renderVisualEditor();
     }

     deleteVisualAnswer(qIndex, aIndex) {
         if (this.visualEditorData[qIndex] && this.visualEditorData[qIndex].answers) {
             this.visualEditorData[qIndex].answers.splice(aIndex, 1);
             this.renderVisualEditor();
         }
     }


    serializeVisualEditor() {
        try {
             if (this.visualEditorData.some(q => !q.question || q.question.trim() === '')) {
                  throw new Error("One or more questions have empty text.");
             }
             if (this.visualEditorData.some(q => !Array.isArray(q.answers) || q.answers.length === 0 || q.answers.some(a => !a.text || a.text.trim() === ''))) {
                  throw new Error("Each question must have at least one answer, and all answers must have text.");
             }

            const jsonString = JSON.stringify(this.visualEditorData, null, 2);
            this.fileContent.value = jsonString;
            return true;
        } catch (e) {
            console.error("Error serializing visual editor data:", e);
            alert(`Error saving visual data: ${e.message}`);
            return false;
        }
    }

    toggleFileList() {
        this.ascending = !this.ascending;
        const listButton = document.querySelector('.list-button');
        if (listButton) {
            listButton.innerText = `List ${this.ascending ? '↑' : '↓'}`;
        }
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
        localStorage.setItem('nightMode', enabled);
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
