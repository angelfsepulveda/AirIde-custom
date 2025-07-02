package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// MistralNemoOpenRouteClient define la interfaz para interactuar con Mistral Nemo vía OpenRouter
type MistralNemoOpenRouteClient interface {
	ChatCompletion(messages []MistralNemoOpenRouteMessage) (string, error)
}

type mistralNemoOpenRouteClient struct {
	apiKey string
	model  string
}

type MistralNemoOpenRouteMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type mistralNemoOpenRouteChatRequest struct {
	Model    string                        `json:"model"`
	Messages []MistralNemoOpenRouteMessage `json:"messages"`
	Stream   bool                          `json:"stream"`
}

type mistralNemoOpenRouteChatResponse struct {
	Choices []struct {
		Message MistralNemoOpenRouteMessage `json:"message"`
	} `json:"choices"`
}

func NewMistralNemoOpenRouteClient(apiKey, model string) MistralNemoOpenRouteClient {
	return &mistralNemoOpenRouteClient{apiKey: apiKey, model: model}
}

func (c *mistralNemoOpenRouteClient) ChatCompletion(messages []MistralNemoOpenRouteMessage) (string, error) {
	url := "https://openrouter.ai/api/v1/chat/completions"
	payload := mistralNemoOpenRouteChatRequest{
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
		return "", fmt.Errorf("MistralNemoOpenRoute API error: %s", string(b))
	}

	var respData mistralNemoOpenRouteChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&respData); err != nil {
		return "", err
	}
	if len(respData.Choices) == 0 {
		return "", fmt.Errorf("No response from MistralNemoOpenRoute")
	}
	return respData.Choices[0].Message.Content, nil
} 