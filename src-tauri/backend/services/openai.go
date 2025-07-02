package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// OpenAIClient define la interfaz para interactuar con OpenAI
// Facilita el mocking y el testing (SOLID: Dependency Inversion)
type OpenAIClient interface {
	ChatCompletion(messages []OpenAIMessage) (string, error)
}

// openAIClient implementa OpenAIClient
// La clave API se inyecta por composición (SOLID: Single Responsibility)
type openAIClient struct {
	apiKey string
	model  string
}

// OpenAIMessage representa un mensaje para la API de OpenAI
type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openAIChatRequest es el payload para la API de chat completions
type openAIChatRequest struct {
	Model    string         `json:"model"`
	Messages []OpenAIMessage `json:"messages"`
}

// openAIChatResponse es la respuesta de la API de chat completions
type openAIChatResponse struct {
	Choices []struct {
		Message OpenAIMessage `json:"message"`
	} `json:"choices"`
}

// NewOpenAIClient crea una nueva instancia de openAIClient
func NewOpenAIClient(apiKey, model string) OpenAIClient {
	return &openAIClient{apiKey: apiKey, model: model}
}

// ChatCompletion envía mensajes a la API de OpenAI y retorna la respuesta
func (c *openAIClient) ChatCompletion(messages []OpenAIMessage) (string, error) {
	url := "https://api.openai.com/v1/chat/completions"
	payload := openAIChatRequest{
		Model:    c.model,
		Messages: messages,
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
		return "", fmt.Errorf("OpenAI API error: %s", string(b))
	}

	var openaiResp openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return "", err
	}
	if len(openaiResp.Choices) == 0 {
		return "", fmt.Errorf("No response from OpenAI")
	}
	return openaiResp.Choices[0].Message.Content, nil
} 