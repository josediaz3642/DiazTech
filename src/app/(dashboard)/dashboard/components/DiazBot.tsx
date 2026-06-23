"use client";

import { useState, useEffect, useCallback } from "react";
import { getAIInsights, type AIInsightsData } from "@/actions/ai-insights";
import Link from "next/link";

// ── Animated Number ──────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

// ── Score Ring ───────────────────────────────────────────────────────
function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const offset = circ - (animated / 100) * circ;

  return (
    <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 900, color, lineHeight: 1 }}>
          <AnimatedNumber value={score} />
        </span>
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Insight Card ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  danger: { bg: "rgba(217,56,58,0.08)", border: "#D9383A", icon: "🚨", dot: "#D9383A" },
  warning: { bg: "rgba(226,184,62,0.08)", border: "#E2B83E", icon: "⚠️", dot: "#E2B83E" },
  success: { bg: "rgba(108,162,138,0.08)", border: "#6CA28A", icon: "✅", dot: "#6CA28A" },
  info: { bg: "rgba(77,124,255,0.08)", border: "#4D7CFF", icon: "💡", dot: "#4D7CFF" },
};

// ── Main DiazBot Component ───────────────────────────────────────────
export default function DiazBot() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"score" | "insights" | "cashflow">("score");

  const load = useCallback(async () => {
    if (data) return;
    setLoading(true);
    const res = await getAIInsights();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, [data]);

  const handleOpen = () => { setOpen(true); load(); };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` :
    `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={handleOpen}
        title="DiazBot — Diagnóstico financiero"
        style={{
          position: "fixed", bottom: "var(--space-6)", right: "var(--space-6)",
          zIndex: 500,
          width: 56, height: 56,
          borderRadius: "var(--radius-full)",
          background: "linear-gradient(135deg, var(--primary-500), var(--secondary-500))",
          border: "2px solid var(--border-primary)",
          boxShadow: "var(--shadow-lg)",
          fontSize: "1.4rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "transform var(--transition-base), box-shadow var(--transition-base)",
          animation: "float 4s ease-in-out infinite",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        🤖
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            backgroundColor: "rgba(61,64,91,0.35)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: "var(--space-6)",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420,
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-primary)",
              borderRadius: "var(--radius-2xl)",
              boxShadow: "var(--shadow-xl)",
              display: "flex", flexDirection: "column",
              maxHeight: "85vh", overflow: "hidden",
              animation: "slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "var(--space-4)",
              background: "linear-gradient(135deg, var(--primary-500), var(--secondary-600))",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "1.5rem" }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "var(--font-base)", color: "white" }}>DiazBot</div>
                  <div style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.8)" }}>
                    Diagnóstico financiero en tiempo real
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "white", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", borderBottom: "2px solid var(--border-primary)",
              backgroundColor: "var(--bg-secondary)",
            }}>
              {(["score", "insights", "cashflow"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "var(--space-3)", fontSize: "var(--font-xs)",
                    fontWeight: 700, cursor: "pointer",
                    borderBottom: tab === t ? "3px solid var(--primary-500)" : "3px solid transparent",
                    color: tab === t ? "var(--primary-500)" : "var(--text-tertiary)",
                    backgroundColor: "transparent",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {t === "score" ? "🎯 Score" : t === "insights" ? "💡 Alertas" : "📈 Flujo de Caja"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ overflowY: "auto", flex: 1, padding: "var(--space-4)" }}>
              {loading && (
                <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)", animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
                  <div style={{ fontSize: "var(--font-sm)", fontWeight: 600 }}>Analizando tu empresa...</div>
                </div>
              )}

              {!loading && data && tab === "score" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  {/* Score Ring */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "var(--space-4)",
                    padding: "var(--space-4)",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-xl)",
                    border: "2px solid var(--border-secondary)",
                  }}>
                    <ScoreRing score={data.healthScore.score} color={data.healthScore.color} label={data.healthScore.label} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: "var(--font-lg)", color: data.healthScore.color, marginBottom: "var(--space-2)" }}>
                        Salud {data.healthScore.label}
                      </div>
                      <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                        Basado en stock, cobranzas, tendencia de ventas y liquidez bancaria.
                      </div>
                    </div>
                  </div>

                  {/* Breakdown bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {data.healthScore.breakdown.map((b) => (
                      <div key={b.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "var(--font-xs)", fontWeight: 700 }}>
                          <span style={{ color: "var(--text-primary)" }}>{b.label}</span>
                          <span style={{ color: "var(--text-secondary)" }}>{b.score}/{b.weight}</span>
                        </div>
                        <div style={{ height: 8, background: "var(--bg-tertiary)", borderRadius: "var(--radius-full)", overflow: "hidden", border: "1px solid var(--border-secondary)" }}>
                          <div style={{
                            height: "100%",
                            width: `${(b.score / b.weight) * 100}%`,
                            background: `linear-gradient(90deg, var(--primary-500), var(--secondary-500))`,
                            borderRadius: "var(--radius-full)",
                            transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Best/worst day */}
                  {(data.bestDayOfWeek || data.worstDayOfWeek) && (
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)",
                    }}>
                      {data.bestDayOfWeek && (
                        <div style={{ padding: "var(--space-3)", background: "rgba(108,162,138,0.08)", border: "2px solid #6CA28A", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                          <div style={{ fontSize: "1.2rem" }}>🏆</div>
                          <div style={{ fontSize: "var(--font-xs)", fontWeight: 800, color: "#6CA28A" }}>Mejor día</div>
                          <div style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{data.bestDayOfWeek}</div>
                        </div>
                      )}
                      {data.worstDayOfWeek && (
                        <div style={{ padding: "var(--space-3)", background: "rgba(217,56,58,0.08)", border: "2px solid #D9383A", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                          <div style={{ fontSize: "1.2rem" }}>📉</div>
                          <div style={{ fontSize: "var(--font-xs)", fontWeight: 800, color: "#D9383A" }}>Peor día</div>
                          <div style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{data.worstDayOfWeek}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!loading && data && tab === "insights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {data.insights.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-tertiary)" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-3)" }}>🎉</div>
                      <div style={{ fontWeight: 700, fontSize: "var(--font-sm)" }}>¡Todo en orden! Sin alertas activas.</div>
                    </div>
                  ) : (
                    data.insights.map((ins, i) => {
                      const style = TYPE_COLORS[ins.type];
                      return (
                        <div
                          key={i}
                          style={{
                            padding: "var(--space-3)", borderRadius: "var(--radius-lg)",
                            background: style.bg, border: `2px solid ${style.border}`,
                            display: "flex", gap: "var(--space-3)", alignItems: "flex-start",
                            animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both`,
                          }}
                        >
                          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{style.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: "var(--font-xs)", color: "var(--text-primary)", marginBottom: 2 }}>
                              {ins.title}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                              {ins.description}
                            </div>
                          </div>
                          {ins.value && (
                            <span style={{ fontSize: "var(--font-xs)", fontWeight: 900, color: style.border, flexShrink: 0 }}>
                              {ins.value}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!loading && data && tab === "cashflow" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", fontWeight: 600, textAlign: "center" }}>
                    Proyección basada en cheques pendientes
                  </div>

                  {/* 7 days */}
                  <div style={{ padding: "var(--space-4)", background: "var(--bg-secondary)", borderRadius: "var(--radius-xl)", border: "2px solid var(--border-secondary)" }}>
                    <div style={{ fontWeight: 800, fontSize: "var(--font-sm)", marginBottom: "var(--space-3)", color: "var(--text-primary)" }}>
                      📅 Próximos 7 días
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "var(--font-xs)", color: "#6CA28A", fontWeight: 700 }}>↑ Cobros</div>
                        <div style={{ fontSize: "var(--font-lg)", fontWeight: 900, color: "#6CA28A" }}>
                          {fmt(data.cashFlowPrediction.incomingChecks7)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "var(--font-xs)", color: "#D9383A", fontWeight: 700 }}>↓ Pagos</div>
                        <div style={{ fontSize: "var(--font-lg)", fontWeight: 900, color: "#D9383A" }}>
                          {fmt(data.cashFlowPrediction.outgoingChecks7)}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      textAlign: "center", padding: "var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      background: data.cashFlowPrediction.netFlow7 >= 0 ? "rgba(108,162,138,0.12)" : "rgba(217,56,58,0.12)",
                      border: `1px solid ${data.cashFlowPrediction.netFlow7 >= 0 ? "#6CA28A" : "#D9383A"}`,
                    }}>
                      <span style={{ fontWeight: 900, fontSize: "var(--font-base)", color: data.cashFlowPrediction.netFlow7 >= 0 ? "#6CA28A" : "#D9383A" }}>
                        {data.cashFlowPrediction.netFlow7 >= 0 ? "+" : ""}{fmt(data.cashFlowPrediction.netFlow7)} neto
                      </span>
                    </div>
                  </div>

                  {/* 30 days */}
                  <div style={{ padding: "var(--space-4)", background: "var(--bg-secondary)", borderRadius: "var(--radius-xl)", border: "2px solid var(--border-secondary)" }}>
                    <div style={{ fontWeight: 800, fontSize: "var(--font-sm)", marginBottom: "var(--space-3)", color: "var(--text-primary)" }}>
                      📆 Próximos 30 días
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "var(--font-xs)", color: "#6CA28A", fontWeight: 700 }}>↑ Cobros</div>
                        <div style={{ fontSize: "var(--font-lg)", fontWeight: 900, color: "#6CA28A" }}>
                          {fmt(data.cashFlowPrediction.incomingChecks30)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "var(--font-xs)", color: "#D9383A", fontWeight: 700 }}>↓ Pagos</div>
                        <div style={{ fontSize: "var(--font-lg)", fontWeight: 900, color: "#D9383A" }}>
                          {fmt(data.cashFlowPrediction.outgoingChecks30)}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      textAlign: "center", padding: "var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      background: data.cashFlowPrediction.netFlow30 >= 0 ? "rgba(108,162,138,0.12)" : "rgba(217,56,58,0.12)",
                      border: `1px solid ${data.cashFlowPrediction.netFlow30 >= 0 ? "#6CA28A" : "#D9383A"}`,
                    }}>
                      <span style={{ fontWeight: 900, fontSize: "var(--font-base)", color: data.cashFlowPrediction.netFlow30 >= 0 ? "#6CA28A" : "#D9383A" }}>
                        {data.cashFlowPrediction.netFlow30 >= 0 ? "+" : ""}{fmt(data.cashFlowPrediction.netFlow30)} neto
                      </span>
                    </div>
                  </div>

                  <Link href="/dashboard/cheques" onClick={() => setOpen(false)} style={{
                    display: "block", textAlign: "center", padding: "var(--space-3)",
                    background: "var(--bg-secondary)", border: "2px solid var(--border-primary)",
                    borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: "var(--font-xs)",
                    color: "var(--text-secondary)",
                  }}>
                    Ver todos los cheques →
                  </Link>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "var(--space-3)",
              borderTop: "2px solid var(--border-primary)",
              backgroundColor: "var(--bg-secondary)",
              fontSize: "var(--font-xs)", color: "var(--text-tertiary)",
              textAlign: "center", fontWeight: 600,
            }}>
              🤖 DiazBot analiza tus datos en tiempo real · <button onClick={() => { setData(null); load(); }} style={{ color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
