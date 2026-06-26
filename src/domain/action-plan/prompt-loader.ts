import { readFileSync } from "fs"
import { join } from "path"
import { load as parseYaml } from "js-yaml"

export interface PromptTemplate {
  version: string
  name: string
  model: string
  maxTokens: number
  system: string
  userTemplate: string
}

/* Cache parsed prompts in memory — files don't change at runtime */
const cache = new Map<string, PromptTemplate>()

export function loadPrompt(filename: string): PromptTemplate {
  if (cache.has(filename)) return cache.get(filename)!

  /* Resolve relative to the repo root; works in both Next.js and worker process */
  const filePath = join(process.cwd(), "prompts", filename)
  const raw = readFileSync(filePath, "utf-8")
  const parsed = parseYaml(raw) as PromptTemplate

  if (!parsed.system || !parsed.userTemplate || !parsed.model) {
    throw new Error(`Prompt file ${filename} is missing required fields (system, userTemplate, model)`)
  }

  cache.set(filename, parsed)
  return parsed
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}
