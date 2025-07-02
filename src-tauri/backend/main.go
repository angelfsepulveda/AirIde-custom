package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
    "encoding/json"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "time"
    "bytes"
    "runtime"
    // Importar openai.go desde services
    . "backend/services"
)

// Define project root for all file operations
var projectRoot = ""


type ChatMessage struct {
    Role    string `json:"role"`
    Content string `json:"content"`
    Timestamp time.Time `json:"timestamp"`
}

type ChatRequest struct {
    Message  string `json:"message"`
    Context  string `json:"context,omitempty"`
    Model    string `json:"model,omitempty"`
    Provider string `json:"provider,omitempty"`
    ApiKey   string `json:"api_key,omitempty"`
    Stream   bool   `json:"stream,omitempty"`
}

type ChatResponse struct {
    Response string `json:"response"`
    Timestamp time.Time `json:"timestamp"`
}

type FileOperation struct {
    Operation      string `json:"operation"`
    Path           string `json:"path"`
    Content        string `json:"content,omitempty"`
    NewPath        string `json:"newPath,omitempty"`
    ProjectBaseDir string `json:"projectBaseDir,omitempty"`
}
// Variable global temporal para pasar el projectBaseDir entre handler y función
var currentFileOpProjectBaseDir = ""

type FileResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
    Content string `json:"content,omitempty"`
    Files   []FileInfo `json:"files,omitempty"`
}

type FileInfo struct {
    Name     string `json:"name"`
    Path     string `json:"path"`
    IsDir    bool   `json:"isDir"`
    Size     int64  `json:"size"`
    Modified time.Time `json:"modified"`
}

type TerminalRequest struct {
    Command string `json:"command"`
    WorkingDir string `json:"workingDir,omitempty"`
}

type TerminalResponse struct {
    Success bool   `json:"success"`
    Output  string `json:"output"`
    Error   string `json:"error,omitempty"`
    Message string `json:"message,omitempty"`
}

var openaiClient OpenAIClient

func enableCORS(w http.ResponseWriter) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
    enableCORS(w)
    w.WriteHeader(http.StatusOK)
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
    enableCORS(w)
    fmt.Println("[BACK] /chat endpoint hit")
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    var req ChatRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        fmt.Println("[BACK] Error decoding request:", err)
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    fmt.Printf("[BACK] ChatRequest: %+v\n", req)
    // Selección de modelo por provider y nombre
    var response string
    var err error
    switch req.Provider {
    case "OpenAI":
        if req.ApiKey == "" {
            http.Error(w, "OpenAI API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "gpt-3.5-turbo"
        }
        client := NewOpenAIClient(req.ApiKey, model)
        messages := []OpenAIMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    case "Anthropic":
        if req.ApiKey == "" {
            http.Error(w, "Claude API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "claude-sonnet-4-20250514"
        }
        version := "2023-06-01"
        client := NewClaudeClient(req.ApiKey, model, version)
        messages := []ClaudeMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    case "DeepSeek":
        if req.ApiKey == "" {
            http.Error(w, "DeepSeek API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "deepseek-chat"
        }
        client := NewDeepSeekClient(req.ApiKey, model)
        messages := []DeepSeekMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    case "DeepSeekOpenRoute":
        if req.ApiKey == "" {
            http.Error(w, "DeepSeekOpenRoute API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "deepseek/deepseek-chat-v3-0324:free"
        }
        client := NewDeepSeekOpenRouteClient(req.ApiKey, model)
        messages := []DeepSeekOpenRouteMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    case "Qwen3_32BOpenRoute":
        if req.ApiKey == "" {
            http.Error(w, "Qwen3_32BOpenRoute API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "qwen/qwen3-32b:free"
        }
        client := NewQwen3_32BOpenRouteClient(req.ApiKey, model)
        messages := []Qwen3_32BOpenRouteMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    case "MistralNemoOpenRoute":
        if req.ApiKey == "" {
            http.Error(w, "MistralNemoOpenRoute API key not provided.", http.StatusUnauthorized)
            return
        }
        model := req.Model
        if model == "" {
            model = "mistralai/mistral-nemo:free"
        }
        client := NewMistralNemoOpenRouteClient(req.ApiKey, model)
        messages := []MistralNemoOpenRouteMessage{{Role: "user", Content: req.Message}}
        response, err = client.ChatCompletion(messages)
    default:
        http.Error(w, "Unsupported or missing provider.", http.StatusBadRequest)
        return
    }
    if err != nil {
        http.Error(w, req.Provider+" error: "+err.Error(), http.StatusInternalServerError)
        return
    }
    chatResponse := ChatResponse{
        Response:  response,
        Timestamp: time.Now(),
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(chatResponse)
}

func generateAIResponse(message, context string) string {
    message = strings.ToLower(message)
    
    if strings.Contains(message, "hello") || strings.Contains(message, "hi") {
        return "Hello! I'm your AI coding assistant. How can I help you with your code today?"
    }
    
    if strings.Contains(message, "function") || strings.Contains(message, "func") {
        return "I can help you with functions! Here's a simple example:\n\n```javascript\nfunction example(param) {\n  return param * 2;\n}\n```\n\nWhat specific function would you like to create?"
    }
    
    if strings.Contains(message, "error") || strings.Contains(message, "bug") {
        return "I can help you debug your code! Please share the error message or describe what's not working, and I'll help you fix it."
    }
    
    if strings.Contains(message, "explain") || strings.Contains(message, "what") {
        return "I'd be happy to explain that! Could you provide more context about what you'd like me to explain?"
    }
    
    return "I understand you're asking about: " + message + "\n\nI'm here to help with your coding tasks. You can ask me to:\n- Explain code\n- Help debug issues\n- Suggest improvements\n- Generate code examples\n- Answer programming questions\n\nWhat would you like to work on?"
}

func fileHandler(w http.ResponseWriter, r *http.Request) {
    enableCORS(w)
    fmt.Println("[BACK] /files endpoint hit")
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    var req FileOperation
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        fmt.Println("[BACK] Error decoding file request:", err)
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    fmt.Printf("[BACK] FileOperation: %+v\n", req)
    // Guardar el projectBaseDir para la operación actual
    currentFileOpProjectBaseDir = req.ProjectBaseDir
    var resp FileResponse
    switch req.Operation {
    case "read":
        resp = readFile(req.Path)
    case "write":
        resp = writeFile(req.Path, req.Content)
    case "create":
        resp = createFile(req.Path, req.Content)
    case "delete":
        resp = deleteFile(req.Path)
    case "rename":
        resp = renameFile(req.Path, req.NewPath)
    case "list":
        resp = listFiles(req.Path)
    default:
        resp = FileResponse{
            Success: false,
            Message: "Unknown file operation: " + req.Operation,
        }
    }
    // Limpiar la variable global después de la operación
    currentFileOpProjectBaseDir = ""
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func readFile(path string) FileResponse {
    fmt.Printf("[BACK] readFile called with path: '%s'\n", path)
    // Si el path es relativo, unirlo al projectBaseDir si está presente, si no al projectRoot
    if !filepath.IsAbs(path) {
        if currentFileOpProjectBaseDir != "" {
            path = filepath.Join(currentFileOpProjectBaseDir, path)
            fmt.Printf("[BACK] Resolved absolute path: '%s' (projectBaseDir: '%s')\n", path, currentFileOpProjectBaseDir)
        } else {
            path = filepath.Join(projectRoot, path)
            fmt.Printf("[BACK] Resolved absolute path: '%s' (projectRoot: '%s')\n", path, projectRoot)
        }
    }
    // Verificar si el archivo existe
    if _, err := os.Stat(path); os.IsNotExist(err) {
        fmt.Printf("[BACK] File does not exist: '%s'\n", path)
        return FileResponse{
            Success: false,
            Message: "File does not exist: " + path,
        }
    }
    content, err := ioutil.ReadFile(path)
    if err != nil {
        fmt.Printf("[BACK] Error reading file: %v\n", err)
        return FileResponse{
            Success: false,
            Message: "Error reading file: " + err.Error(),
        }
    }
    preview := string(content)
    if len(preview) > 80 {
        preview = preview[:80] + "..."
    }
    fmt.Printf("[BACK] Successfully read file: '%s', content length: %d, preview: '%s'\n", path, len(content), preview)
    return FileResponse{
        Success: true,
        Message: "File read successfully",
        Content: string(content),
    }
}

func writeFile(path string, content string) FileResponse {
    fmt.Printf("writeFile called with path: %s, content length: %d\n", path, len(content))
    
    // Si el path es relativo, unirlo al projectRoot
    if !filepath.IsAbs(path) {
        path = filepath.Join(projectRoot, path)
        fmt.Printf("[BACK] Resolved absolute path: '%s' (projectRoot: '%s')\n", path, projectRoot)
    }
    
    // Crear el directorio si no existe
    dir := filepath.Dir(path)
    if err := os.MkdirAll(dir, 0755); err != nil {
        fmt.Printf("Error creating directory: %v\n", err)
        return FileResponse{
            Success: false,
            Message: "Error creating directory: " + err.Error(),
        }
    }
    
    err := ioutil.WriteFile(path, []byte(content), 0644)
    if err != nil {
        return FileResponse{
            Success: false,
            Message: "Error writing file: " + err.Error(),
        }
    }
    
    return FileResponse{
        Success: true,
        Message: "File saved successfully",
    }
}

func listFiles(dirPath string) FileResponse {
    if dirPath == "" {
        // Cambiar al directorio raíz del proyecto
        dirPath = "./"
    }
    
    // Obtener el directorio absoluto
    absPath, err := filepath.Abs(dirPath)
    if err != nil {
        return FileResponse{
            Success: false,
            Message: "Error resolving path: " + err.Error(),
        }
    }
    
    files, err := ioutil.ReadDir(absPath)
    if err != nil {
        return FileResponse{
            Success: false,
            Message: "Error reading directory: " + err.Error(),
        }
    }
    
    var fileInfos []FileInfo
    for _, file := range files {
        // Filtrar archivos y directorios del sistema
        if strings.HasPrefix(file.Name(), ".") && file.Name() != "." && file.Name() != ".." {
            continue
        }
        
        // Calcular la ruta relativa desde el directorio raíz del proyecto
        relativePath, err := filepath.Rel("./", filepath.Join(absPath, file.Name()))
        if err != nil {
            relativePath = file.Name()
        }
        
        fileInfos = append(fileInfos, FileInfo{
            Name:     file.Name(),
            Path:     relativePath,
            IsDir:    file.IsDir(),
            Size:     file.Size(),
            Modified: file.ModTime(),
        })
    }
    
    return FileResponse{
        Success: true,
        Message: "Files listed successfully",
        Files:   fileInfos,
    }
}

func listDirectoryContents(dirPath string) FileResponse {
    // Si el path es relativo, convertirlo a absoluto desde el directorio raíz del proyecto
    if !filepath.IsAbs(dirPath) {
        absPath, err := filepath.Abs(dirPath)
        if err != nil {
            return FileResponse{
                Success: false,
                Message: "Error resolving path: " + err.Error(),
            }
        }
        dirPath = absPath
    }
    
    files, err := ioutil.ReadDir(dirPath)
    if err != nil {
        return FileResponse{
            Success: false,
            Message: "Error reading directory: " + err.Error(),
        }
    }
    
    var fileInfos []FileInfo
    for _, file := range files {
        // Filtrar archivos y directorios del sistema
        if strings.HasPrefix(file.Name(), ".") && file.Name() != "." && file.Name() != ".." {
            continue
        }
        
        // Calcular la ruta relativa desde el directorio raíz del proyecto
        relativePath, err := filepath.Rel("./", filepath.Join(dirPath, file.Name()))
        if err != nil {
            relativePath = file.Name()
        }
        
        fileInfos = append(fileInfos, FileInfo{
            Name:     file.Name(),
            Path:     relativePath,
            IsDir:    file.IsDir(),
            Size:     file.Size(),
            Modified: file.ModTime(),
        })
    }
    
    return FileResponse{
        Success: true,
        Message: "Directory contents listed successfully",
        Files:   fileInfos,
    }
}

func createFile(path string, content string) FileResponse {
    fmt.Printf("createFile called with path: %s, content length: %d\n", path, len(content))
    
    // Si el path es relativo, unirlo al projectRoot
    if !filepath.IsAbs(path) {
        path = filepath.Join(projectRoot, path)
        fmt.Printf("[BACK] Resolved absolute path: '%s' (projectRoot: '%s')\n", path, projectRoot)
    }
    
    err := ioutil.WriteFile(path, []byte(content), 0644)
    if err != nil {
        fmt.Printf("Error creating file: %v\n", err)
        return FileResponse{
            Success: false,
            Message: "Error creating file: " + err.Error(),
        }
    }
    
    fmt.Printf("Successfully created file: %s\n", path)
    
    return FileResponse{
        Success: true,
        Message: "File created successfully",
    }
}

func deleteFile(path string) FileResponse {
    if !filepath.IsAbs(path) {
        path = filepath.Join(projectRoot, path)
        fmt.Printf("[BACK] Resolved absolute path: '%s' (projectRoot: '%s')\n", path, projectRoot)
    }
    
    err := os.Remove(path)
    if err != nil {
        return FileResponse{
            Success: false,
            Message: "Error deleting file: " + err.Error(),
        }
    }
    
    return FileResponse{
        Success: true,
        Message: "File deleted successfully",
    }
}

func renameFile(oldPath, newPath string) FileResponse {
    fmt.Printf("renameFile called with oldPath: %s, newPath: %s\n", oldPath, newPath)
    
    // Si los paths son relativos, unirlos al projectRoot
    if !filepath.IsAbs(oldPath) {
        oldPath = filepath.Join(projectRoot, oldPath)
        fmt.Printf("[BACK] Resolved old absolute path: '%s' (projectRoot: '%s')\n", oldPath, projectRoot)
    }
    if !filepath.IsAbs(newPath) {
        newPath = filepath.Join(projectRoot, newPath)
        fmt.Printf("[BACK] Resolved new absolute path: '%s' (projectRoot: '%s')\n", newPath, projectRoot)
    }
    
    // Verificar si el archivo original existe
    if _, err := os.Stat(oldPath); os.IsNotExist(err) {
        fmt.Printf("Original file does not exist: %s\n", oldPath)
        return FileResponse{
            Success: false,
            Message: "Original file does not exist: " + oldPath,
        }
    }
    
    err := os.Rename(oldPath, newPath)
    if err != nil {
        fmt.Printf("Error renaming file: %v\n", err)
        return FileResponse{
            Success: false,
            Message: "Error renaming file: " + err.Error(),
        }
    }
    
    fmt.Printf("Successfully renamed file from %s to %s\n", oldPath, newPath)
    
    return FileResponse{
        Success: true,
        Message: "File renamed successfully",
    }
}

func terminalHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Printf("Terminal handler called: %s %s\n", r.Method, r.URL.Path)
    enableCORS(w)
    
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    
    if r.Method != "POST" {
        fmt.Printf("Method not allowed: %s\n", r.Method)
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    var req TerminalRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        fmt.Printf("Error decoding request: %v\n", err)
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    
    fmt.Printf("Terminal request: command='%s', workingDir='%s'\n", req.Command, req.WorkingDir)
    
    response := executeCommand(req.Command, req.WorkingDir)
    
    fmt.Printf("Terminal response: success=%v, output length=%d, error length=%d\n", 
        response.Success, len(response.Output), len(response.Error))
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func executeCommand(command, workingDir string) TerminalResponse {
    fmt.Printf("executeCommand called with command='%s', workingDir='%s'\n", command, workingDir)

    if command == "" {
        fmt.Printf("No command provided\n")
        return TerminalResponse{
            Success: false,
            Message: "No command provided",
        }
    }

    // Determine shell based on OS and command
    var shell string
    var args []string

    if runtime.GOOS == "windows" {
        // Si el comando empieza con 'WSL ', usar bash/WSL
        if strings.HasPrefix(command, "WSL ") {
            shell = "/bin/bash"
            args = []string{"-c", strings.TrimPrefix(command, "WSL ")}
        } else {
            // Siempre usar PowerShell en Windows
            shell = "powershell.exe"
            args = []string{"-Command", command}
        }
    } else {
        shell = "/bin/bash"
        args = []string{"-c", command}
    }

    fmt.Printf("Using shell: %s with args: %v\n", shell, args)

    // Create command
    cmd := exec.Command(shell, args...)

    // Set working directory if provided
    if workingDir != "" {
        cmd.Dir = workingDir
        fmt.Printf("Set working directory to: %s\n", workingDir)
    }

    // Set environment variables to ensure PATH is correct
    env := os.Environ()

    // Add common PATH entries for better command discovery
    if runtime.GOOS == "windows" {
        // For Windows, add common Python and other tool paths
        additionalPaths := []string{
            "C:\\Python39\\Scripts",
            "C:\\Python39",
            "C:\\Python310\\Scripts", 
            "C:\\Python310",
            "C:\\Python311\\Scripts",
            "C:\\Python311",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python39\\Scripts",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python39",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python310\\Scripts",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python310",
        }
        for _, path := range additionalPaths {
            env = append(env, "PATH="+os.Getenv("PATH")+";"+path)
        }
    } else {
        // For Linux/WSL, add common paths
        additionalPaths := []string{
            "/usr/local/bin",
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
            "/home/"+os.Getenv("USER")+"/.local/bin",
            "/home/"+os.Getenv("USER")+"/.pyenv/bin",
        }
        for _, path := range additionalPaths {
            env = append(env, "PATH="+os.Getenv("PATH")+":"+path)
        }
    }
    cmd.Env = env

    // Capture output
    var stdout, stderr bytes.Buffer
    cmd.Stdout = &stdout
    cmd.Stderr = &stderr

    // Execute command
    fmt.Printf("Executing command...\n")
    err := cmd.Run()

    output := stdout.String()
    errorOutput := stderr.String()

    fmt.Printf("Command execution completed. Error: %v\n", err)
    fmt.Printf("Stdout length: %d, Stderr length: %d\n", len(output), len(errorOutput))

    if err != nil {
        fmt.Printf("Command failed: %v\n", err)
        errorMsg := "Command execution failed: " + err.Error()
        if strings.Contains(errorOutput, "command not found") {
            errorMsg += "\n\nCommon solutions:\n"
            if runtime.GOOS == "windows" {
                errorMsg += "- Try 'python3' instead of 'python'\n"
                errorMsg += "- Check if Python is installed and in PATH\n"
                errorMsg += "- Try 'where python' to find Python installation\n"
            } else {
                errorMsg += "- Try 'python3' instead of 'python'\n"
                errorMsg += "- Check if Python is installed: 'which python3'\n"
                errorMsg += "- Install Python: 'sudo apt install python3'\n"
            }
        }
        return TerminalResponse{
            Success: false,
            Output:  output,
            Error:   errorOutput,
            Message: errorMsg,
        }
    }

    fmt.Printf("Command succeeded\n")
    return TerminalResponse{
        Success: true,
        Output:  output,
        Error:   errorOutput,
    }
}

func main() {
    // Set projectRoot to the parent of the backend directory (i.e., the workspace root)
    wd, err := os.Getwd()
    if err != nil {
        panic("Cannot get working directory: " + err.Error())
    }
    // If running from src-tauri/backend, set projectRoot to its parent
    projectRoot = filepath.Dir(wd)
    fmt.Printf("[BACK] Project root set to: %s\n", projectRoot)
    // Inicializar cliente OpenAI si hay API key
    apiKey := os.Getenv("OPENAI_API_KEY")
    if apiKey != "" {
        openaiClient = NewOpenAIClient(apiKey, "gpt-3.5-turbo")
        fmt.Println("OpenAI client enabled.")
    } else {
        fmt.Println("OpenAI client not enabled. Set OPENAI_API_KEY env var to enable.")
    }

    http.HandleFunc("/chat", chatHandler)
    http.HandleFunc("/files", fileHandler)
    http.HandleFunc("/terminal", terminalHandler)
    http.HandleFunc("/", handleOptions)

    // Endpoint para listar archivos
    http.HandleFunc("/api/files", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        if r.Method == "GET" {
            dirPath := r.URL.Query().Get("dir")
            response := listFiles(dirPath)
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(response)
        }
    })

    // Endpoint para listar contenido de un directorio específico
    http.HandleFunc("/api/directory", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        if r.Method == "GET" {
            dirPath := r.URL.Query().Get("path")
            response := listDirectoryContents(dirPath)
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(response)
        }
    })

    // Add new endpoint to check available commands
    http.HandleFunc("/api/check-command", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != "POST" {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            Command string `json:"command"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        // Check if command exists
        var shell string
        var args []string

        if runtime.GOOS == "windows" {
            if _, err := os.Stat("/proc/version"); err == nil {
                shell = "/bin/bash"
                args = []string{"-c", "which " + req.Command + " || where " + req.Command}
            } else {
                shell = "powershell.exe"
                args = []string{"-Command", "Get-Command " + req.Command + " -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source"}
            }
        } else {
            shell = "/bin/bash"
            args = []string{"-c", "which " + req.Command}
        }

        cmd := exec.Command(shell, args...)
        output, err := cmd.Output()

        response := map[string]interface{}{
            "command": req.Command,
            "exists":  err == nil,
            "path":    strings.TrimSpace(string(output)),
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    })

    fmt.Println("AirIde Backend Server listening on http://localhost:8080")
    fmt.Println("Available endpoints:")
    fmt.Println("  POST /chat - AI chat functionality")
    fmt.Println("  POST /files - File operations")
    fmt.Println("  POST /terminal - Terminal command execution")

    err = http.ListenAndServe(":8080", nil)
    if err != nil {
        panic(err)
    }
}
