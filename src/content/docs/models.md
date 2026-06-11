---
title: "Models"
description: "Model configuration, provider setup, custom endpoints."
section: "Reference"
order: 19
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

Soma runs on the Pi engine, which supports **23 providers** out of the box:

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
| **Kimi Coding** | `KIMI_API_KEY` |
| **Minimax** | `MINIMAX_API_KEY` |
| **Z.ai** | `ZAI_API_KEY` |

### Cloud Providers

| Provider | Setup |
|----------|-------|
| **Amazon Bedrock** | AWS credentials (`AWS_PROFILE` or IAM keys) |
| **Azure OpenAI** | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` |
| **Google Vertex AI** | `gcloud auth application-default login` + `GOOGLE_CLOUD_PROJECT` |
| **Vercel AI Gateway** | Vercel account + AI Gateway setup |

## Choosing a Model

### During a Session

Press **Ctrl+P** to cycle between available models, or use the `/model` command to open the model selector with fuzzy search.

### From the Command Line

```bash
# Use a specific model
soma --model claude-sonnet-4

# Claude Fable 5 (Anthropic's Mythos-class frontier model) — `fable` aliases to claude-fable-5
soma --model fable

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

## Model Value Guide (OpenCode Provider)

OpenCode is a pay-as-you-go AI provider with unified access to frontier models at competitive prices. Most models support extended thinking and OpenAI/Anthropic-compatible APIs.

> **Get started with OpenCode:** Use our referral link to sign up for OpenCode Go — you get **$5 credit** and your friend gets **$5 credit** too.
> [opencode.ai/go?ref=D86VYYWKT9](https://opencode.ai/go?ref=D86VYYWKT9)

### Free Models (No API Key Required)

These models cost $0 for both input and output. Ideal for prototyping, simple tasks, and testing:

| Model | Context | Thinking | Use Case |
|-------|---------|----------|----------|
| **Big Pickle** | 200K | ✅ | General purpose, strong reasoning |
| **DeepSeek V4 Flash Free** | 200K | ✅ | Code generation, lightweight tasks |
| **MiMo V2.5 Free** | 1M | ✅ | Long-context document analysis |
| **Nemotron 3 Super Free** | 200K | ✅ | Text generation, reasoning |

### Best Bang for Your Buck

Prices per 1M tokens. Sorted by best value (intelligence per dollar):

#### Tier 1 — The Sweet Spot ($0.14-$0.40 input)

| Model | Input | Output | Context | Why |
|-------|------:|------:|-------:|-----|
| **DeepSeek V4 Flash** | $0.14 | $0.28 | 1M | Code specialist, xhigh thinking, excellent for automated pipelines |
| **Qwen3.7 Plus** ⭐ | $0.40 | $1.60 | 262K | New architecture, Sonnet-tier reasoning at 8× less cost. Best undiscovered value |
| **Qwen3.5 Plus** | $0.20 | $1.20 | 262K | Good all-rounder, supports images |
| **Qwen3.6 Plus** | $0.50 | $3.00 | 262K | Incremental improvement over 3.5, solid mid-range |

#### Tier 2 — Workhorse ($0.50-$3 input)

| Model | Input | Output | Context | Why |
|-------|------:|------:|-------:|-----|
| **Gemini 3.5 Flash** | $1.50 | $9.00 | 1M | Near Sonnet-level performance, multimodal, huge context. Good fallback for long-context + image tasks |
| **Gemini 3 Flash** | $0.50 | $3.00 | 1M | Budget multimodal, 1M context, image support |
| **Gemini 3.1 Pro** | $2.00 | $12.00 | 1M | Strong reasoning, 1M context, solid mid-tier choice |
| **Claude Sonnet 4.6** 🔶 | $3.00 | $15.00 | 1M | Proven workhorse. Best instruction-following, best tool-use reliability. Worth the premium for critical sessions |
| **Grok Build 0.1** | $1.00 | $2.00 | 256K | If xAI's benchmarks hold, this competes with Sonnet at a fraction of the cost |
| **Kimi K2.6** | $0.95 | $4.00 | 262K | Strong deepseeking reasoning, competitive at this price point |

#### Tier 3 — Premium ($5 input)

| Model | Input | Output | Context | Why |
|-------|------:|------:|-------:|-----|
| **Claude Opus 4.7** 🔷 | $5.00 | $25.00 | 1M | Your current default — earns its spot. 1M context, adaptive thinking, the ceiling. Worth it for complex architecture work |
| **Claude Opus 4.8** | $5.00 | $25.00 | 1M | Latest Opus, marginal improvement over 4.7 |
| **GPT 5.5** | $5.00 | $30.00 | 1M | Competitive with Opus for creative/code. Higher output cost |
| **GPT 5.4 Pro** | $30.00 | $180.00 | 1M | Ultra-premium. For when nothing else will do and budget isn't a concern |

### Personal Recommendation

If I were choosing a daily driver stack today:

| Role | Model | Why |
|------|-------|-----|
| **Everyday reasoning** | Qwen3.7 Plus | ~12× cheaper than Opus 4.7 on output, likely 85-90% of the intelligence for most tasks |
| **Code generation** | DeepSeek V4 Flash | 1M context, elite code reasoning, $0.14/$0.28. Hard to beat |
| **Critical architecture** | Claude Opus 4.7 | When the problem is hard and wrong is expensive |
| **Long context + images** | Gemini 3.5 Flash | 1M context, strong multimodal, $1.50/$9 |
| **Free prototyping** | DeepSeek V4 Flash Free | Zero cost, same API shape. Good enough for drafts |

Try subbing in Qwen3.7 Plus for your default model for a week and see if you notice the difference. The savings on output ($1.60 vs $25 per million tokens) add up fast.
