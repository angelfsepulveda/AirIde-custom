// frontend/src/modules/ui.js

import { openFile, listFiles } from './fileManager.js';

/**
 * Initializes the file explorer UI and loads initial files.
 */
export async function initializeFileExplorer() {
    const fileExplorerElement = document.getElementById('file-explorer');
    if (!fileExplorerElement) {
        console.error('File explorer element not found.');
        return;
    }

    // Load and display files for the current directory (or a default one)
    // The backend's listFiles function expects a path, so we'll pass the current project root.
    // Assuming the root of the project is what the backend considers './' or an empty string for default.
    await displayFiles('.'); 

    // Add event listener for file clicks
    fileExplorerElement.addEventListener('click', async (event) => {
        const fileItem = event.target.closest('.file-item');
        if (fileItem) {
            const filePath = fileItem.dataset.path;
            if (filePath) {
                const content = await openFile(filePath);
                displayFileContent(filePath, content);
            }
        }
    });
}

/**
 * Displays files and directories in the file explorer UI.
 * @param {string} directoryPath - The path of the directory to display.
 */
async function displayFiles(directoryPath) {
    const fileExplorerElement = document.getElementById('file-explorer');
    if (!fileExplorerElement) return;

    fileExplorerElement.innerHTML = ''; // Clear existing content

    const files = await listFiles(directoryPath);

    if (files.length === 0) {
        fileExplorerElement.innerHTML = '<div style="padding: 10px; color: #888;">No files or folders found.</div>';
        return;
    }

    files.forEach(item => {
        const div = document.createElement('div');
        div.className = `file-item ${item.type}`;
        div.dataset.path = item.path;
        div.textContent = item.name;
        fileExplorerElement.appendChild(div);
    });
}

/**
 * Displays the content of a file in a designated area (e.g., an editor).
 * @param {string} filePath - The path of the file.
 * @param {string} content - The content of the file.
 */
/**
 * Adds a file to the navigation history (placeholder for future implementation).
 * @param {string} filePath - The path of the file to add to history.
 */
function addToNavigationHistory(filePath) {
    console.log(`[frontend] Adding ${filePath} to navigation history (placeholder).`);
    // In a real application, this would manage a list of recently opened files
    // or navigation stack for back/forward functionality.
}

/**
 * Displays the content of a file in a designated area (e.g., an editor).
 * @param {string} filePath - The path of the file.
 * @param {string} content - The content of the file.
 */
function displayFileContent(filePath, content) {
    console.log(`[frontend] Displaying content for ${filePath}`);
    const editorContentElement = document.getElementById('editor-content');
    const searchBarInput = document.querySelector('.search-bar input');

    if (editorContentElement) {
        editorContentElement.textContent = content;
    }
    if (searchBarInput) {
        searchBarInput.value = filePath;
    }

    addToNavigationHistory(filePath); // Call the new placeholder function
}
    console.log(`[frontend] Displaying content for ${filePath}`);
    const editorContentElement = document.getElementById('editor-content');
    const searchBarInput = document.querySelector('.search-bar input');

    if (editorContentElement) {
        editorContentElement.textContent = content;
    }
    if (searchBarInput) {
        searchBarInput.value = filePath;
    }
}
