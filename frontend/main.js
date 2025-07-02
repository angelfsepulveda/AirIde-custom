// --- Proyecto: Selección de carpeta base (TAURI DESKTOP) ---
import { open } from '@tauri-apps/api/dialog';

let projectBaseDir = null;
let currentFile = null;

// Selección de carpeta usando Tauri, guarda el path absoluto
export async function selectProjectFolder() {
  const selected = await open({ directory: true, multiple: false });
  if (selected) {
    projectBaseDir = selected;
    localStorage.setItem('projectBaseDir', selected);
    console.log('[FRONT] Carpeta seleccionada (absoluta):', selected);
    return selected;
  } else {
    alert('No se seleccionó ninguna carpeta.');
    return null;
  }
}

// Cargar archivos de la carpeta base actual
async function loadFileExplorer() {
  if (!projectBaseDir) {
    console.error('[FRONT] No hay carpeta base seleccionada');
    return;
  }
  const absPath = projectBaseDir;
  console.log('[FRONT] Solicitando archivos de:', absPath);
  const url = `http://localhost:8080/api/files?absPath=${encodeURIComponent(absPath)}`;
  console.log('[FRONT] URL solicitada:', url);
  const response = await fetch(url);
  const data = await response.json();
  if (data.success) {
    renderFileExplorer(data.files, absPath);
  } else {
    console.error('[FRONT] Error loading files:', data.message);
  }
}

// Renderiza solo el contenido de la carpeta actual
function renderFileExplorer(files, basePath) {
  const fileExplorer = document.getElementById('file-explorer');
  if (!fileExplorer) return;
  fileExplorer.innerHTML = '';
  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item' + (file.isDir ? ' folder' : '');
    item.textContent = (file.isDir ? '📁 ' : '📄 ') + file.name;
    item.onclick = () => {
      if (file.isDir) {
        // Si es carpeta, cargar su contenido
        const subPath = basePath + '/' + file.name;
        loadSubDirectory(subPath);
      } else {
        // Si es archivo, abrirlo
        openFile(basePath + '/' + file.name);
      }
    };
    fileExplorer.appendChild(item);
  });
}

// Cargar contenido de subcarpeta
async function loadSubDirectory(absPath) {
  console.log('[FRONT] Solicitando contenido de carpeta:', absPath);
  const url = `http://localhost:8080/api/files?absPath=${encodeURIComponent(absPath)}`;
  console.log('[FRONT] URL solicitada:', url);
  const response = await fetch(url);
  const data = await response.json();
  if (data.success) {
    renderFileExplorer(data.files, absPath);
  } else {
    console.error('[FRONT] Error loading subdirectory:', data.message);
  }
}

// Abrir archivo (lee el contenido usando path absoluto)
async function openFile(absPath) {
  console.log('[FRONT] Solicitando abrir archivo:', absPath);
  const url = `http://localhost:8080/api/file?absPath=${encodeURIComponent(absPath)}`;
  console.log('[FRONT] URL solicitada:', url);
  const response = await fetch(url);
  const data = await response.json();
  if (data.success) {
    currentFile = absPath;
    if (window.editor) window.editor.setValue(data.content);
    console.log('[FRONT] Archivo abierto:', absPath);
  } else {
    console.error('[FRONT] Error abriendo archivo:', data.message);
  }
}

// Guardar archivo (usa path absoluto)
async function saveCurrentFile() {
  if (!currentFile) return;
  const content = window.editor ? window.editor.getValue() : '';
  console.log('[FRONT] Guardando archivo:', currentFile);
  const url = `http://localhost:8080/api/file`;
  console.log('[FRONT] URL solicitada:', url, 'Body:', { absPath: currentFile, content });
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ absPath: currentFile, content })
  });
  const data = await response.json();
  if (data.success) {
    console.log('[FRONT] Archivo guardado:', currentFile);
  } else {
    console.error('[FRONT] Error guardando archivo:', data.message);
  }
}

// Al iniciar la app, pide seleccionar carpeta y carga archivos
window.addEventListener('DOMContentLoaded', async () => {
  const selected = await selectProjectFolder();
  if (selected) {
    await loadFileExplorer();
  }
});

// Elimina toda la lógica de árbol previa, fileExplorerState, getRelativePathFromBase, etc.
// El backend debe recibir y usar absPath tal cual para todas las operaciones.
