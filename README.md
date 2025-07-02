# AirIde

IDE de escritorio moderno con integración de IA, explorador de archivos, chat multi-modelo y backend en Go.

## Funcionalidades principales

### 🗂️ Explorador y gestión de archivos
- Selección de carpeta de proyecto al iniciar (usando `showDirectoryPicker`)
- Navegación de archivos y carpetas en árbol
- Abrir, crear, renombrar, eliminar y guardar archivos
- Operaciones de archivos siempre relativas a la carpeta seleccionada
- Iconos por tipo de archivo
- Auto-guardado y feedback visual

### 🧠 Integración de IA (Chat y ayuda)
- Chat AI contextual integrado en la UI
- Soporte para múltiples proveedores/modelos:
  - OpenAI (GPT-3.5, GPT-4, GPT-4o)
  - Anthropic (Claude 3)
  - DeepSeek, DeepSeekOpenRoute
  - Qwen3_32BOpenRoute
  - MistralNemoOpenRoute
- Configuración visual de modelo y API Key (modal moderno)
- Cambia de modelo/proveedor en cualquier momento
- El AI puede ver el código abierto y responder sobre él
- Notificaciones tipo toast para feedback

### 📝 Editor de código
- Basado en Monaco Editor (VS Code)
- Detección automática de lenguaje por extensión
- Soporte para: JS, TS, Python, Go, Rust, HTML, CSS, JSON, YAML, Markdown, y más
- Autocompletado, resaltado de sintaxis, errores en tiempo real
- Atajos: Ctrl+S (guardar), Ctrl+N (nuevo), Ctrl+O (abrir), etc.

### 🖥️ Backend Go
- API REST para operaciones de archivos y chat AI
- Todas las rutas de archivos relativas a la carpeta seleccionada (enviada por el frontend)
- Modularidad: cada proveedor AI es un servicio en `src-tauri/backend/services/`
- Logs detallados para debug

## Cómo usar

1. **Inicia el backend:**
   ```bash
   cd src-tauri/backend
   go run main.go
   ```
2. **Inicia el frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Abre en el navegador:**
   http://localhost:5173
4. **Selecciona la carpeta de tu proyecto** al abrir la app (diálogo nativo)
5. ¡Listo! Ya puedes explorar, editar y chatear con IA sobre tu código.

## Endpoints principales

### POST /files
- Operaciones: `read`, `write`, `create`, `delete`, `rename`, `list`
- Body ejemplo:
  ```json
  {
    "operation": "read",
    "path": "src/main.js",
    "projectBaseDir": "C:/Users/usuario/MiProyecto"
  }
  ```

### POST /chat
- Body ejemplo:
  ```json
  {
    "message": "¿Qué hace esta función?",
    "model": "gpt-4o",
    "provider": "OpenAI",
    "api_key": "sk-..."
  }
  ```

## Problemas/Fallos conocidos

- [ ] **No funciona en navegadores que no soportan `showDirectoryPicker`** (solo Chrome, Edge, Tauri)
- [ ] **No hay integración Git ni depuración** (planeado)
- [ ] **No hay sistema de extensiones**
- [ ] **No hay colaboración en tiempo real**
- [ ] **El backend solo soporta rutas relativas a la carpeta seleccionada; si el usuario mueve archivos fuera de esa carpeta, no se pueden abrir**
- [ ] **No hay sandboxing: cuidado con archivos peligrosos**
- [ ] **El backend no valida rutas fuera del projectBaseDir (mejorar seguridad)**
- [ ] **No hay tests automatizados**
- [ ] **El listado de directorios (`listFiles`, `listDirectoryContents`) no respeta el projectBaseDir y puede mostrar rutas incorrectas o fallar si la carpeta base no es la raíz del backend.**

## Estructura del proyecto

```
AirIde/
├── frontend/           # Frontend (Monaco, UI, lógica)
│   ├── src/
│   ├── main.js
│   └── style.css
├── src-tauri/
│   └── backend/       # Backend Go
│       ├── main.go
│       └── services/  # Servicios AI
└── README.md
```

## Licencia
MIT

---

**AirIde** © 2025