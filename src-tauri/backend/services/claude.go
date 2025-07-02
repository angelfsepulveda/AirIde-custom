package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// ClaudeClient define la interfaz para interactuar con Claude
// Facilita el mocking y el testing (SOLID: Dependency Inversion)
type ClaudeClient interface {
	ChatCompletion(messages []ClaudeMessage) (string, error)
}

// claudeClient implementa ClaudeClient
// La clave API y el modelo se inyectan por composición (SOLID: Single Responsibility)
type claudeClient struct {
	apiKey   string
	model    string
	version  string
}

// ClaudeMessage representa un mensaje para la API de Claude
type ClaudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// claudeChatRequest es el payload para la API de chat completions
type claudeChatRequest struct {
	Model     string         `json:"model"`
	Messages  []ClaudeMessage `json:"messages"`
	MaxTokens int            `json:"max_tokens"`
}

// claudeChatResponse es la respuesta de la API de chat completions
type claudeChatResponse struct {
	Content string `json:"content"`
}

// NewClaudeClient crea una nueva instancia de claudeClient
func NewClaudeClient(apiKey, model, version string) ClaudeClient {
	return &claudeClient{apiKey: apiKey, model: model, version: version}
}

// ChatCompletion envía mensajes a la API de Claude y retorna la respuesta
func (c *claudeClient) ChatCompletion(messages []ClaudeMessage) (string, error) {
	url := "https://api.anthropic.com/v1/messages"
	payload := claudeChatRequest{
		Model:     c.model,
		Messages:  messages,
		MaxTokens: 1024,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("anthropic-version", c.version)
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := ioutil.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API error: %s", string(b))
	}

	var claudeResp claudeChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return "", err
	}
	return claudeResp.Content, nil
} 