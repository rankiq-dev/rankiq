/* Email-safe HTML — inline styles only, no CSS variables, max-width 600px.
   Background dark: #0e1319 (≈ oklch(0.10 0.008 230)), accent teal: #30b8a0 */

export interface AuditReportData {
  recipientName:  string | null
  domain:         string
  auditId:        string
  healthScore:    number
  prevHealthScore: number | null
  pagesCount:     number
  criticalCount:  number
  warningCount:   number
  topIssues:      Array<{ title: string; severity: string; affectedCount: number }>
  appUrl:         string
}

export function auditReportEmail(data: AuditReportData): { subject: string; html: string } {
  const { domain, healthScore, prevHealthScore, pagesCount, criticalCount, warningCount, topIssues, appUrl, auditId } = data

  const trend = prevHealthScore != null
    ? healthScore - prevHealthScore
    : null
  const trendText = trend == null
    ? ""
    : trend >= 0
      ? `<span style="color:#30b8a0;font-size:12px;font-weight:700;">▲ +${trend} from last audit</span>`
      : `<span style="color:#e05252;font-size:12px;font-weight:700;">▼ ${trend} from last audit</span>`

  const scoreColor = healthScore >= 80 ? "#30b8a0" : healthScore >= 60 ? "#d4a017" : "#e05252"

  const issueRows = topIssues.slice(0, 5).map((issue) => {
    const sc = issue.severity === "critical" ? "#e05252" : issue.severity === "warning" ? "#d4a017" : "#6b9fd4"
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e2938;font-size:13px;color:#c8d0e0;">
          ${escHtml(issue.title)}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #1e2938;text-align:center;">
          <span style="background:${sc}22;color:${sc};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;">${escHtml(issue.severity)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1e2938;text-align:right;font-size:12px;color:#6b7f9e;">
          ${issue.affectedCount} page${issue.affectedCount !== 1 ? "s" : ""}
        </td>
      </tr>`
  }).join("")

  const greeting = data.recipientName ? `Hi ${escHtml(data.recipientName)},` : "Hi there,"

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO Audit Complete — ${escHtml(domain)}</title></head>
<body style="margin:0;padding:0;background:#0a0e15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0e15;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:20px;font-weight:900;color:#e8ecf5;letter-spacing:-0.5px;">Rank<span style="color:#30b8a0;">IQ</span></span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#e8ecf5;letter-spacing:-0.5px;">
            SEO audit complete for <span style="color:#30b8a0;">${escHtml(domain)}</span>
          </h1>
          <p style="margin:10px 0 0;font-size:14px;color:#8090a8;line-height:1.6;">${greeting} Your latest audit results are in. Here's the summary.</p>
        </td></tr>

        <!-- Score card -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
            style="background:#111926;border:1px solid #1e2938;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px;text-align:center;border-right:1px solid #1e2938;">
                <div style="font-size:48px;font-weight:900;color:${scoreColor};font-family:'Courier New',monospace;">${healthScore}</div>
                <div style="font-size:11px;color:#6b7f9e;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">Health Score</div>
                <div style="margin-top:6px;">${trendText}</div>
              </td>
              <td style="padding:24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#8090a8;">Pages crawled</td>
                    <td style="padding:4px 0;font-size:13px;color:#c8d0e0;text-align:right;font-weight:600;">${pagesCount}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#8090a8;">Critical issues</td>
                    <td style="padding:4px 0;font-size:13px;color:#e05252;text-align:right;font-weight:700;">${criticalCount}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#8090a8;">Warnings</td>
                    <td style="padding:4px 0;font-size:13px;color:#d4a017;text-align:right;font-weight:600;">${warningCount}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Top issues -->
        ${topIssues.length > 0 ? `
        <tr><td style="padding-bottom:24px;">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e8ecf5;text-transform:uppercase;letter-spacing:0.06em;">Top Issues to Fix</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
            style="background:#111926;border:1px solid #1e2938;border-radius:10px;overflow:hidden;">
            <tbody>${issueRows}</tbody>
          </table>
        </td></tr>` : ""}

        <!-- CTA -->
        <tr><td style="padding-bottom:40px;text-align:center;">
          <a href="${escHtml(appUrl)}/audits/${escHtml(auditId)}"
            style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#30b8a0,#3ec9c5);color:#0a0e15;border-radius:8px;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:-0.1px;">
            View Full Audit Report →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #1e2938;padding-top:24px;font-size:11px;color:#4a5a72;line-height:1.8;text-align:center;">
          <p style="margin:0;">You're receiving this because you have an active RankIQ account.<br>
          <a href="${escHtml(appUrl)}/dashboard" style="color:#30b8a0;text-decoration:none;">Dashboard</a> ·
          <a href="${escHtml(appUrl)}/pricing" style="color:#30b8a0;text-decoration:none;">Upgrade plan</a></p>
          <p style="margin:8px 0 0;color:#2e3d52;">© ${new Date().getFullYear()} RankIQ. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return {
    subject: `SEO audit complete for ${domain} — score ${healthScore}/100`,
    html,
  }
}

export interface WelcomeEmailData {
  recipientName: string | null
  appUrl: string
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const greeting = data.recipientName ? `Hi ${escHtml(data.recipientName)},` : "Hi there,"
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to RankIQ</title></head>
<body style="margin:0;padding:0;background:#0a0e15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0e15;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:20px;font-weight:900;color:#e8ecf5;letter-spacing:-0.5px;">Rank<span style="color:#30b8a0;">IQ</span></span>
        </td></tr>
        <tr><td style="background:#111926;border:1px solid #1e2938;border-radius:14px;padding:40px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#e8ecf5;letter-spacing:-0.5px;">Welcome to RankIQ 👋</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#8090a8;line-height:1.7;">${greeting} Great to have you. RankIQ crawls your site, surfaces the exact SEO issues hurting your rankings, and gives you an AI-ranked action plan sorted by revenue impact.</p>
          <p style="margin:0 0 28px;font-size:14px;color:#8090a8;line-height:1.7;">Add your first site and run a free audit in under 2 minutes.</p>
          <a href="${escHtml(data.appUrl)}/sites/new"
            style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#30b8a0,#3ec9c5);color:#0a0e15;border-radius:8px;font-size:14px;font-weight:800;text-decoration:none;">
            Add your first site →
          </a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:11px;color:#4a5a72;text-align:center;">
          <p style="margin:0;">© ${new Date().getFullYear()} RankIQ. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject: "Welcome to RankIQ — let's improve your rankings", html }
}

function escHtml(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
