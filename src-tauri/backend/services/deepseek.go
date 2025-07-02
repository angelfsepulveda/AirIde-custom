package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// DeepSeekClient define la interfaz para interactuar con DeepSeek
// Facilita el mocking y el testing (SOLID: Dependency Inversion)
type DeepSeekClient interface {
	ChatCompletion(messages []DeepSeekMessage) (string, error)
}

// deepSeekClient implementa DeepSeekClient
// La clave API se inyecta por composición (SOLID: Single Responsibility)
type deepSeekClient struct {
	apiKey string
	model  string
}

// DeepSeekMessage representa un mensaje para la API de DeepSeek
type DeepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// deepSeekChatRequest es el payload para la API de chat completions
type deepSeekChatRequest struct {
	Model    string            `json:"model"`
	Messages []DeepSeekMessage `json:"messages"`
	Stream   bool              `json:"stream"`
}

// deepSeekChatResponse es la respuesta de la API de chat completions
type deepSeekChatResponse struct {
	Choices []struct {
		Message DeepSeekMessage `json:"message"`
	} `json:"choices"`
}

// NewDeepSeekClient crea una nueva instancia de deepSeekClient
func NewDeepSeekClient(apiKey, model string) DeepSeekClient {
	return &deepSeekClient{apiKey: apiKey, model: model}
}

// ChatCompletion envía mensajes a la API de DeepSeek y retorna la respuesta
func (c *deepSeekClient) ChatCompletion(messages []DeepSeekMessage) (string, error) {
	url := "https://api.deepseek.com/chat/completions"
	payload := deepSeekChatRequest{
		Model:    c.model,
		Messages: messages,
		Stream:   false,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := ioutil.ReadAll(resp.Body)
		return "", fmt.Errorf("DeepSeek API error: %s", string(b))
	}

	var deepseekResp deepSeekChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&deepseekResp); err != nil {
		return "", err
	}
	if len(deepseekResp.Choices) == 0 {
		return "", fmt.Errorf("No response from DeepSeek")
	}
	return deepseekResp.Choices[0].Message.Content, nil
} 