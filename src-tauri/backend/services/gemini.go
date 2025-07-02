package services

import (
	"context"
	"google.golang.org/genai"
)

// GeminiClient define la interfaz para interactuar con Gemini
// Facilita el mocking y el testing (SOLID: Dependency Inversion)
type GeminiClient interface {
	ChatCompletion(prompt string) (string, error)
}

// geminiClient implementa GeminiClient
// La clave API y el modelo se inyectan por composición (SOLID: Single Responsibility)
type geminiClient struct {
	apiKey string
	model  string
}

// NewGeminiClient crea una nueva instancia de geminiClient
func NewGeminiClient(apiKey, model string) GeminiClient {
	return &geminiClient{apiKey: apiKey, model: model}
}

// ChatCompletion envía un prompt a la API de Gemini y retorna la respuesta
func (c *geminiClient) ChatCompletion(prompt string) (string, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  c.apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return "", err
	}
	result, err := client.Models.GenerateContent(
		ctx,
		c.model,
		genai.Text(prompt),
		nil,
	)
	if err != nil {
		return "", err
	}
	return result.Text(), nil
} 