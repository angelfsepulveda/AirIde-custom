// frontend/src/modules/fileManager.js

/**
 * Fetches the content of a file from the backend.
 * @param {string} filePath - The path of the file to open.
 * @returns {Promise<string>} A promise that resolves with the file content.
 */
export async function openFile(filePath) {
    console.log(`[frontend] Attempting to open file: ${filePath}`);
    try {
        const response = await fetch('http://localhost:8080/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                Operation: 'read',
                Path: filePath
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to read file: ${errorData.Message || response.statusText}`);
        }

        const result = await response.json();
        if (result.Success) {
            console.log(`[frontend] Successfully read file: ${filePath}`);
            return result.Content;
        } else {
            throw new Error(result.Message || 'Unknown error reading file.');
        }
    } catch (error) {
        console.error(`[frontend] Error opening file ${filePath}:`, error);
        return `Error: Could not open file ${filePath}. ${error.message}`;
    }
}

/**
 * Fetches a list of files and directories from the backend for a given path.
 * @param {string} directoryPath - The path of the directory to list.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of file/folder objects.
 */
export async function listFiles(directoryPath) {
    console.log(`[frontend] Attempting to list files in: ${directoryPath}`);
    try {
        const url = new URL('http://localhost:8080/api/directory');
        url.searchParams.append('path', directoryPath);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to list directory: ${errorData.Message || response.statusText}`);
        }

        const result = await response.json();
        if (result.Success) {
            console.log(`[frontend] Successfully listed files for: ${directoryPath}`);
            return result.Files.map(file => ({
                name: file.name,
                type: file.isDir ? 'directory' : 'file',
                path: file.path // Use the path provided by the backend
            }));
        } else {
            throw new Error(result.Message || 'Unknown error listing files.');
        }
    } catch (error) {
        console.error(`[frontend] Error listing files in ${directoryPath}:`, error);
        return []; // Return empty array on error
    }
}
