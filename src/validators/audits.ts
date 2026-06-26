import { z } from "zod"

export const triggerAuditSchema = z.object({
  siteId: z.string().uuid(),
})

export const markIssueFixedSchema = z.object({
  issueId: z.string().uuid(),
})

export const listIssuesQuerySchema = z.object({
  severity: z.enum(["critical", "warning", "info"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type TriggerAuditInput = z.infer<typeof triggerAuditSchema>
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>
