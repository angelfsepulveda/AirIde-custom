// Function to check if a command is available
async function checkCommand(command) {
    try {
        const response = await fetch('http://localhost:8080/api/check-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: command })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result;
        }
    } catch (error) {
        console.error('Error checking command:', error);
    }
    return { exists: false, path: '' };
}

// Function to suggest alternative commands
function suggestAlternatives(command) {
    const suggestions = {
        'python': ['python3', 'py', 'python.exe'],
        'python3': ['python', 'py', 'python.exe'],
        'node': ['nodejs', 'node.exe'],
        'npm': ['npm.cmd'],
        'git': ['git.exe'],
        'gcc': ['gcc.exe', 'clang'],
        'g++': ['g++.exe', 'clang++'],
    };
    
    return suggestions[command] || [];
}

import { initializeFileExplorer } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeFileExplorer();
});

async function executeTerminalCommand(command) {
    if (!command.trim()) return;
    
    // Add command to history
    if (!commandHistory.includes(command)) {
        commandHistory.push(command);
        commandHistoryIndex = commandHistory.length;
    }
    
    // Display command in terminal
    const terminalOutput = document.getElementById('terminal-output');
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-command';
    commandLine.innerHTML = `<span class="terminal-prompt">$</span> ${command}`;
    terminalOutput.appendChild(commandLine);
    
    // Clear input
    document.getElementById('terminal-input').value = '';
    
    try {
        const response = await fetch('http://localhost:8080/api/execute-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                workingDir: currentWorkingDir
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            const outputLine = document.createElement('div');
            outputLine.className = 'terminal-output-line';
            
            if (result.success) {
                if (result.output) {
                    outputLine.textContent = result.output;
                }
            } else {
                outputLine.className = 'terminal-error';
                outputLine.textContent = result.message || 'Command failed';
                
                // If command not found, check for alternatives
                if (result.error && result.error.includes('command not found')) {
                    const baseCommand = command.split(' ')[0];
                    const alternatives = suggestAlternatives(baseCommand);
                    
                    if (alternatives.length > 0) {
                        const suggestionLine = document.createElement('div');
                        suggestionLine.className = 'terminal-suggestion';
                        suggestionLine.innerHTML = `
                            <strong>Suggestions:</strong> Try one of these commands instead:
                            <br>${alternatives.map(cmd => `<code>${cmd}</code>`).join(' ')}
                        `;
                        terminalOutput.appendChild(suggestionLine);
                    }
                    
                    // Check if command exists with different name
                    const checkResult = await checkCommand(baseCommand);
                    if (!checkResult.exists) {
                        const checkLine = document.createElement('div');
                        checkLine.className = 'terminal-info';
                        checkLine.innerHTML = `
                            <strong>Command not found:</strong> '${baseCommand}' is not available in the current PATH.
                            <br>You can try:
                            <br>- <code>which ${baseCommand}</code> or <code>where ${baseCommand}</code> to find it
                            <br>- <code>echo $PATH</code> to see current PATH
                        `;
                        terminalOutput.appendChild(checkLine);
                    }
                }
            }
            
            terminalOutput.appendChild(outputLine);
        } else {
            const errorLine = document.createElement('div');
            errorLine.className = 'terminal-error';
            errorLine.textContent = 'Failed to execute command';
            terminalOutput.appendChild(errorLine);
        }
    } catch (error) {
        console.error('Error executing command:', error);
        const errorLine = document.createElement('div');
        errorLine.className = 'terminal-error';
        errorLine.textContent = 'Error connecting to backend server';
        terminalOutput.appendChild(errorLine);
    }
    
    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}
