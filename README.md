# AirIde

Modern desktop IDE with AI integration, file explorer, multi-model chat, and Go backend.

## Main Features

### 🗂️ File Explorer & Management
- Project folder selection at startup (using `showDirectoryPicker`)
- Tree navigation of files and folders
- Open, create, rename, delete, and save files
- All file operations are always relative to the selected folder
- File type icons
- Auto-save and visual feedback

### 🧠 AI Integration (Chat & Help)
- Contextual AI chat integrated in the UI
- Support for multiple providers/models:
  - OpenAI (GPT-3.5, GPT-4, GPT-4o)
  - Anthropic (Claude 3)
  - DeepSeek, DeepSeekOpenRoute
  - Qwen3_32BOpenRoute
  - MistralNemoOpenRoute
- Visual model/API Key configuration (modern modal)
- Switch model/provider at any time
- AI can see the open code and answer about it
- Toast notifications for feedback

### 📝 Code Editor
- Based on Monaco Editor (VS Code)
- Automatic language detection by extension
- Supports: JS, TS, Python, Go, Rust, HTML, CSS, JSON, YAML, Markdown, and more
- Autocomplete, syntax highlighting, real-time errors
- Shortcuts: Ctrl+S (save), Ctrl+N (new), Ctrl+O (open), etc.

### 🖥️ Go Backend
- REST API for file operations and AI chat
- All file paths are relative to the selected folder (sent from frontend)
- Modular: each AI provider is a service in `src-tauri/backend/services/`
- Detailed logs for debugging

## How to Use

1. **Start the backend:**
   ```bash
   cd src-tauri/backend
   go run main.go
   ```
2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Open in your browser:**
   http://localhost:5173
4. **Select your project folder** when prompted (native dialog)
5. Done! You can now explore, edit, and chat with AI about your code.

## Main Endpoints

### POST /files
- Operations: `read`, `write`, `create`, `delete`, `rename`, `list`
- Example body:
  ```json
  {
    "operation": "read",
    "path": "src/main.js",
    "projectBaseDir": "C:/Users/youruser/MyProject"
  }
  ```

### POST /chat
- Example body:
  ```json
  {
    "message": "What does this function do?",
    "model": "gpt-4o",
    "provider": "OpenAI",
    "api_key": "sk-..."
  }
  ```

## Known Issues / Limitations

- [ ] **Does not work in browsers that do not support `showDirectoryPicker`** (only Chrome, Edge, Tauri)
- [ ] **No Git integration or debugging** (planned)
- [ ] **No extension system**
- [ ] **No real-time collaboration**
- [ ] **Backend only supports paths relative to the selected folder; if you move files outside, you can't open them**
- [ ] **No sandboxing: be careful with dangerous files**
- [ ] **Backend does not validate paths outside projectBaseDir (security improvement needed)**
- [ ] **No automated tests**
- [ ] **Directory listing (`listFiles`, `listDirectoryContents`) does not respect projectBaseDir and may show incorrect paths or fail if the base folder is not the backend root.**

## Project Structure

```
AirIde/
├── frontend/           # Frontend (Monaco, UI, logic)
│   ├── src/
│   ├── main.js
│   └── style.css
├── src-tauri/
│   └── backend/       # Go Backend
│       ├── main.go
│       └── services/  # AI Services
└── README.md
```

## License
MIT

---

**AirIde** © 2025

---

> **This project was created 100% by AI, with no human intervention.**