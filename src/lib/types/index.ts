export type IssueSeverity = "critical" | "warning" | "info"
export type IssueCategory =
  | "technical"
  | "on_page"
  | "off_page"
  | "local"
  | "ecommerce"
  | "content"

export type Plan = "starter" | "growth" | "agency"
export type AuditStatus = "queued" | "running" | "complete" | "failed"

export interface AuditIssue {
  id: string
  auditId: string
  severity: IssueSeverity
  category: IssueCategory
  type: string
  title: string
  description: string
  affectedUrls: string[]
  affectedCount: number
  fixInstructions?: string
  revenueImpactRank?: number
  isFixed: boolean
}

export interface SiteHealthSummary {
  score: number
  criticalCount: number
  warningCount: number
  infoCount: number
  pagesCount: number
  lastAuditAt?: string
}
