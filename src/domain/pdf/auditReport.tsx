"use server"
import {
  Document, Page, Text, View, StyleSheet, Font,
  renderToBuffer,
} from "@react-pdf/renderer"
import type { Audit, AuditIssue, Site } from "@/db/schema"

const TEAL = "#0d9488"
const CYAN = "#06b6d4"
const DARK = "#0a0e1a"
const SURFACE = "#131929"
const TEXT = "#e2e8f0"
const TEXT2 = "#94a3b8"
const RED = "#f87171"
const AMBER = "#fbbf24"
const GREEN = "#4ade80"
const BORDER = "#1e293b"

const styles = StyleSheet.create({
  page: {
    backgroundColor: DARK,
    color: TEXT,
    fontFamily: "Helvetica",
    padding: 40,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: `1px solid ${BORDER}`,
  },
  logo: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    letterSpacing: 0.5,
  },
  tagline: { fontSize: 8, color: TEXT2, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerLabel: { fontSize: 8, color: TEXT2, textTransform: "uppercase", letterSpacing: 1 },
  headerDate: { fontSize: 9, color: TEXT, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 9, fontFamily: "Helvetica-Bold", color: TEAL,
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10,
  },
  scoreRow: {
    flexDirection: "row", alignItems: "center", gap: 24, marginBottom: 20,
  },
  scoreBox: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: TEAL,
    alignItems: "center", justifyContent: "center",
    backgroundColor: SURFACE,
  },
  scoreNum: { fontSize: 36, fontFamily: "Helvetica-Bold", color: TEAL },
  scoreLabel: { fontSize: 7, color: TEXT2, textTransform: "uppercase", letterSpacing: 1 },
  metaGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaCard: {
    backgroundColor: SURFACE, borderRadius: 6, padding: "10 14",
    minWidth: "45%", flex: 1, borderWidth: 1, borderColor: BORDER,
  },
  metaCardLabel: { fontSize: 7, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  metaCardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: TEXT },
  issueRow: {
    flexDirection: "row",
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 6, marginBottom: 6,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  rankBadge: {
    width: 20, height: 20, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
    marginRight: 10, flexShrink: 0,
    backgroundColor: "#1e293b",
  },
  rankText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEXT2 },
  issueContent: { flex: 1 },
  issueTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: TEXT, marginBottom: 2 },
  issueDesc: { fontSize: 8, color: TEXT2, lineHeight: 1.4 },
  severityBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
    marginLeft: 8, alignSelf: "flex-start", flexShrink: 0,
  },
  severityText: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  fixBox: {
    backgroundColor: "#0d1f17", borderRadius: 4,
    padding: "6 8", marginTop: 4,
    borderLeft: `2px solid ${TEAL}`,
  },
  fixLabel: { fontSize: 7, color: TEAL, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  fixText: { fontSize: 8, color: TEXT2, lineHeight: 1.5 },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    borderTop: `1px solid ${BORDER}`, paddingTop: 8,
  },
  footerText: { fontSize: 7, color: TEXT2 },
  bar: {
    height: 8, borderRadius: 4, backgroundColor: BORDER, marginTop: 4, overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
})

function severityColor(s: string) {
  if (s === "critical") return RED
  if (s === "warning") return AMBER
  return CYAN
}

function scoreColor(score: number) {
  if (score >= 90) return GREEN
  if (score >= 70) return TEAL
  if (score >= 50) return AMBER
  return RED
}

interface Props {
  site: Site
  audit: Audit
  issues: AuditIssue[]
  agencyName?: string
}

function AuditPdf({ site, audit, issues, agencyName }: Props) {
  const score = audit.healthScore ?? 0
  const sc = scoreColor(score)
  const critical = issues.filter(i => i.severity === "critical")
  const warnings = issues.filter(i => i.severity === "warning")
  const info = issues.filter(i => i.severity === "info")
  const date = audit.completedAt ? new Date(audit.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"

  return (
    <Document title={`SEO Audit — ${site.displayName ?? site.domain}`} author="RankIQ" creator="RankIQ">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{agencyName ?? "RankIQ"}</Text>
            <Text style={styles.tagline}>{agencyName ? "Powered by RankIQ" : "AI-Powered SEO Intelligence"}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Audit Report</Text>
            <Text style={styles.headerDate}>{date}</Text>
            <Text style={[styles.headerDate, { color: TEXT2, fontSize: 8, marginTop: 2 }]}>{site.domain}</Text>
          </View>
        </View>

        {/* Score + KPIs */}
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, { borderColor: sc }]}>
            <Text style={[styles.scoreNum, { color: sc }]}>{score}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaCardLabel}>Pages Crawled</Text>
              <Text style={styles.metaCardValue}>{audit.pagesCount ?? 0}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaCardLabel}>Critical Issues</Text>
              <Text style={[styles.metaCardValue, { color: RED }]}>{critical.length}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaCardLabel}>Warnings</Text>
              <Text style={[styles.metaCardValue, { color: AMBER }]}>{warnings.length}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaCardLabel}>Info</Text>
              <Text style={[styles.metaCardValue, { color: CYAN }]}>{info.length}</Text>
            </View>
          </View>
        </View>

        {/* Health bar */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${score}%`, backgroundColor: sc }]} />
          </View>
        </View>

        {/* Issues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issues & Action Plan</Text>
          {issues.slice(0, 20).map((issue, i) => (
            <View key={issue.id} style={styles.issueRow}>
              <View style={[styles.rankBadge, i < 3 ? { backgroundColor: TEAL } : {}]}>
                <Text style={[styles.rankText, i < 3 ? { color: DARK } : {}]}>#{i + 1}</Text>
              </View>
              <View style={styles.issueContent}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Text style={[styles.issueTitle, { flex: 1 }]}>{issue.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: severityColor(issue.severity) + "22" }]}>
                    <Text style={[styles.severityText, { color: severityColor(issue.severity) }]}>{issue.severity}</Text>
                  </View>
                </View>
                <Text style={styles.issueDesc}>{issue.description}</Text>
                {issue.affectedCount > 0 && (
                  <Text style={[styles.issueDesc, { marginTop: 2, color: TEXT2 }]}>
                    Affects {issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""}
                  </Text>
                )}
                {issue.fixInstructions && (
                  <View style={styles.fixBox}>
                    <Text style={styles.fixLabel}>HOW TO FIX</Text>
                    <Text style={styles.fixText}>{issue.fixInstructions.slice(0, 300)}{issue.fixInstructions.length > 300 ? "…" : ""}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>RankIQ • {site.domain} • Generated {date}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function generateAuditPdf(site: Site, audit: Audit, issues: AuditIssue[], agencyName?: string): Promise<Buffer> {
  const buffer = await renderToBuffer(<AuditPdf site={site} audit={audit} issues={issues} agencyName={agencyName} />)
  return Buffer.from(buffer)
}
