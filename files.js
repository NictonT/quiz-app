document.addEventListener('DOMContentLoaded', () => {
    const filesContainer = document.getElementById('filesContainer');
    const addFileModal = document.getElementById('addFileModal');
    const renameFileModal = document.getElementById('renameFileModal');
    const fileNameInput = document.getElementById('fileNameInput');
    const fileType = document.getElementById('fileType');
    const newFileNameInput = document.getElementById('newFileNameInput');

    let files = JSON.parse(localStorage.getItem('files')) || [];
    let currentFileIndex = -1;
    let ascending = true;
    let currentFolderPath = [];

    function displayFiles() {
        filesContainer.innerHTML = '';
        const currentFolder = getCurrentFolder();
        const sortedFiles = currentFolder.slice().sort((a, b) => {
            if (ascending) {
                return a.name.localeCompare(b.name);
            } else {
                return b.name.localeCompare(a.name);
            }
        });
        sortedFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item', 'answer');
            const fileTypeEmoji = file.type === 'JSON' ? '📄' : '📁';
            fileElement.innerHTML = `
                <div>
                    <span>${fileTypeEmoji} ${file.name}</span>
                    <button class="icon-button" onclick="showRenameFileModal(${index})">✏️</button>
                </div>
                <div>
                    ${file.type === 'JSON'
                        ? `<button class="button primary" onclick="editFile(${index})">Edit</button>`
                        : `<button class="button primary" onclick="openFolder(${index})">Open</button>`
                    }
                    <button class="button secondary" onclick="executeFile(${index})">Execute</button>
                    <button class="button" onclick="deleteFile(${index})">Delete</button>
                </div>
            `;
            filesContainer.appendChild(fileElement);
        });
        updatePageTitle();
    }

    function getCurrentFolder() {
        let folder = files;
        for (const folderName of currentFolderPath) {
            const nextFolder = folder.find(file => file.name === folderName && file.type === 'Folder');
            if (nextFolder) {
                folder = nextFolder.content;
            }
        }
        return folder;
    }

    function updatePageTitle() {
        const titleElement = document.querySelector('#pageTitle');
        if (currentFolderPath.length > 0) {
            titleElement.innerHTML = `Files - ${currentFolderPath.join(' / ')}`;
        } else {
            titleElement.innerHTML = 'Files';
        }
    }

    window.showAddFileModal = function () {
        addFileModal.style.display = 'flex';
    };

    window.closeAddFileModal = function () {
        addFileModal.style.display = 'none';
    };

    window.addNewFile = function () {
        const fileName = fileNameInput.value;
        if (fileName) {
            const currentFolder = getCurrentFolder();
            currentFolder.push({ name: fileName, type: fileType.value, content: fileType.value === 'JSON' ? '' : [] });
            localStorage.setItem('files', JSON.stringify(files));
            displayFiles();
            fileNameInput.value = '';
            closeAddFileModal();
        } else {
            alert('File name cannot be empty.');
        }
    };

    window.editFile = function (index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'JSON') {
            currentFileIndex = index;
            localStorage.setItem('currentFile', JSON.stringify([file.content]));
            localStorage.setItem('currentFilePath', JSON.stringify(currentFolderPath));
            window.location.href = 'folder.html';
        }
    };

    window.executeFile = function (index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'JSON') {
            localStorage.setItem('currentFile', JSON.stringify([file.content]));
            localStorage.setItem('currentFilePath', JSON.stringify(currentFolderPath));
            window.location.href = 'folder.html';
        } else {
            const contentToExecute = executeAllJsonInFolder(file);
            if (contentToExecute.length > 0) {
                localStorage.setItem('currentFile', JSON.stringify(contentToExecute));
                localStorage.setItem('currentFilePath', JSON.stringify(currentFolderPath));
                window.location.href = 'folder.html';
            } else {
                alert('No JSON content found to execute.');
            }
        }
    };

    function executeAllJsonInFolder(folder) {
        let jsonContents = [];
        folder.content.forEach(file => {
            if (file.type === 'JSON') {
                jsonContents.push(file.content);
            } else if (file.type === 'Folder') {
                jsonContents = jsonContents.concat(executeAllJsonInFolder(file));
            }
        });
        return jsonContents;
    }

    window.openFolder = function (index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'Folder') {
            currentFolderPath.push(file.name);
            displayFiles();
        }
    };

    window.deleteFile = function (index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
            currentFolder.splice(index, 1);
            localStorage.setItem('files', JSON.stringify(files));
            displayFiles();
        }
    };

    window.showRenameFileModal = function (index) {
        currentFileIndex = index;
        const currentFolder = getCurrentFolder();
        newFileNameInput.value = currentFolder[index].name;
        renameFileModal.style.display = 'flex';
    };

    window.closeRenameFileModal = function () {
        renameFileModal.style.display = 'none';
    };

    window.renameFile = function () {
        const newName = newFileNameInput.value.trim();
        if (newName) {
            const currentFolder = getCurrentFolder();
            currentFolder[currentFileIndex].name = newName;
            localStorage.setItem('files', JSON.stringify(files));
            displayFiles();
            newFileNameInput.value = '';
            closeRenameFileModal();
        } else {
            alert('File name cannot be empty.');
        }
    };

    window.toggleFileList = function () {
        ascending = !ascending;
        document.querySelector('.list-button').innerText = `List ${ascending ? '↑' : '↓'}`;
        displayFiles();
    };

    window.goBack = function () {
        if (currentFolderPath.length > 0) {
            currentFolderPath.pop();
            displayFiles();
        }
    };

    const nightModeToggle = document.getElementById('nightModeToggle');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    nightModeToggle.addEventListener('change', function() {
        document.body.classList.toggle('night-mode', this.checked);
        localStorage.setItem('nightMode', this.checked);
    });

    displayFiles();  // Call displayFiles immediately when page loads
});
