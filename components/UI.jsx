"use client";
import { useState } from "react";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

const css = `
.sb{--bg:#0b0b0f;--panel:#14141b;--line:#2a2a36;--fg:#fff;--muted:#b5b5c3;--accent:#FFD400;
  background:var(--bg);color:var(--fg);min-height:100vh;
  padding:clamp(12px,2vw,28px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.sb *{box-sizing:border-box}
.sb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.sb-title{font-size:clamp(22px,3vw,32px);font-weight:800;margin:0}
.sb-tag{color:var(--muted);font-size:16px;margin:2px 0 0}
.sb-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;
  border:2px solid var(--line);font-size:18px;font-weight:600}
.sb-dot{width:12px;height:12px;border-radius:50%;background:#666}
.sb-pill[data-on="true"]{border-color:var(--accent)}
.sb-pill[data-on="true"] .sb-dot{background:var(--accent)}
.sb-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));align-items:start}
.sb-card{background:var(--panel);border:2px solid var(--line);border-radius:16px;padding:20px}
.sb-label{font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.sb-letter{font-size:clamp(80px,12vw,140px);font-weight:900;line-height:1;color:var(--accent)}
.sb-word{font-size:clamp(48px,7vw,88px);font-weight:900;letter-spacing:.08em;min-height:1.3em;word-break:break-all}
.sb-msg{font-size:clamp(28px,4vw,44px);line-height:1.25;min-height:1.3em}
.sb-sentence{font-size:clamp(28px,4vw,44px);font-weight:700;color:var(--accent);line-height:1.25;min-height:1.3em}
.sb-muted{color:#8a8a99}
.sb-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.sb-btn{font:inherit;font-size:20px;font-weight:700;min-height:56px;padding:0 22px;border-radius:12px;
  cursor:pointer;background:#1e1e29;color:var(--fg);border:2px solid var(--line)}
.sb-btn:hover{border-color:#555}
.sb-btn.primary{background:var(--accent);color:#000;border-color:var(--accent)}
.sb-btn:disabled{opacity:.4;cursor:not-allowed}
.sb :focus-visible{outline:4px solid #fff;outline-offset:3px}
.sb-pad{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.sb-key{font:inherit;font-size:24px;font-weight:700;width:60px;height:60px;border-radius:10px;
  cursor:pointer;background:#1e1e29;color:var(--fg);border:2px solid var(--line)}
.sb-captions{margin-top:20px;border-color:#fff}
.sb-caption-text{font-size:clamp(36px,6vw,72px);font-weight:800;line-height:1.2;min-height:1.3em}
.sb-input{font:inherit;font-size:18px;padding:12px;width:100%;max-width:520px;margin-top:12px;
  background:#1e1e29;color:var(--fg);border:2px solid var(--line);border-radius:10px}
`;

function speak(text) {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export default function UI({
  camera,
  live, word, words, sentence, captions,
  onLetter, onFinishWord, onBackspace, onClear,
  onBuildSentence, onCaptionsChange,
}) {
  const [padOpen, setPadOpen] = useState(false);
  const message = words.join(" ");
  const spoken = sentence || message;

  return (
    <main className="sb">
      <style>{css}</style>

      <header className="sb-head">
        <div>
          <h1 className="sb-title">SignBridge Health</h1>
          <p className="sb-tag">Sign, spell, or type. Staff will hear you.</p>
        </div>
        <div className="sb-pill" data-on={live != null} role="status">
          <span className="sb-dot" aria-hidden="true" />
          {live != null ? "Hand detected" : "Show your hand"}
        </div>
      </header>

      <div className="sb-grid">
        {/* Left: camera + live letter */}
        <section className="sb-card" aria-label="Camera">
          {camera}
          <p className="sb-label" style={{ marginTop: 16 }}>Seeing</p>
          <div className="sb-letter" aria-live="polite">{live ?? "–"}</div>
        </section>

        {/* Right: spelling + message */}
        <div style={{ display: "grid", gap: 20 }}>
          <section className="sb-card" aria-label="Word being spelled">
            <p className="sb-label">Spelling</p>
            <div className="sb-word" aria-live="polite">
              {word || <span className="sb-muted">…</span>}
            </div>
            <div className="sb-row">
              <button className="sb-btn primary" onClick={onFinishWord} disabled={!word}>
                Add word
              </button>
              <button className="sb-btn" onClick={onBackspace} disabled={!word}>
                Backspace
              </button>
              <button className="sb-btn" onClick={() => setPadOpen((o) => !o)}
                aria-expanded={padOpen}>
                {padOpen ? "Hide keyboard" : "Type instead"}
              </button>
            </div>
            {padOpen && (
              <div className="sb-pad" role="group" aria-label="Letter keyboard">
                {LETTERS.map((l) => (
                  <button key={l} className="sb-key" onClick={() => onLetter(l)}>{l}</button>
                ))}
              </div>
            )}
          </section>

          <section className="sb-card" aria-label="Message">
            <p className="sb-label">Message</p>
            <div className="sb-msg" aria-live="polite">
              {message || <span className="sb-muted">Nothing yet</span>}
            </div>
            <p className="sb-label" style={{ marginTop: 16 }}>Sentence</p>
            <div className="sb-sentence" aria-live="polite">
              {sentence || <span className="sb-muted">Press “Make sentence”</span>}
            </div>
            <div className="sb-row">
              <button className="sb-btn primary" onClick={onBuildSentence}
                disabled={!words.length}>Make sentence</button>
              <button className="sb-btn" onClick={() => speak(spoken)}
                disabled={!spoken}>Speak</button>
              <button className="sb-btn" onClick={onClear}>Clear all</button>
            </div>
          </section>
        </div>
      </div>

      {/* Staff captions: wide, huge, readable from a distance */}
      <section className="sb-card sb-captions" aria-label="Staff reply">
        <p className="sb-label">Staff says</p>
        <div className="sb-caption-text" aria-live="polite">
          {captions || <span className="sb-muted">Replies appear here</span>}
        </div>
        {/* Temporary stand-in for speech-to-text, so you can test the layout */}
        <input className="sb-input" value={captions}
          onChange={(e) => onCaptionsChange(e.target.value)}
          placeholder="Test: type a staff reply" aria-label="Test staff reply" />
      </section>
    </main>
  );
}