"use client"
import { useState } from "react"
import { useOptionalToast } from "@/components/ui/Toast"

interface Props {
  issueId: string
  isFixed: boolean
  verifiedFixed: boolean
  assignedTo?: string | null
  fixNote?: string | null
}

export function MarkFixedButton({ issueId, isFixed, verifiedFixed, assignedTo, fixNote }: Props) {
  const [fixed, setFixed] = useState(isFixed)
  const [verified, setVerified] = useState(verifiedFixed)
  const [currentAssignedTo, setCurrentAssignedTo] = useState(assignedTo ?? "")
  const [currentFixNote, setCurrentFixNote] = useState(fixNote ?? "")
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [draftAssignedTo, setDraftAssignedTo] = useState(assignedTo ?? "")
  const [draftFixNote, setDraftFixNote] = useState(fixNote ?? "")
  const { toast } = useOptionalToast()

  async function submitFix() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/fix`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixed: true, assignedTo: draftAssignedTo, fixNote: draftFixNote }),
      })
      if (res.ok) {
        setFixed(true)
        setVerified(false)
        setCurrentAssignedTo(draftAssignedTo)
        setCurrentFixNote(draftFixNote)
        setShowModal(false)
        toast("Issue marked as fixed ✓ — re-audit to confirm", "success")
      } else {
        toast("Failed to update issue", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  async function unmarkFixed() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/fix`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixed: false }),
      })
      if (res.ok) {
        setFixed(false)
        setVerified(false)
        setCurrentAssignedTo("")
        setCurrentFixNote("")
        toast("Issue reopened", "info")
      } else {
        toast("Failed to update issue", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  if (fixed) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {verified ? (
          <span style={{
            padding: "3px 10px", fontSize: "10px", fontWeight: 700,
            background: "oklch(0.22 0.08 155 / 0.4)", color: "oklch(0.75 0.16 155)",
            border: "1px solid oklch(0.55 0.16 155 / 0.4)",
            borderRadius: "var(--radius)", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            ✓ Confirmed by re-audit
          </span>
        ) : (
          <span style={{
            padding: "3px 10px", fontSize: "10px", fontWeight: 700,
            background: "oklch(0.22 0.10 80 / 0.3)", color: "oklch(0.80 0.14 75)",
            border: "1px solid oklch(0.75 0.14 75 / 0.3)",
            borderRadius: "var(--radius)", letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            ⏳ Fixed · awaiting re-audit
          </span>
        )}
        <button
          onClick={unmarkFixed}
          disabled={loading}
          title="Reopen issue"
          style={{
            padding: "3px 8px", fontSize: "10px", fontWeight: 600,
            background: "transparent", color: "var(--foreground-3)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius)", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          Reopen
        </button>
        {(currentAssignedTo || currentFixNote) && (
          <span style={{ fontSize: "10px", color: "var(--foreground-3)" }}>
            {currentAssignedTo && `by ${currentAssignedTo}`}
          </span>
        )}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => { setDraftAssignedTo(currentAssignedTo); setDraftFixNote(currentFixNote); setShowModal(true) }}
        disabled={loading}
        style={{
          padding: "5px 12px", fontSize: "11px", fontWeight: 700,
          background: "oklch(0.18 0.006 230)",
          color: "var(--foreground-3)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius)", cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1, transition: "all 200ms",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}
      >
        Mark Fixed
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "oklch(0.06 0.005 230 / 0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "oklch(0.13 0.008 230)", border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)", padding: "28px 32px", minWidth: "380px", maxWidth: "480px",
              boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "4px" }}>
              Mark Issue as Fixed
            </div>
            <div style={{ fontSize: "12px", color: "var(--foreground-3)", marginBottom: "20px" }}>
              Add optional details, then re-audit to confirm the fix was effective.
            </div>

            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground-2)", display: "block", marginBottom: "6px" }}>
              Assigned to (optional)
            </label>
            <input
              value={draftAssignedTo}
              onChange={e => setDraftAssignedTo(e.target.value)}
              placeholder="e.g. Developer, SEO team, john@example.com"
              style={{
                width: "100%", padding: "8px 12px", fontSize: "12px",
                background: "oklch(0.17 0.006 230)", border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-md)", color: "var(--foreground)", marginBottom: "14px",
                outline: "none", boxSizing: "border-box",
              }}
            />

            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground-2)", display: "block", marginBottom: "6px" }}>
              Fix note / evidence (optional)
            </label>
            <textarea
              value={draftFixNote}
              onChange={e => setDraftFixNote(e.target.value)}
              placeholder="e.g. Updated all 12 title tags, added canonical to /blog — committed 2026-07-03"
              rows={3}
              style={{
                width: "100%", padding: "8px 12px", fontSize: "12px",
                background: "oklch(0.17 0.006 230)", border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-md)", color: "var(--foreground)", marginBottom: "20px",
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 16px", fontSize: "12px", fontWeight: 600,
                  background: "transparent", color: "var(--foreground-3)",
                  border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitFix}
                disabled={loading}
                style={{
                  padding: "8px 20px", fontSize: "12px", fontWeight: 700,
                  background: "var(--primary)", color: "var(--primary-foreground)",
                  border: "none", borderRadius: "var(--radius-md)",
                  cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Saving…" : "✓ Mark as Fixed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
