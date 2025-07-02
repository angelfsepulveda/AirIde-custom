package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

// DeepSeekOpenRouteClient define la interfaz para interactuar con DeepSeek vía OpenRouter
type DeepSeekOpenRouteClient interface {
	ChatCompletion(messages []DeepSeekOpenRouteMessage) (string, error)
}

type deepSeekOpenRouteClient struct {
	apiKey string
	model  string
}

type DeepSeekOpenRouteMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type deepSeekOpenRouteChatRequest struct {
	Model    string                     `json:"model"`
	Messages []DeepSeekOpenRouteMessage `json:"messages"`
}

type deepSeekOpenRouteChatResponse struct {
	Choices []struct {
		Message DeepSeekOpenRouteMessage `json:"message"`
	} `json:"choices"`
}



func NewDeepSeekOpenRouteClient(apiKey, model string) DeepSeekOpenRouteClient {
	return &deepSeekOpenRouteClient{apiKey: apiKey, model: model}
}

func (c *deepSeekOpenRouteClient) ChatCompletion(messages []DeepSeekOpenRouteMessage) (string, error) {
	fmt.Println("[BACK][DeepSeekOpenRoute] ChatCompletion called with messages:", messages)
	url := "https://openrouter.ai/api/v1/chat/completions"
	payload := deepSeekOpenRouteChatRequest{
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
	fmt.Println("[BACK][DeepSeekOpenRoute] POST to OpenRouter with model:", c.model)
	// Forzar respuesta JSON, no SSE
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("[BACK][DeepSeekOpenRoute] HTTP error:", err)
		return "", err
	}
	defer resp.Body.Close()
	fmt.Println("[BACK][DeepSeekOpenRoute] HTTP status:", resp.Status)
	if resp.StatusCode != http.StatusOK {
		b, _ := ioutil.ReadAll(resp.Body)
		fmt.Println("[BACK][DeepSeekOpenRoute] API error body:", string(b))
		return "", fmt.Errorf("DeepSeekOpenRoute API error: %s", string(b))
	}
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var respObj deepSeekOpenRouteChatResponse
	if err := json.Unmarshal(b, &respObj); err != nil {
		fmt.Println("[BACK][DeepSeekOpenRoute] JSON unmarshal error:", err, "for:", string(b))
		return "", err
	}
	var content string
	if len(respObj.Choices) > 0 {
		content = respObj.Choices[0].Message.Content
		fmt.Printf("[BACK][DeepSeekOpenRoute] Extracted content: [%s] (len=%d)\n", content, len(content))
		if len(content) == 0 {
			fmt.Printf("[BACK][DeepSeekOpenRoute] RAW JSON: %s\n", string(b))
		}
	} else {
		fmt.Println("[BACK][DeepSeekOpenRoute] No choices found in response:", string(b))
	}
	fmt.Println("[BACK][DeepSeekOpenRoute] Final content:", content)
	return content, nil
}

