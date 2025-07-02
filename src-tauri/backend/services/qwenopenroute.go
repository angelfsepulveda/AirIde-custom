package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// Qwen3_32BOpenRouteClient define la interfaz para interactuar con Qwen vía OpenRouter
type Qwen3_32BOpenRouteClient interface {
	ChatCompletion(messages []Qwen3_32BOpenRouteMessage) (string, error)
}

type qwen3_32bOpenRouteClient struct {
	apiKey string
	model  string
}

type Qwen3_32BOpenRouteMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type qwen3_32bOpenRouteChatRequest struct {
	Model    string                      `json:"model"`
	Messages []Qwen3_32BOpenRouteMessage `json:"messages"`
	Stream   bool                        `json:"stream"`
}

type qwen3_32bOpenRouteChatResponse struct {
	Choices []struct {
		Message Qwen3_32BOpenRouteMessage `json:"message"`
	} `json:"choices"`
}

func NewQwen3_32BOpenRouteClient(apiKey, model string) Qwen3_32BOpenRouteClient {
	return &qwen3_32bOpenRouteClient{apiKey: apiKey, model: model}
}

func (c *qwen3_32bOpenRouteClient) ChatCompletion(messages []Qwen3_32BOpenRouteMessage) (string, error) {
	url := "https://openrouter.ai/api/v1/chat/completions"
	payload := qwen3_32bOpenRouteChatRequest{
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
		return "", fmt.Errorf("Qwen3_32BOpenRoute API error: %s", string(b))
	}

	var respData qwen3_32bOpenRouteChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&respData); err != nil {
		return "", err
	}
	if len(respData.Choices) == 0 {
		return "", fmt.Errorf("No response from Qwen3_32BOpenRoute")
	}
	return respData.Choices[0].Message.Content, nil
} 