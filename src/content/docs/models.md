---
title: "Models & Providers"
description: "Set up API keys, choose models, configure custom providers like Ollama, OpenAI, and more."
section: "First Steps"
order: 1.5
---

<!-- tldr -->
Set `ANTHROPIC_API_KEY` to start. Use `/model` to switch mid-session. Use `/login` for OAuth providers. Add `models.json` for Ollama, LM Studio, or any OpenAI-compatible server. Soma works with any provider the engine supports — you're not locked to Anthropic.
<!-- /tldr -->

## Quick Start

Soma needs at least one AI provider configured. The fastest path:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
soma
```

That's it. Soma will use Claude as the default model.

## Supported Providers

Soma runs on the Pi engine, which supports **17+ providers** out of the box:

### Subscription-Based (OAuth)

Use `/login` inside a session to authenticate:

| Provider | What You Need |
|----------|--------------|
| **Claude Pro/Max** | Anthropic subscription |
| **ChatGPT Plus/Pro** | OpenAI subscription (Codex) |
| **GitHub Copilot** | Copilot subscription |
| **Google Gemini CLI** | Free Google account |
| **Google Antigravity** | Free Google account (sandbox with Gemini, Claude, GPT) |

### API Key Providers

Set an environment variable or add to `auth.json`:

| Provider | Environment Variable |
|----------|---------------------|
| **Anthropic** | `ANTHROPIC_API_KEY` |
| **OpenAI** | `OPENAI_API_KEY` |
| **Google Gemini** | `GEMINI_API_KEY` |
| **Mistral** | `MISTRAL_API_KEY` |
| **Groq** | `GROQ_API_KEY` |
| **xAI (Grok)** | `XAI_API_KEY` |
| **OpenRouter** | `OPENROUTER_API_KEY` |
| **Hugging Face** | `HF_TOKEN` |
| **Cerebras** | `CEREBRAS_API_KEY` |
| **OpenCode** | `OPENCODE_API_KEY` |

### Cloud Providers

| Provider | Setup |
|----------|-------|
| **Amazon Bedrock** | AWS credentials (`AWS_PROFILE` or IAM keys) |
| **Azure OpenAI** | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` |
| **Google Vertex AI** | `gcloud auth application-default login` + `GOOGLE_CLOUD_PROJECT` |

## Choosing a Model

### During a Session

Press **Ctrl+P** to cycle between available models, or use the `/model` command to open the model selector with fuzzy search.

### From the Command Line

```bash
# Use a specific model
soma --model claude-sonnet-4

# Use provider/model format
soma --model openai/gpt-4o

# Set thinking level
soma --model sonnet:high

# Limit model cycling to specific models
soma --models claude-sonnet,claude-haiku,gpt-4o

# List all available models
soma --list-models

# Search for models
soma --list-models gemini
```

### Set a Default Provider

```bash
soma --provider openai
```

## Storing API Keys

### Option 1: Environment Variables

Add to your shell profile (`~/.zshrc`, `~/.bashrc`):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Option 2: Auth File

Store keys in `~/.soma/agent/auth.json` (created with `0600` permissions — user-only access):

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." }
}
```

The `key` field supports three formats:

| Format | Example | Description |
|--------|---------|-------------|
| **Literal** | `"sk-ant-..."` | Used directly |
| **Env var** | `"MY_API_KEY"` | Reads the named environment variable |
| **Shell command** | `"!security find-generic-password -ws 'anthropic'"` | Executes command, uses stdout |

Shell commands work great with password managers:

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "!op read 'op://vault/anthropic/api-key'"
  }
}
```

### Option 3: OAuth Login

For subscription-based providers, use `/login` inside a session:

```
/login
```

Select your provider, follow the browser flow. Tokens are stored and refresh automatically.

## Custom Providers (Ollama, LM Studio, etc.)

Add any OpenAI-compatible provider via `~/.soma/agent/models.json`:

### Ollama

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

### LM Studio

```json
{
  "providers": {
    "lm-studio": {
      "baseUrl": "http://localhost:1234/v1",
      "api": "openai-completions",
      "apiKey": "lm-studio",
      "models": [
        { "id": "your-loaded-model" }
      ]
    }
  }
}
```

### OpenRouter (Access 100+ Models)

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "anthropic/claude-sonnet-4",
          "name": "Claude Sonnet 4 (OpenRouter)"
        }
      ]
    }
  }
}
```

### Custom API Proxy

```json
{
  "providers": {
    "my-proxy": {
      "baseUrl": "https://proxy.example.com/v1",
      "api": "anthropic-messages",
      "apiKey": "MY_PROXY_KEY",
      "headers": {
        "x-custom-header": "value"
      },
      "models": [
        {
          "id": "claude-sonnet-4",
          "name": "Claude via My Proxy"
        }
      ]
    }
  }
}
```

### Supported APIs

| API Type | Use For |
|----------|---------|
| `openai-completions` | Ollama, LM Studio, vLLM, most local servers |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic or Anthropic-compatible proxies |
| `google-generative-ai` | Google Generative AI |

### Model Options

| Field | Default | Description |
|-------|---------|-------------|
| `id` | (required) | Model identifier sent to API |
| `name` | same as `id` | Display name for model selector |
| `reasoning` | `false` | Supports extended thinking |
| `input` | `["text"]` | `["text"]` or `["text", "image"]` |
| `contextWindow` | `128000` | Context window in tokens |
| `maxTokens` | `16384` | Max output tokens |
| `cost` | all zeros | `{ "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }` (per million tokens) |

### Compatibility Settings

Some servers don't fully implement the OpenAI API. Use `compat` to work around this:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [{ "id": "llama3.1:8b" }]
    }
  }
}
```

| Compat Field | Description |
|-------------|-------------|
| `supportsDeveloperRole` | Use `developer` vs `system` role for system prompt |
| `supportsReasoningEffort` | Supports `reasoning_effort` parameter |
| `supportsUsageInStreaming` | Supports streaming usage stats |
| `maxTokensField` | Use `max_completion_tokens` or `max_tokens` |

## Override Built-in Providers

Route a built-in provider through a proxy without losing its model list:

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

All built-in models stay available. Your existing auth continues to work.

## File Locations

| File | Purpose | Location |
|------|---------|----------|
| `auth.json` | API keys + OAuth tokens | `~/.soma/agent/auth.json` |
| `models.json` | Custom providers + models | `~/.soma/agent/models.json` |
| `settings.json` | Engine settings | `~/.soma/agent/settings.json` |

`models.json` reloads every time you open `/model` — edit it during a session without restarting.

## Troubleshooting

### "No models available"
- Check that at least one API key is set or `/login` was completed
- Run `soma doctor` to verify your setup
- Try `soma --list-models` to see what's detected

### Model not appearing in `/model`
- Verify your `models.json` syntax (must be valid JSON)
- Check `baseUrl` is reachable: `curl <baseUrl>/models`
- Ensure `apiKey` resolves (env var must be set)

### Ollama models not working
- Add `"compat": { "supportsDeveloperRole": false }` to the provider
- Make sure Ollama is running: `ollama serve`
- Check the model is pulled: `ollama list`

### Authentication errors
- For subscription providers: try `/logout` then `/login`
- For API keys: verify with `echo $ANTHROPIC_API_KEY | head -c 10`
- Auth file keys override env vars — check both
