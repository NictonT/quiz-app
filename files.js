document.addEventListener('DOMContentLoaded', () => {
    const filesContainer = document.getElementById('filesContainer');
    const addFileModal = document.getElementById('addFileModal');
    const renameFileModal = document.getElementById('renameFileModal');
    const fileNameInput = document.getElementById('fileNameInput');
    const fileType = document.getElementById('fileType');
    const newFileNameInput = document.getElementById('newFileNameInput');
    const nightModeToggleFiles = document.getElementById('nightModeToggleFiles');
    const nightModeToggleEdit = document.getElementById('nightModeToggleEdit');

    let files = JSON.parse(localStorage.getItem('files')) || [];
    let currentFileIndex = -1;
    let ascending = true;
    let currentFolderPath = [];

    function displayFiles() {
        filesContainer.innerHTML = '';
        const currentFolder = getCurrentFolder();
        const sortedFiles = currentFolder.slice().sort((a, b) => {
            return ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        });
        sortedFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item');
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
        titleElement.innerHTML = currentFolderPath.length > 0 ? `Files - ${currentFolderPath.join(' / ')}` : 'Files';
    }

    function showAddFileModal() {
        addFileModal.style.display = 'flex';
    }

    function closeAddFileModal() {
        addFileModal.style.display = 'none';
    }

    function addNewFile() {
        const fileName = fileNameInput.value.trim();
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
    }

    function editFile(index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'JSON') {
            currentFileIndex = index;
            const editPage = document.getElementById('editPage');
            const filesPage = document.getElementById('filesPage');
            const currentEditFileName = document.getElementById('currentEditFileName');
            editPage.classList.remove('hidden');
            filesPage.classList.add('hidden');
            currentEditFileName.textContent = file.name;
            document.getElementById('fileContent').value = file.content;
        }
    }

    function executeFile(index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'JSON') {
            alert(`Executing the following content:\n${file.content}`);
        } else {
            const contentToExecute = executeAllJsonInFolder(file);
            if (contentToExecute.length > 0) {
                alert(`Executing the following content:\n${contentToExecute.join('\n')}`);
            } else {
                alert('No JSON content found to execute.');
            }
        }
    }

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

    function openFolder(index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (file.type === 'Folder') {
            currentFolderPath.push(file.name);
            displayFiles();
        }
    }

    function deleteFile(index) {
        const currentFolder = getCurrentFolder();
        const file = currentFolder[index];
        if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
            currentFolder.splice(index, 1);
            localStorage.setItem('files', JSON.stringify(files));
            displayFiles();
        }
    }

    function showRenameFileModal(index) {
        currentFileIndex = index;
        const currentFolder = getCurrentFolder();
        newFileNameInput.value = currentFolder[index].name;
        renameFileModal.style.display = 'flex';
    }

    function closeRenameFileModal() {
        renameFileModal.style.display = 'none';
    }

    function renameFile() {
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
    }

    function toggleFileList() {
        ascending = !ascending;
        document.querySelector('.list-button').innerText = `List ${ascending ? '↑' : '↓'}`;
        displayFiles();
    }

    function goBack() {
        if (currentFolderPath.length > 0) {
            currentFolderPath.pop();
            displayFiles();
        } else {
            const editPage = document.getElementById('editPage');
            const filesPage = document.getElementById('filesPage');
            editPage.classList.add('hidden');
            filesPage.classList.remove('hidden');
        }
    }

    function toggleNightMode(event) {
        document.body.classList.toggle('night-mode', event.target.checked);
        localStorage.setItem('nightMode', event.target.checked);
    }

    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggleFiles.checked = true;
        nightModeToggleEdit.checked = true;
    }

    nightModeToggleFiles.addEventListener('change', toggleNightMode);
    nightModeToggleEdit.addEventListener('change', toggleNightMode);

    displayFiles();

    window.showAddFileModal = showAddFileModal;
    window.closeAddFileModal = closeAddFileModal;
    window.addNewFile = addNewFile;
    window.editFile = editFile;
    window.executeFile = executeFile;
    window.openFolder = openFolder;
    window.deleteFile = deleteFile;
    window.showRenameFileModal = showRenameFileModal;
    window.closeRenameFileModal = closeRenameFileModal;
    window.renameFile = renameFile;
    window.toggleFileList = toggleFileList;
    window.goBack = goBack;
});
