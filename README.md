# AirIde - AI-Powered IDE

A modern, AI-enhanced integrated development environment built with Tauri, React, and Monaco Editor.

## Features

### 🤖 AI Integration
- **Real-time AI Chat**: Communicate with an AI assistant directly in the IDE
- **Multiple AI Providers**: Easily switch between OpenAI, Claude, DeepSeek, Gemini, Qwen, Mistral and more
- **Code Context Awareness**: AI can see and understand your current code
- **Smart Suggestions**: Get AI-powered code suggestions and explanations
- **Thinking State**: Visual feedback when AI is processing your request

### 📁 File Management
- **File Explorer**: Browse and manage files in a tree-like structure
- **File Operations**: Create, open, save, rename, and delete files
- **Auto-save**: Automatic saving of changes with visual feedback
- **File Icons**: Visual file type indicators for different programming languages

### 🎨 Multi-Language Support
- **Syntax Highlighting**: Support for 20+ programming languages
- **Language Detection**: Automatic language detection based on file extension
- **Monaco Editor**: Full-featured code editor with IntelliSense
- **Supported Languages**: JavaScript, TypeScript, Python, Java, C++, Go, Rust, PHP, Ruby, SQL, HTML, CSS, JSON, YAML, Markdown, and more

### 🔧 Editor Features
- **AI Code Assistant**: Button to ask AI about selected code or entire file
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + S`: Save current file
  - `Ctrl/Cmd + N`: Create new file
  - `Ctrl/Cmd + O`: Open file (placeholder)
- **Auto-completion**: Intelligent code suggestions
- **Error Detection**: Real-time syntax and error checking
- **Code Formatting**: Automatic code formatting on paste and type

### 🎯 User Experience
- **Modern UI**: Clean, dark theme with professional appearance
- **Responsive Design**: Adapts to different screen sizes
- **Status Indicators**: Visual feedback for save operations and errors
- **Smooth Animations**: Polished interactions and transitions

## Architecture

### Frontend
- **Monaco Editor**: Microsoft's VS Code editor component
- **Vanilla JavaScript**: No framework dependencies for maximum performance
- **CSS3**: Modern styling with flexbox and CSS Grid
- **Web Workers**: Background processing for language services
- **AI Model Configuration**: Select and configure API keys for multiple providers from the UI

### Backend
- **Go**: High-performance backend server
- **RESTful API**: Clean API design for file operations and AI chat
- **CORS Support**: Cross-origin resource sharing enabled
- **File System Operations**: Safe file handling with error management
- **Modular AI Services**: Each AI provider is implemented as a separate service in `src-tauri/backend/services` following SOLID and DRY principles

#### Supported AI Providers/Models
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3, Claude 2
- **DeepSeek**: DeepSeek V3 0324
- **DeepSeekOpenRoute**: DeepSeek V3 0324 via OpenRouter
- **Qwen3-32BOpenRoute**: Qwen 32B via OpenRouter
- **MistralNemoOpenRoute**: Mistral Nemo via OpenRouter
- **Gemini**: Gemini 2.5 Flash

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Go 1.19+
- Tauri CLI (optional, for desktop app)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AirIde
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the backend server**
   ```bash
   cd ../src-tauri/backend
   go run main.go
   ```

4. **Start the frontend development server**
   ```bash
   cd ../../frontend
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:5173`

### API Endpoints

#### Chat API
- `POST /chat` - Send a message to the AI assistant
  ```json
  {
    "message": "Your question here",
    "context": "Optional code context",
    "model": "gpt-4", // or any supported model
    "provider": "OpenAI", // or Anthropic, DeepSeek, DeepSeekOpenRoute, Qwen3_32BOpenRoute, MistralNemoOpenRoute, Gemini
    "api_key": "YOUR_API_KEY"
  }
  ```
  - The backend will route the request to the correct AI service based on `provider` and `model`.
  - If no model or provider is specified, sensible defaults are used for each provider.

#### File Operations API
- `POST /files` - Perform file operations
  ```json
  {
    "operation": "read|write|list|create|delete|rename",
    "path": "file/path",
    "content": "file content (for write/create)",
    "newPath": "new path (for rename)"
  }
  ```

## Usage

### Basic Workflow

1. **Create a new file**: Click the "+" button in the file explorer
2. **Start coding**: The editor will automatically detect the language
3. **Ask AI for help**: Use the chat panel and select/configure your preferred AI model
4. **Save your work**: Files auto-save, or use Ctrl+S

### AI Assistant

The AI assistant can help you with:
- Code explanations and documentation
- Bug fixing and debugging
- Code optimization suggestions
- Best practices and patterns
- Learning new programming concepts

#### Configuring AI Models
- Go to the "Configure Models" option in the menu (or use `Ctrl+Shift+I`)
- Select your preferred model and enter your API key
- Supported providers: OpenAI, Anthropic, DeepSeek, DeepSeekOpenRoute, Qwen3-32BOpenRoute, MistralNemoOpenRoute, Gemini
- You can switch models at any time

#### Adding New AI Providers (Backend)
- Add a new service file in `src-tauri/backend/services/` following the SOLID/DRY pattern (see existing services for examples)
- Update the handler in `main.go` to route requests to your new service based on `provider`
- Update the frontend model list if you want it selectable from the UI

### File Management

- **Open files**: Click on any file in the explorer
- **Create files**: Use the "+" button or Ctrl+N
- **Delete files**: Hover over a file and click the trash icon
- **Rename files**: Right-click and select rename

## Development

### Project Structure
```
AirIde/
├── frontend/           # Frontend application
│   ├── src/
│   ├── main.js        # Main application logic
│   └── style.css      # Styles
├── src-tauri/
│   └── backend/       # Go backend server
│       ├── main.go    # Server implementation
│       └── services/  # Modular AI service implementations
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Future Enhancements

- [ ] Git integration
- [ ] Debugger support
- [ ] Extensions system
- [ ] Cloud sync
- [ ] Collaborative editing
- [ ] Advanced AI features (code generation, refactoring)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Monaco Editor by Microsoft
- Tauri framework
- Space Grotesk and Noto Sans fonts by Google Fonts 