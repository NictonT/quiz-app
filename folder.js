document.addEventListener('DOMContentLoaded', () => {
    const pageTitle = document.getElementById('pageTitle');
    const folderView = document.getElementById('folderView');
    const fileEditView = document.getElementById('fileEditView');
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');
    const addFileButton = document.getElementById('addFileButton');
    const addFolderButton = document.getElementById('addFolderButton');
    const saveButton = document.getElementById('saveButton');
    const executeButton = document.getElementById('executeButton');
    const backButton = document.getElementById('backButton');
    const nightModeToggle = document.getElementById('nightModeToggle');

    let files = JSON.parse(localStorage.getItem('files')) || [];
    let currentPath = [];
    let currentFile = null;

    function updateUI() {
        updatePageTitle();
        updateFileList();
        toggleView();
    }

    function updatePageTitle() {
        pageTitle.textContent = currentPath.length > 0 
            ? `Folder - ${currentPath.join(' / ')}` 
            : 'Folder Manager';
    }

    function updateFileList() {
        fileList.innerHTML = '';
        let currentFolder = getCurrentFolder();
        currentFolder.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'file-item';
            itemElement.textContent = `${item.type === 'folder' ? '📁' : '📄'} ${item.name}`;
            
            if (item.type === 'folder') {
                itemElement.addEventListener('click', () => openFolder(index));
            } else {
                itemElement.addEventListener('click', () => editFile(index));
            }

            const executeButton = document.createElement('button');
            executeButton.textContent = 'Execute';
            executeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                executeFile(index);
            });

            itemElement.appendChild(executeButton);
            fileList.appendChild(itemElement);
        });
    }

    function toggleView() {
        if (currentFile === null) {
            folderView.style.display = 'block';
            fileEditView.style.display = 'none';
        } else {
            folderView.style.display = 'none';
            fileEditView.style.display = 'block';
        }
    }

    function getCurrentFolder() {
        let folder = files;
        for (const folderName of currentPath) {
            folder = folder.find(f => f.type === 'folder' && f.name === folderName).content;
        }
        return folder;
    }

    function openFolder(index) {
        const folder = getCurrentFolder()[index];
        currentPath.push(folder.name);
        updateUI();
    }

    function editFile(index) {
        currentFile = getCurrentFolder()[index];
        fileContent.value = currentFile.content;
        updateUI();
    }

    function executeFile(index) {
        const file = getCurrentFolder()[index];
        if (file.type === 'file') {
            try {
                eval(file.content);
                alert('File executed successfully!');
            } catch (error) {
                alert(`Error executing file: ${error.message}`);
            }
        } else if (file.type === 'folder') {
            executeAllInFolder(file.content);
        }
    }

    function executeAllInFolder(folderContent) {
        folderContent.forEach(item => {
            if (item.type === 'file') {
                try {
                    eval(item.content);
                } catch (error) {
                    console.error(`Error executing ${item.name}: ${error.message}`);
                }
            } else if (item.type === 'folder') {
                executeAllInFolder(item.content);
            }
        });
        alert('All JSON files in the folder executed successfully!');
    }

    addFileButton.addEventListener('click', () => {
        const fileName = prompt('Enter file name:');
        if (fileName) {
            getCurrentFolder().push({ type: 'file', name: fileName, content: '' });
            saveFiles();
            updateUI();
        }
    });

    addFolderButton.addEventListener('click', () => {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
            getCurrentFolder().push({ type: 'folder', name: folderName, content: [] });
            saveFiles();
            updateUI();
        }
    });

    saveButton.addEventListener('click', () => {
        if (currentFile) {
            currentFile.content = fileContent.value;
            saveFiles();
            alert('File saved successfully!');
        }
    });

    executeButton.addEventListener('click', () => {
        if (currentFile) {
            try {
                eval(currentFile.content);
                alert('File executed successfully!');
            } catch (error) {
                alert(`Error executing file: ${error.message}`);
            }
        }
    });

    backButton.addEventListener('click', () => {
        if (currentFile) {
            currentFile = null;
        } else if (currentPath.length > 0) {
            currentPath.pop();
        }
        updateUI();
    });

    nightModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('night-mode', nightModeToggle.checked);
        localStorage.setItem('nightMode', nightModeToggle.checked);
    });

    function saveFiles() {
        localStorage.setItem('files', JSON.stringify(files));
    }

    // Initialize
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }

    updateUI();
});