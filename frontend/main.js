import './src/style.css';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import 'monaco-editor/min/vs/editor/editor.main.css';
import { showModelsModal } from './src/modules/models.js';

// Estado global
let currentFile = null;
let isFileModified = false;
let saveTimeout = null;
let chatHistory = [];
let contextMenu = null;
let currentContextMenuFile = null;
let contextMenuTarget = null;
let isThinking = false; // Estado global para el chat, evita duplicidad y errores de referencia

// Estado global para borrado de archivos (SOLID/DRY)
let fileToDelete = null;

// Estado del file explorer
let fileExplorerState = {
    expandedFolders: new Set(),
    currentPath: '',
    fileTree: []
};

// Estado de navegación
let navigationHistory = [];
let navigationIndex = -1;
let fileTree = [];

// Monaco workers setup
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  }
};

// Language mapping
const languageMap = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.json': 'json',
  '.md': 'markdown',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.sql': 'sql',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml'
};

// API functions
const API_BASE = 'http://localhost:8080';

function getCurrentAIModelInfo() {
  // Devuelve { model, provider }
  const modelId = localStorage.getItem('aiModel') || 'gpt-3.5-turbo';
  const provider = localStorage.getItem('aiProvider') || 'OpenAI';
  return { model: modelId, provider };
}

function getCurrentAPIKey() {
  const { model } = getCurrentAIModelInfo();
  return localStorage.getItem(`apiKey_${model}`) || '';
}

// Reemplaza sendChatMessage y performFileOperation para usar fetch como antes
async function sendChatMessage(message, context = '') {
  const { model, provider } = getCurrentAIModelInfo();
  const apiKey = getCurrentAPIKey();
  if (!model || !provider) {
    console.error('[FRONT] No model or provider configured', { model, provider });
    throw new Error('No model or provider configured');
  }
  console.log('[FRONT] Enviando mensaje al backend:', { message, context, model, provider, apiKey });
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, model, provider, api_key: apiKey }),
  });
  console.log('[FRONT] Respuesta HTTP:', response.status, response.statusText);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FRONT] Error HTTP:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  console.log('[FRONT] Respuesta JSON:', data);
  return data;
}

async function performFileOperation(operation, path, content = '', newPath = '') {
  try {
    const requestBody = { operation, path, content, newPath };
    console.log('[FRONT] Enviando operación de archivo:', requestBody);
    const response = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    console.log('[FRONT] Respuesta HTTP:', response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FRONT] Error HTTP:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    console.log('[FRONT] Respuesta JSON:', result);
    return result;
  } catch (error) {
    console.error('[FRONT] Error performing file operation:', error);
    throw error;
  }
}

// UI functions
// (Eliminada la función updateFileExplorer y su uso, solo se usa renderFileExplorer)

function getFileIcon(filename) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (ext === '.js' || ext === '.jsx') return 'js';
  if (ext === '.ts' || ext === '.tsx') return 'ts';
  if (ext === '.css' || ext === '.scss' || ext === '.less') return 'css';
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'doc';
  if (ext === '.py') return 'py';
  if (ext === '.java') return 'java';
  if (ext === '.cpp' || ext === '.c') return 'cpp';
  if (ext === '.php') return 'php';
  if (ext === '.go') return 'go';
  if (ext === '.rs') return 'rust';
  return 'doc';
}

function updateChatHistory() {
  const chatHistoryEl = document.querySelector('.chat-history');
  const isStreaming = isThinking;

  if (isStreaming && chatHistory.length > 0) {
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage.role === 'ai') {
      const lastMessageEl = chatHistoryEl.lastChild;
      if (lastMessageEl && lastMessageEl.classList.contains('ai')) {
        lastMessageEl.innerHTML = formatMessage(lastMessage.content);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
        return;
      }
    }
  }

  chatHistoryEl.innerHTML = '';
  
  chatHistory.forEach(message => {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.role}`;
    messageEl.innerHTML = formatMessage(message.content);
    chatHistoryEl.appendChild(messageEl);
  });
  
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function formatMessage(content) {
  // Simple markdown-like formatting
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function showThinkingState() {
  isThinking = true;
  const sendBtn = document.querySelector('.send-btn');
  sendBtn.innerHTML = '⏳';
  sendBtn.disabled = true;
}

function hideThinkingState() {
  isThinking = false;
  const sendBtn = document.querySelector('.send-btn');
  sendBtn.innerHTML = '</>';
  sendBtn.disabled = false;
}

function updateEditorLanguage(filename) {
  if (!filename) return;
  
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const language = languageMap[ext] || 'plaintext';
  
  console.log('Updating editor language:', { filename, ext, language });
  
  try {
    if (window.editor && window.editor.getModel()) {
      monaco.editor.setModelLanguage(window.editor.getModel(), language);
    }
    
    // Update search bar
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
      searchInput.value = filename;
    }
  } catch (error) {
    console.error('Error updating editor language:', error);
  }
}

function showSaveStatus(status, message) {
  const statusEl = document.querySelector('.save-status') || createSaveStatusElement();
  statusEl.textContent = message;
  statusEl.className = `save-status ${status}`;
  
  setTimeout(() => {
    statusEl.className = 'save-status hidden';
  }, 3000);
}

function createSaveStatusElement() {
  const statusEl = document.createElement('div');
  statusEl.className = 'save-status';
  document.querySelector('.search-bar').appendChild(statusEl);
  return statusEl;
}

// File operations
async function loadFileTree() {
  try {
    console.log('Loading file tree...');
    await loadFileExplorer();
  } catch (error) {
    console.error('Error loading file tree:', error);
    showSaveStatus('error', 'Error loading files');
  }
}

async function openFile(path) {
  try {
    console.log('Opening file with path:', path);
    
    const response = await performFileOperation('read', path);
    console.log('File operation response:', response);
    
    if (response.success) {
      // Add to navigation history before changing current file
      if (currentFile) {
        addToNavigationHistory({
          file: currentFile,
          line: window.editor ? window.editor.getPosition().lineNumber : 1
        });
      }
      
      currentFile = path;
      
      // Asegurar que el contenido sea una cadena válida
      const content = response.content || '';
      const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
      const language = languageMap[ext] || 'plaintext';
      
      // Crear un nuevo modelo para el archivo y asignarlo al editor
      if (window.editor) {
        const oldModel = window.editor.getModel();
        const newModel = monaco.editor.createModel(content, language);
        window.editor.setModel(newModel);
        if (oldModel) oldModel.dispose();
      }
      
      updateEditorLanguage(path);
      
      // Update search bar
      const searchInput = document.querySelector('.search-bar input');
      if (searchInput) {
        const fileName = path.split('/').pop() || path.split('\\').pop();
        searchInput.value = fileName;
        searchInput.placeholder = fileName;
      }
      
      showSaveStatus('success', 'File loaded');
    } else {
      showSaveStatus('error', response.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error loading file');
    console.error('Error opening file:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      path: path
    });
  }
}

async function saveCurrentFile() {
  if (!currentFile) {
    showSaveStatus('error', 'No file open');
    return;
  }
  
  try {
    const content = window.editor.getValue();
    const response = await performFileOperation('write', currentFile, content);
    if (response.success) {
      showSaveStatus('success', 'File saved');
    } else {
      showSaveStatus('error', response.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error saving file');
    console.error('Error saving file:', error);
  }
}

// Templates de archivos
const fileTemplates = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello World!</h1>
    <script src="script.js"></script>
</body>
</html>`,
  
  'style.css': `/* CSS Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
}

h1 {
    color: #646cff;
    text-align: center;
    margin: 2rem 0;
}`,
  
  'script.js': `// JavaScript Code
console.log('Hello from JavaScript!');

function greet(name) {
    return \`Hello, \${name}!\`;
}

// Example usage
document.addEventListener('DOMContentLoaded', () => {
    console.log(greet('World'));
});`,
  
  'main.py': `# Python Script
def main():
    print("Hello, World!")
    
    # Example function
    def greet(name):
        return f"Hello, {name}!"
    
    # Example usage
    result = greet("Python")
    print(result)

if __name__ == "__main__":
    main()`,
  
  'app.js': `// React Component
import React, { useState } from 'react';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="App">
            <h1>React App</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
        </div>
    );
}

export default App;`,
  
  'index.ts': `// TypeScript Code
interface User {
    name: string;
    age: number;
}

function greet(user: User): string {
    return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

// Example usage
const user: User = {
    name: "TypeScript",
    age: 10
};

console.log(greet(user));`
};

// Modal functions
function showModal() {
  const modal = document.getElementById('newFileModal');
  modal.classList.add('show');
  document.getElementById('filename').focus();
}

function hideModal() {
  const modal = document.getElementById('newFileModal');
  modal.classList.remove('show');
  document.getElementById('filename').value = '';
  // Remove active class from template buttons
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

function showRenameModal(oldName) {
  const modal = document.getElementById('renameFileModal');
  const newFilenameInput = document.getElementById('newFilename');
  const currentFileNameEl = document.getElementById('currentFileName');
  const fileTypeEl = document.getElementById('fileType');
  
  // Set current file name
  currentFileNameEl.textContent = oldName;
  
  // Set file type based on extension
  const ext = oldName.substring(oldName.lastIndexOf('.')).toLowerCase();
  const fileType = getFileTypeName(ext);
  fileTypeEl.textContent = fileType;
  
  // Set default value for new filename
  newFilenameInput.value = oldName;
  
  // Show modal and focus on input
  modal.classList.add('show');
  newFilenameInput.focus();
  
  // Select the filename without extension for easy editing
  const nameWithoutExt = oldName.substring(0, oldName.lastIndexOf('.'));
  if (nameWithoutExt) {
    newFilenameInput.setSelectionRange(0, nameWithoutExt.length);
  }
}

function hideRenameModal() {
  const modal = document.getElementById('renameFileModal');
  modal.classList.remove('show');
  document.getElementById('newFilename').value = '';
}

function getFileTypeName(ext) {
  const typeMap = {
    '.js': 'JavaScript',
    '.jsx': 'React JSX',
    '.ts': 'TypeScript',
    '.tsx': 'React TSX',
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'Less',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.sql': 'SQL',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML'
  };
  return typeMap[ext] || 'Text File';
}

function setupRenameModal() {
  const modal = document.getElementById('renameFileModal');
  const closeBtn = document.getElementById('closeRenameModal');
  const cancelBtn = document.getElementById('cancelRenameBtn');
  const renameBtn = document.getElementById('renameBtn');
  const newFilenameInput = document.getElementById('newFilename');

  // Close modal events
  closeBtn.addEventListener('click', hideRenameModal);
  cancelBtn.addEventListener('click', hideRenameModal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideRenameModal();
    }
  });

  // Rename file event
  renameBtn.addEventListener('click', async () => {
    const newName = newFilenameInput.value.trim();
    const currentName = document.getElementById('currentFileName').textContent;
    
    if (!newName || newName === currentName) {
      newFilenameInput.focus();
      return;
    }
    
    await performRename(currentName, newName);
    hideRenameModal();
  });

  // Enter key to rename file
  newFilenameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      renameBtn.click();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideRenameModal();
    }
  });
}

async function performRename(oldName, newName) {
  try {
    console.log('Renaming file:', { oldName, newName });
    
    const response = await performFileOperation('rename', oldName, '', newName);
    console.log('Rename response:', response);
    
    if (response.success) {
      showSaveStatus('success', 'File renamed');
      
      // Si el archivo renombrado es el que está abierto, actualizar currentFile
      if (currentFile === oldName) {
        currentFile = newName;
        updateEditorLanguage(newName);
      }
      
      // Recargar el fileTree
      await loadFileTree();
    } else {
      showSaveStatus('error', response.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error renaming file');
    console.error('Error renaming file:', error);
  }
}

function setupModal() {
  const modal = document.getElementById('newFileModal');
  const closeBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const createBtn = document.getElementById('createBtn');
  const filenameInput = document.getElementById('filename');
  const templateBtns = document.querySelectorAll('.template-btn');

  // Close modal events
  closeBtn.addEventListener('click', hideModal);
  cancelBtn.addEventListener('click', hideModal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });

  // Template button events
  templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const template = btn.dataset.template;
      filenameInput.value = template;
      
      // Remove active class from all buttons
      templateBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
    });
  });

  // Create file event
  createBtn.addEventListener('click', async () => {
    const filename = filenameInput.value.trim();
    if (!filename) {
      filenameInput.focus();
      return;
    }
    
    // Get template content if available
    const template = fileTemplates[filename] || '';
    
    await createNewFileWithTemplate(filename, template);
    hideModal();
  });

  // Enter key to create file
  filenameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createBtn.click();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideModal();
    }
  });
}

async function createNewFileWithTemplate(filename, template = '') {
  try {
    console.log('Creating new file with template:', { filename, templateLength: template.length });
    
    const response = await performFileOperation('create', filename, template);
    console.log('Create file response:', response);
    
    if (response.success) {
      showSaveStatus('success', 'File created');
      
      // Recargar el fileTree primero
      await loadFileTree();
      
      // En lugar de abrir automáticamente, limpiar el editor y prepararlo
      currentFile = filename;
      if (window.editor && typeof window.editor.setValue === 'function') {
        window.editor.setValue(template);
        updateEditorLanguage(filename);
        showSaveStatus('success', 'Ready to edit: ' + filename);
      }
    } else {
      showSaveStatus('error', response.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error creating file');
    console.error('Error creating file:', error);
  }
}

async function createNewFile() {
  showModal();
}

function showDeleteConfirmModal(filename, filePath) {
  const modal = document.getElementById('deleteConfirmModal');
  const deleteFileNameEl = document.getElementById('deleteFileName');
  const deleteFileIconEl = document.getElementById('deleteFileIcon');
  
  // Set file information
  deleteFileNameEl.textContent = filename;
  
  // Set file icon
  const iconClass = getFileIcon(filename);
  deleteFileIconEl.className = `file-icon ${iconClass}`;
  
  // Store file info for deletion
  fileToDelete = { name: filename, path: filePath };
  
  // Show modal
  modal.classList.add('show');
}

function hideDeleteConfirmModal() {
  const modal = document.getElementById('deleteConfirmModal');
  modal.classList.remove('show');
  fileToDelete = null;
}

function setupDeleteConfirmModal() {
  const modal = document.getElementById('deleteConfirmModal');
  const closeBtn = document.getElementById('closeDeleteModal');
  const cancelBtn = document.getElementById('cancelDeleteBtn');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  // Close modal events
  closeBtn.addEventListener('click', hideDeleteConfirmModal);
  cancelBtn.addEventListener('click', hideDeleteConfirmModal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideDeleteConfirmModal();
    }
  });

  // Confirm delete event
  confirmBtn.addEventListener('click', async () => {
    if (fileToDelete) {
      await performDelete(fileToDelete.name, fileToDelete.path);
      hideDeleteConfirmModal();
    }
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      hideDeleteConfirmModal();
    }
  });
}

async function performDelete(filename, filePath) {
  try {
    // Extraer solo el nombre del archivo del path completo
    const nameToDelete = filename || (filePath.split('/').pop() || filePath.split('\\').pop() || filePath);
    
    const response = await performFileOperation('delete', nameToDelete);
    if (response.success) {
      showSaveStatus('success', 'File deleted');
      if (currentFile === nameToDelete) {
        currentFile = null;
        window.editor.setValue('');
      }
      await loadFileTree();
    } else {
      showSaveStatus('error', response.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error deleting file');
    console.error('Error deleting file:', error);
  }
}

async function deleteFile(path) {
  // Extraer solo el nombre del archivo del path completo
  const filename = path.split('/').pop() || path.split('\\').pop() || path;
  showDeleteConfirmModal(filename, path);
}

async function renameFile(oldName) {
  showRenameModal(oldName);
}

function toggleDirectory(path) {
  // Simple directory toggle - in a real app, you'd load subdirectories
  console.log('Toggle directory:', path);
}

// Chat functions
async function sendMessage() {
  const input = document.querySelector('.chat-input input');
  const message = input.value.trim();
  if (!message || isThinking) return;
  const { model, provider } = getCurrentAIModelInfo();
  const apiKey = getCurrentAPIKey();
  console.log('[AI DEBUG]', { model, provider, apiKey });
  if (!model || !provider || !apiKey) {
    chatHistory.push({ role: 'ai', content: 'No existe ningun modelo configurado el shortcut es Ctrl+Shift+I', timestamp: new Date() });
    updateChatHistory();
    input.value = '';
    return;
  }
  chatHistory.push({ role: 'user', content: message, timestamp: new Date() });
  updateChatHistory();
  input.value = '';
  const context = currentFile ? `Current file: ${currentFile}\nContent:\n${window.editor.getValue()}` : '';
  showThinkingState();
  try {
    const response = await sendChatMessage(message, context);
    chatHistory.push({ role: 'ai', content: response.response, timestamp: new Date() });
    updateChatHistory();
  } catch (error) {
    chatHistory.push({ role: 'ai', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() });
    updateChatHistory();
  } finally {
    hideThinkingState();
  }
}

// AI integration with editor
async function askAIAboutCode() {
  const selection = window.editor.getSelection();
  let codeContext = '';
  
  if (!selection.isEmpty()) {
    codeContext = window.editor.getModel().getValueInRange(selection);
  } else {
    codeContext = window.editor.getValue();
  }
  
  const message = prompt('What would you like to ask about this code?');
  if (!message) return;
  
  const fullMessage = `Code context:\n\`\`\`\n${codeContext}\n\`\`\`\n\nQuestion: ${message}`;
  
  // Add to chat
  chatHistory.push({
    role: 'user',
    content: fullMessage,
    timestamp: new Date()
  });
  
  updateChatHistory();
  
  showThinkingState();
  
  try {
    const response = await sendChatMessage(message, codeContext);
    
    chatHistory.push({
      role: 'ai',
      content: response.response,
      timestamp: new Date()
    });
    
    updateChatHistory();
  } catch (error) {
    chatHistory.push({
      role: 'ai',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    });
    updateChatHistory();
  } finally {
    hideThinkingState();
  }
}

// Initialize Monaco editor
window.addEventListener('DOMContentLoaded', () => {
  // Define custom theme
  monaco.editor.defineTheme('airide-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'e6e6e6', background: '181e25' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'identifier', foreground: 'e6e6e6' },
      { token: 'delimiter', foreground: 'e6e6e6' },
      { token: 'type', foreground: '4ec9b0' }
    ],
    colors: {
      'editor.background': '#181e25',
      'editor.foreground': '#e6e6e6',
      'editor.lineHighlightBackground': '#232a32',
      'editorCursor.foreground': '#e6e6e6',
      'editorLineNumber.foreground': '#4b5263',
      'editor.selectionBackground': '#232a32',
      'editor.inactiveSelectionBackground': '#232a3299',
      'editorIndentGuide.background': '#232a32',
      'editorIndentGuide.activeBackground': '#4b5263'
    }
  });

  const editorArea = document.querySelector('.editor-area');
  if (editorArea) {
    const editor = monaco.editor.create(editorArea, {
      value: '// Welcome to AirIde!\n// Start coding or open a file from the explorer.\n',
      language: 'javascript',
      theme: 'airide-dark',
      fontSize: 16,
      minimap: { enabled: false },
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: true,
      contextmenu: true,
      mouseWheelZoom: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: true,
      parameterHints: {
        enabled: true
      },
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
    });
    
    window.editor = editor;
    
    // Auto-save on changes
    let saveTimeout;
    editor.onDidChangeModelContent(() => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (currentFile) {
          saveCurrentFile();
        }
      }, 2000);
    });
    
    // Add AI button to editor
    const aiButton = document.createElement('button');
    aiButton.className = 'ai-button';
    aiButton.innerHTML = '🤖';
    aiButton.title = 'Ask AI about this code';
    // setSafeEvent(aiButton, 'onclick', askAIAboutCode);
    const searchBar = document.querySelector('.search-bar');
    searchBar.appendChild(aiButton);
  }
  
  // Initialize chat
  chatHistory = [
    {
      role: 'ai',
      content: 'Hello! I\'m your AI coding assistant. How can I help you today?',
      timestamp: new Date()
    }
  ];
  updateChatHistory();
  
  // Load initial file tree
  loadFileTree();
  
  // Setup modal
  setupModal();
  
  // Setup rename modal
  setupRenameModal();
  
  // Setup context menu
  setupContextMenu();
  
  // Setup delete confirmation modal
  setupDeleteConfirmModal();
  
  // Setup info modal
  setupInfoModal();

  // Setup top menu
  setupTopMenu();
  
    
  // Event listeners
  const chatInput = document.querySelector('.chat-input input');
  const sendBtn = document.querySelector('.send-btn');
  
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          saveCurrentFile();
          break;
        case 'n':
          e.preventDefault();
          createNewFile();
          break;
        case 'o':
          e.preventDefault();
          // Could implement file open dialog
          break;
        case 'b':
          e.preventDefault();
          handleMenuAction('toggleSidebar');
          break;
        case '0':
          e.preventDefault();
          handleMenuAction('resetZoom');
          break;
      }
    }
    
    // Additional shortcuts
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key) {
        case 'C':
          e.preventDefault();
          handleMenuAction('toggleChat');
          break;
        case 'M':
          e.preventDefault();
          handleMenuAction('toggleMinimap');
          break;
        case 'I':
          e.preventDefault();
          handleMenuAction('configureModels');
          break;
        case '=':
        case '+':
          e.preventDefault();
          handleMenuAction('zoomIn');
          break;
        case '-':
          e.preventDefault();
          handleMenuAction('zoomOut');
          break;
        case 'O':
          e.preventDefault();
          handleMenuAction('goToSymbol');
          break;
        case '\\':
          e.preventDefault();
          handleMenuAction('goToBracket');
          break;
      }
    }
    
    if (e.altKey) {
      switch (e.key) {
        case 'z':
        case 'Z':
          e.preventDefault();
          handleMenuAction('toggleWordWrap');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleMenuAction('back');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleMenuAction('forward');
          break;
      }
    }
    
    // Individual key shortcuts
    if (e.ctrlKey && !e.shiftKey) {
      switch (e.key) {
        case 'g':
        case 'G':
          e.preventDefault();
          handleMenuAction('goToLine');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handleMenuAction('goToFile');
          break;
      }
    }
    
    if (e.key === 'F12') {
      e.preventDefault();
      if (e.shiftKey) {
        handleMenuAction('goToReferences');
      } else {
        handleMenuAction('goToDefinition');
      }
    }
    
    if (e.key === 'F11') {
      e.preventDefault();
      handleMenuAction('fullscreen');
    }   
    
  });

  // Al final del bloque DOMContentLoaded, agrega el event listener para el botón X
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (window.editor && typeof window.editor.setValue === 'function') {
        window.editor.setValue('');
      }
      const searchInput = document.querySelector('.search-bar input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'No file open';
      }
      currentFile = null;
    });
  }
});

// Context menu functions
function showContextMenu(event, file) {
  console.log('showContextMenu called for file:', file.name);
  const contextMenu = document.getElementById('contextMenu');
  contextMenuTarget = file;
  
  // Position the context menu
  const rect = contextMenu.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  
  // Adjust position if menu would go off screen
  const menuWidth = 180;
  const menuHeight = 280;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  let finalX = x;
  let finalY = y;
  
  if (x + menuWidth > windowWidth) {
    finalX = x - menuWidth;
  }
  
  if (y + menuHeight > windowHeight) {
    finalY = y - menuHeight;
  }
  
  contextMenu.style.left = finalX + 'px';
  contextMenu.style.top = finalY + 'px';
  contextMenu.classList.add('show');
  console.log('Context menu shown with class show');
}

function hideContextMenu() {
  console.log('hideContextMenu called');
  const contextMenu = document.getElementById('contextMenu');
  if (contextMenu) {
    contextMenu.classList.remove('show');
    console.log('Context menu class show removed');
  }
  contextMenuTarget = null;
}

function setupContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  
  // Add event listeners to context menu items
  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar que el clic se propague al document
    
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem) return;
    
    const action = menuItem.dataset.action;
    if (action && contextMenuTarget) {
      handleContextMenuAction(action, contextMenuTarget);
    }
    
    // Cerrar el menú después de ejecutar la acción
    hideContextMenu();
  });
  
  // Hide context menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
    }
  });
  
  // Hide context menu when clicking outside - usar mousedown para mejor respuesta
  document.addEventListener('mousedown', (e) => {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && contextMenu.classList.contains('show')) {
      // Si el clic no es dentro del menú contextual, cerrarlo
      if (!contextMenu.contains(e.target)) {
        hideContextMenu();
      }
    }
  });
  
  // También agregar listener para click por si acaso
  document.addEventListener('click', (e) => {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && contextMenu.classList.contains('show')) {
      // Si el clic no es dentro del menú contextual, cerrarlo
      if (!contextMenu.contains(e.target)) {
        hideContextMenu();
      }
    }
  });
}

async function handleContextMenuAction(action, file) {
  console.log('Context menu action:', action, 'on file:', file.name);
  
  switch (action) {
    case 'open':
      openFile(file.path);
      break;
      
    case 'openInNewTab':
      // For now, same as open (could be implemented with tabs later)
      openFile(file.path);
      break;
      
    case 'copy':
      await copyFile(file.name);
      break;
      
    case 'cut':
      await cutFile(file.name);
      break;
      
    case 'copyPath':
      copyToClipboard(file.path);
      showSaveStatus('success', 'Path copied to clipboard');
      break;
      
    case 'rename':
      renameFile(file.name);
      break;
      
    case 'duplicate':
      await duplicateFile(file.name);
      break;
      
    case 'delete':
      deleteFile(file.path);
      break;
      
    default:
      console.log('Unknown action:', action);
  }
}

async function copyFile(filename) {
  try {
    const response = await performFileOperation('read', filename);
    if (response.success) {
      copyToClipboard(response.content);
      showSaveStatus('success', 'File content copied to clipboard');
    } else {
      showSaveStatus('error', 'Failed to copy file');
    }
  } catch (error) {
    showSaveStatus('error', 'Error copying file');
    console.error('Error copying file:', error);
  }
}

async function cutFile(filename) {
  try {
    const response = await performFileOperation('read', filename);
    if (response.success) {
      copyToClipboard(response.content);
      // For now, just copy. In a real implementation, you'd store this for paste operation
      showSaveStatus('success', 'File content cut to clipboard');
    } else {
      showSaveStatus('error', 'Failed to cut file');
    }
  } catch (error) {
    showSaveStatus('error', 'Error cutting file');
    console.error('Error cutting file:', error);
  }
}

async function duplicateFile(filename) {
  try {
    // Get the file content
    const response = await performFileOperation('read', filename);
    if (!response.success) {
      showSaveStatus('error', 'Failed to read file for duplication');
      return;
    }
    
    // Create new filename
    const ext = filename.substring(filename.lastIndexOf('.'));
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const newName = `${nameWithoutExt}_copy${ext}`;
    
    // Create the duplicate
    const createResponse = await performFileOperation('create', newName, response.content);
    if (createResponse.success) {
      showSaveStatus('success', 'File duplicated');
      await loadFileTree();
    } else {
      showSaveStatus('error', createResponse.message);
    }
  } catch (error) {
    showSaveStatus('error', 'Error duplicating file');
    console.error('Error duplicating file:', error);
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  }
}

// Función para cargar el file explorer
async function loadFileExplorer() {
    try {
        const response = await fetch('http://localhost:8080/api/files');
        const data = await response.json();
        
        if (data.success) {
            fileExplorerState.fileTree = data.files;
            renderFileExplorer();
        } else {
            console.error('Error loading files:', data.message);
        }
    } catch (error) {
        console.error('Error loading file explorer:', error);
    }
}

// Función para cargar contenido de un directorio
async function loadDirectoryContents(dirPath) {
    try {
        const response = await fetch(`http://localhost:8080/api/directory?path=${encodeURIComponent(dirPath)}`);
        const data = await response.json();
        
        if (data.success) {
            return data.files;
        } else {
            console.error('Error loading directory:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Error loading directory contents:', error);
        return [];
    }
}

// Función para renderizar el file explorer
function renderFileExplorer() {
    const fileExplorer = document.getElementById('file-explorer');
    if (!fileExplorer) return;
    fileExplorer.innerHTML = '';
    // Agregar el directorio raíz
    const rootItem = createFileItem({
        name: '📁 AirIde',
        path: '',
        isDir: true,
        isRoot: true,
        children: fileExplorerState.fileTree
    });
    fileExplorer.appendChild(rootItem);
}

// Función para crear un elemento de archivo/carpeta
function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item' + (file.isDir ? ' folder' : '');
    item.dataset.path = file.path;
    item.dataset.isDir = file.isDir;
    if (file.isRoot) item.classList.add('root-folder');

    const isExpanded = fileExplorerState.expandedFolders.has(file.path);

    const icon = file.isDir ? (isExpanded ? '📂' : '📁') : getFileIcon(file.name);
    const name = file.isRoot ? file.name : file.name;

    item.innerHTML = `
        <div class="file-item-content">
            <span class="file-icon">${icon}</span>
            <span class="file-name">${name}</span>
            ${file.isDir ? `<span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>` : ''}
        </div>
        ${file.isDir ? '<div class="folder-contents"></div>' : ''}
    `;

    // Event listeners
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFileItemClick(file, item);
    });
    item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, file);
    });

    // Si es carpeta y está expandida, renderiza hijos recursivamente
    if (file.isDir && isExpanded && file.children && file.children.length > 0) {
        const contentsDiv = item.querySelector('.folder-contents');
        file.children.forEach(child => {
            const childItem = createFileItem(child);
            contentsDiv.appendChild(childItem);
        });
    }
    return item;
}

// Función para manejar clic en elemento del file explorer
async function handleFileItemClick(file, item) {
    if (file.isDir) {
        await toggleFolder(file, item);
    } else {
        openFile(file.path);
    }
}

// Función para expandir/contraer carpetas
async function toggleFolder(folder, item) {
    const isExpanded = fileExplorerState.expandedFolders.has(folder.path);
    const contentsDiv = item.querySelector('.folder-contents');
    const expandIcon = item.querySelector('.expand-icon');
    
    if (isExpanded) {
        // Contraer carpeta
        fileExplorerState.expandedFolders.delete(folder.path);
        contentsDiv.innerHTML = '';
        expandIcon.textContent = '▶';
        item.classList.remove('expanded');
    } else {
        // Expandir carpeta
        fileExplorerState.expandedFolders.add(folder.path);
        expandIcon.textContent = '▼';
        item.classList.add('expanded');
        // Cargar contenido de la carpeta
        const contents = await loadDirectoryContents(folder.path);
        contentsDiv.innerHTML = '';
        // Al renderizar hijos, asegúrate de que el path sea completo
        contents.forEach(file => {
            // Si el hijo es una carpeta o archivo, su path debe ser relativo completo
            const childPath = folder.path ? `${folder.path}/${file.name}` : file.name;
            const fileWithFullPath = { ...file, path: childPath };
            const fileItem = createFileItem(fileWithFullPath);
            contentsDiv.appendChild(fileItem);
        });
    }
}

// Asegurar que createNewFile esté definida en el ámbito global
window.createNewFile = createNewFile;

// Setup top menu functionality
function setupTopMenu() {
  const fileMenu = document.getElementById('fileMenu');
  const editMenu = document.getElementById('editMenu');
  const viewMenu = document.getElementById('viewMenu');
  const goMenu = document.getElementById('goMenu');
  const aiMenu = document.getElementById('aiMenu');
  const aboutMenu = document.getElementById('aboutMenuDropdown');
  
  // Setup File menu
  if (fileMenu) {
    fileMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  // Setup Edit menu
  if (editMenu) {
    editMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  // Setup View menu
  if (viewMenu) {
    viewMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  // Setup Go menu
  if (goMenu) {
    goMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  // Setup AI menu
  if (aiMenu) {
    aiMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  
  // Setup About menu
  if (aboutMenu) {
    aboutMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const menuOption = e.target.closest('.menu-option');
      if (!menuOption) return;
      
      const action = menuOption.dataset.action;
      if (action) {
        handleMenuAction(action);
      }
    });
  }
  
  // Setup menu hover events
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    const dropdown = item.querySelector('.menu-dropdown');
    const label = item.querySelector('.menu-label');
    
    if (dropdown && label) {
      label.addEventListener('mouseenter', () => {
        // Hide all other dropdowns first
        document.querySelectorAll('.menu-dropdown').forEach(d => {
          d.style.opacity = '0';
          d.style.visibility = 'hidden';
          d.style.transform = 'translateY(-10px)';
        });
        
        // Show this dropdown
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
      });
      
      item.addEventListener('mouseleave', () => {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
      });
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', () => {
    const dropdowns = document.querySelectorAll('.menu-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.style.opacity = '0';
      dropdown.style.visibility = 'hidden';
      dropdown.style.transform = 'translateY(-10px)';
    });
  });
}


async function handleMenuAction(action) {
  console.log('Menu action:', action);
  
  switch (action) {
    // File menu actions
    case 'newFile':
      createNewFile();
      break;
      
    case 'openFile':
      // Crear un input file nativo para seleccionar archivos
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '*/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
          try {
            // Leer el contenido del archivo
            const content = await file.text();
            const fileName = file.name;
            
            // Usar el nombre del archivo directamente sin prefijo temp/
            const filePath = fileName;
            
            // Guardar el archivo en el backend
            const saveResponse = await performFileOperation('write', filePath, content);
            if (saveResponse.success) {
              // Abrir el archivo
              await openFile(filePath);
              showSaveStatus('success', `File "${fileName}" opened successfully`);
            } else {
              showSaveStatus('error', `Failed to save file: ${saveResponse.message}`);
            }
          } catch (error) {
            console.error('Error reading file:', error);
            showSaveStatus('error', 'Failed to read file');
          }
        }
        // Limpiar el input
        document.body.removeChild(fileInput);
      });
      
      fileInput.click();
      break;
      
    case 'saveFile':
      saveCurrentFile();
      break;
      
    case 'saveAs':
      // For now, just save normally. Could implement save as dialog later
      saveCurrentFile();
      showSaveStatus('info', 'Save As dialog not implemented yet');
      break;
      
    case 'closeFile':
      if (currentFile) {
        currentFile = null;
        if (window.editor) {
          window.editor.setValue('');
        }
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
          searchInput.value = '';
          searchInput.placeholder = 'No file open';
        }
        showSaveStatus('success', 'File closed');
      } else {
        showSaveStatus('info', 'No file open');
      }
      break;
      
    case 'exit':
      // For web app, just show a message
      showSaveStatus('info', 'Exit not available in web version');
      break;
      
    // Edit menu actions
    case 'undo':
      if (window.editor) {
        window.editor.trigger('keyboard', 'undo', {});
        showSaveStatus('success', 'Undo');
      }
      break;
      
    case 'redo':
      if (window.editor) {
        window.editor.trigger('keyboard', 'redo', {});
        showSaveStatus('success', 'Redo');
      }
      break;
      
    case 'cut':
      if (window.editor) {
        const selection = window.editor.getSelection();
        if (!selection.isEmpty()) {
          const selectedText = window.editor.getModel().getValueInRange(selection);
          copyToClipboard(selectedText);
          window.editor.trigger('keyboard', 'delete', {});
          showSaveStatus('success', 'Cut to clipboard');
        }
      }
      break;
      
    case 'copy':
      if (window.editor) {
        const selection = window.editor.getSelection();
        if (!selection.isEmpty()) {
          const selectedText = window.editor.getModel().getValueInRange(selection);
          copyToClipboard(selectedText);
          showSaveStatus('success', 'Copied to clipboard');
        }
      }
      break;
      
    case 'paste':
      if (window.editor) {
        navigator.clipboard.readText().then(text => {
          window.editor.trigger('keyboard', 'paste', {});
          showSaveStatus('success', 'Pasted from clipboard');
        }).catch(() => {
          showSaveStatus('error', 'Failed to paste from clipboard');
        });
      }
      break;
      
    case 'selectAll':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.selectAll', {});
        showSaveStatus('success', 'All selected');
      }
      break;
      
    case 'find':
      if (window.editor) {
        window.editor.trigger('keyboard', 'actions.find', {});
        showSaveStatus('info', 'Find activated');
      }
      break;
      
    case 'replace':
      if (window.editor) {
        window.editor.trigger('keyboard', 'actions.find', {});
        showSaveStatus('info', 'Replace activated');
      }
      break;
      
    case 'format':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.formatDocument', {});
        showSaveStatus('success', 'Document formatted');
      }
      break;
      
    case 'comment':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.commentLine', {});
        showSaveStatus('success', 'Comment toggled');
      }
      break;
      
    // View menu actions
    case 'toggleSidebar':
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        showSaveStatus('success', sidebar.classList.contains('collapsed') ? 'Sidebar hidden' : 'Sidebar shown');
      }
      break;
      
    case 'toggleChat':
      const chatSection = document.querySelector('.chat-section');
      if (chatSection) {
        chatSection.classList.toggle('collapsed');
        showSaveStatus('success', chatSection.classList.contains('collapsed') ? 'Chat hidden' : 'Chat shown');
      }
      break;
      
    case 'zoomIn':
      if (window.editor) {
        try {
          // Try Monaco Editor's zoom methods first
          if (typeof window.editor.getZoomLevel === 'function') {
            const currentZoom = window.editor.getZoomLevel();
            window.editor.setZoomLevel(currentZoom + 0.5);
          } else {
            // Alternative: use Monaco Editor's fontSize option
            const currentFontSize = window.editor.getOption(monaco.editor.EditorOption.fontSize);
            window.editor.updateOptions({ fontSize: currentFontSize + 1 });
          }
          showSaveStatus('success', 'Zoomed in');
        } catch (error) {
          console.error('Zoom in error:', error);
          // Fallback: use CSS zoom on the editor container
          const editorContainer = document.querySelector('.editor-area');
          if (editorContainer) {
            const currentZoom = parseFloat(editorContainer.style.zoom) || 1;
            editorContainer.style.zoom = (currentZoom + 0.1).toString();
            showSaveStatus('success', 'Zoomed in (fallback)');
          } else {
            showSaveStatus('error', 'Failed to zoom in');
          }
        }
      }
      break;
      
    case 'zoomOut':
      if (window.editor) {
        try {
          // Try Monaco Editor's zoom methods first
          if (typeof window.editor.getZoomLevel === 'function') {
            const currentZoom = window.editor.getZoomLevel();
            window.editor.setZoomLevel(currentZoom - 0.5);
          } else {
            // Alternative: use Monaco Editor's fontSize option
            const currentFontSize = window.editor.getOption(monaco.editor.EditorOption.fontSize);
            const newFontSize = Math.max(8, currentFontSize - 1);
            window.editor.updateOptions({ fontSize: newFontSize });
          }
          showSaveStatus('success', 'Zoomed out');
        } catch (error) {
          console.error('Zoom out error:', error);
          // Fallback: use CSS zoom on the editor container
          const editorContainer = document.querySelector('.editor-area');
          if (editorContainer) {
            const currentZoom = parseFloat(editorContainer.style.zoom) || 1;
            const newZoom = Math.max(0.5, currentZoom - 0.1);
            editorContainer.style.zoom = newZoom.toString();
            showSaveStatus('success', 'Zoomed out (fallback)');
          } else {
            showSaveStatus('error', 'Failed to zoom out');
          }
        }
      }
      break;
      
    case 'resetZoom':
      if (window.editor) {
        try {
          // Try Monaco Editor's zoom methods first
          if (typeof window.editor.setZoomLevel === 'function') {
            window.editor.setZoomLevel(0);
          } else {
            // Alternative: reset Monaco Editor's fontSize to default
            window.editor.updateOptions({ fontSize: 16 });
          }
          showSaveStatus('success', 'Zoom reset');
        } catch (error) {
          console.error('Reset zoom error:', error);
          // Fallback: reset CSS zoom on the editor container
          const editorContainer = document.querySelector('.editor-area');
          if (editorContainer) {
            editorContainer.style.zoom = '1';
            showSaveStatus('success', 'Zoom reset (fallback)');
          } else {
            showSaveStatus('error', 'Failed to reset zoom');
          }
        }
      }
      break;
      
    case 'toggleWordWrap':
      if (window.editor) {
        const currentWrap = window.editor.getOption(monaco.editor.EditorOption.wordWrap);
        const newWrap = currentWrap === 'on' ? 'off' : 'on';
        window.editor.updateOptions({ wordWrap: newWrap });
        showSaveStatus('success', `Word wrap ${newWrap === 'on' ? 'enabled' : 'disabled'}`);
      }
      break;
      
    case 'toggleLineNumbers':
      if (window.editor) {
        const currentLineNumbers = window.editor.getOption(monaco.editor.EditorOption.lineNumbers);
        const newLineNumbers = currentLineNumbers === 'on' ? 'off' : 'on';
        window.editor.updateOptions({ lineNumbers: newLineNumbers });
        showSaveStatus('success', `Line numbers ${newLineNumbers === 'on' ? 'enabled' : 'disabled'}`);
      }
      break;
      
    case 'toggleMinimap':
      if (window.editor) {
        const currentMinimap = window.editor.getOption(monaco.editor.EditorOption.minimap);
        const newMinimap = { ...currentMinimap, enabled: !currentMinimap.enabled };
        window.editor.updateOptions({ minimap: newMinimap });
        showSaveStatus('success', `Minimap ${newMinimap.enabled ? 'enabled' : 'disabled'}`);
      }
      break;
      
    case 'fullscreen':
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          showSaveStatus('success', 'Fullscreen enabled');
        }).catch(() => {
          showSaveStatus('error', 'Failed to enter fullscreen');
        });
      } else {
        document.exitFullscreen().then(() => {
          showSaveStatus('success', 'Fullscreen disabled');
        }).catch(() => {
          showSaveStatus('error', 'Failed to exit fullscreen');
        });
      }
      break;
      
    // Go menu actions
    case 'goToLine':
      if (window.editor) {
        const lineNumber = prompt('Enter line number:');
        if (lineNumber && !isNaN(lineNumber)) {
          const line = parseInt(lineNumber);
          const model = window.editor.getModel();
          if (model && line > 0 && line <= model.getLineCount()) {
            window.editor.revealLineInCenter(line);
            window.editor.setPosition({ lineNumber: line, column: 1 });
            showSaveStatus('success', `Jumped to line ${line}`);
          } else {
            showSaveStatus('error', 'Invalid line number');
          }
        }
      }
      break;
      
    case 'goToFile':
      showGoToFileDialog();
      break;
      
    case 'goToSymbol':
      if (window.editor) {
        window.editor.trigger('keyboard', 'workbench.action.gotoSymbol', {});
        showSaveStatus('info', 'Go to Symbol activated');
      }
      break;
      
    case 'goToDefinition':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.revealDefinition', {});
        showSaveStatus('info', 'Go to Definition activated');
      }
      break;
      
    case 'goToReferences':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.findReferences', {});
        showSaveStatus('info', 'Go to References activated');
      }
      break;
      
    case 'back':
      if (navigationIndex > 0) {
        navigationIndex--;
        const previousLocation = navigationHistory[navigationIndex];
        if (previousLocation) {
          goToLocation(previousLocation);
          showSaveStatus('success', 'Navigated back');
        }
      } else {
        showSaveStatus('info', 'No previous location');
      }
      break;
      
    case 'forward':
      if (navigationIndex < navigationHistory.length - 1) {
        navigationIndex++;
        const nextLocation = navigationHistory[navigationIndex];
        if (nextLocation) {
          goToLocation(nextLocation);
          showSaveStatus('success', 'Navigated forward');
        }
      } else {
        showSaveStatus('info', 'No next location');
      }
      break;
      
    case 'goToBracket':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.jumpToBracket', {});
        showSaveStatus('info', 'Jumped to bracket');
      }
      break;
      
    case 'goToMatchingBracket':
      if (window.editor) {
        window.editor.trigger('keyboard', 'editor.action.jumpToBracket', {});
        showSaveStatus('info', 'Jumped to matching bracket');
      }
      break;
      
    // AI menu actions
    case 'configureModels':
      showModelsModal();
      break;
      
    case 'showInfo':
      const infoModal = document.getElementById('infoModal');
      if (infoModal) {
        console.log('Menu action showInfo: abriendo modal Info');
        infoModal.classList.add('show');
      }
      break;
      
    case 'openFolder':
      // Crear un input file nativo para seleccionar carpetas
      const folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.webkitdirectory = true;
      folderInput.style.display = 'none';
      document.body.appendChild(folderInput);
      
      folderInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
          try {
            // Limpiar el proyecto actual
            currentFile = null;
            if (window.editor) window.editor.setValue('');
            fileTree = [];
            updateFileExplorer();
            // Subir todos los archivos seleccionados al backend
            for (const file of files) {
              const content = await file.text();
              const relPath = file.webkitRelativePath || file.name;
              await performFileOperation('write', relPath, content);
            }
            // Listar archivos de la nueva carpeta
            const rootDir = files[0].webkitRelativePath.split('/')[0];
            await loadDirectoryContents(rootDir);
            showSaveStatus('success', `Folder "${rootDir}" opened successfully`);
          } catch (error) {
            console.error('Error opening folder:', error);
            showSaveStatus('error', 'Failed to open folder');
          }
        }
        document.body.removeChild(folderInput);
      });
      folderInput.click();
      break;
      
    default:
    console.error('Error executing terminal command:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Make sure the Go server is running on port 8080.');
    }
    
    // Check if it's a JSON parsing error
    if (error.name === 'SyntaxError') {
      throw new Error('Invalid response from server. Backend may not be running or has an error.');
    }
    
    throw error;
  }
}

// Setup terminal functionality


// Test backend connectivity
async function testBackendConnection() {
  try {
    console.log('Testing backend connection...');
    // Usar valores reales si existen, o dummy si no
    const provider = localStorage.getItem('aiProvider') || 'DeepSeekOpenRoute';
    const model = localStorage.getItem('aiModel') || 'deepseek/deepseek-chat-v3-0324:free';
    const apiKey = localStorage.getItem(`apiKey_${model}`) || 'sk-dummy';
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'test', provider, api_key: apiKey, model }),
    });
    if (response.ok) {
      console.log('Backend is running and accessible');
      return true;
    } else {
      const errorText = await response.text();
      console.error('Backend responded with error:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
}

// Terminal functions

// --- INICIO: Lógica para abrir terminal nativa con Tauri ---
// Elimino los imports estáticos de Tauri


// Lógica unificada para modales
function setupInfoModal() {
  const infoModal = document.getElementById('infoModal');
  const closeInfoModal = document.getElementById('closeInfoModal');
  const closeInfoModalFooter = document.getElementById('closeInfoModalFooter');

  if (infoModal && closeInfoModal && closeInfoModalFooter) {
    const closeFn = () => infoModal.classList.remove('show');
    
    closeInfoModal.addEventListener('click', closeFn);
    closeInfoModalFooter.addEventListener('click', closeFn);
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) {
        closeFn();
      }
    });
  }
}

// Utilidad DRY/SOLID para asignar eventos de forma segura
function setSafeEvent(selector, event, handler) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) {
    el[event] = handler;
  }
}
