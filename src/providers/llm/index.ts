import Anthropic from "@anthropic-ai/sdk"
import { config } from "@/config"
import { logger } from "@/infra/logger"
import { CircuitBreaker } from "@/infra/circuit-breaker"

export interface LLMMessage {
  role: "user" | "assistant"
  content: string
}

export interface LLMGenerateOptions {
  system?: string
  messages: LLMMessage[]
  maxTokens?: number
  model?: string
}

export interface LLMGenerateResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface LLMProvider {
  generate(opts: LLMGenerateOptions): Promise<LLMGenerateResult>
}

const breaker = new CircuitBreaker({
  name: "anthropic",
  failureThreshold: 5,
  windowMs: 60_000,
  cooldownMs: 30_000,
})

export class AnthropicAdapter implements LLMProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey })
  }

  async generate(opts: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const model = opts.model ?? "claude-sonnet-4-6"
    const start = Date.now()

    return breaker.call(async () => {
      const response = await this.client.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system,
        messages: opts.messages,
      })

      const content =
        response.content[0]?.type === "text" ? response.content[0].text : ""

      const result: LLMGenerateResult = {
        content,
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model:        response.model,
      }

      logger.info(
        {
          model,
          inputTokens:  result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs:    Date.now() - start,
        },
        "LLM call complete"
      )

      return result
    })
  }
}

/* Singleton — import this in domain code, never the Anthropic SDK directly */
export const llm: LLMProvider = new AnthropicAdapter()
