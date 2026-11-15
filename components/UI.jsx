"use client";
import { useState } from "react";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const RING = 2 * Math.PI * 54; // circumference of the hold-progress ring

const css = `
.sb{--bg:#0b0b0f;--panel:#14141b;--panel2:#1c1c26;--line:#2a2a36;--fg:#fff;--muted:#b5b5c3;
  --dim:#8a8a99;--accent:#FFD400;--ok:#4ade80;--info:#7dd3fc;
  background:var(--bg);color:var(--fg);min-height:100vh;width:100%;
  padding:clamp(16px,2.5vw,32px);font-family:var(--font-geist-sans),system-ui,-apple-system,"Segoe UI",sans-serif}
.sb *{box-sizing:border-box}
.sb-wrap{max-width:1280px;margin:0 auto}
.sb-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.sb-brand{display:flex;align-items:center;gap:14px}
.sb-logo{width:48px;height:48px;border-radius:14px;background:var(--accent);color:#000;
  display:grid;place-items:center;font-weight:900;font-size:22px;flex:none}
.sb-title{font-size:clamp(24px,3vw,34px);font-weight:800;margin:0;line-height:1.1}
.sb-tag{color:var(--muted);font-size:17px;margin:4px 0 0}
.sb-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;
  border:2px solid var(--line);font-size:18px;font-weight:700;background:var(--panel)}
.sb-dot{width:12px;height:12px;border-radius:50%;background:#555}
.sb-pill[data-on="true"]{border-color:var(--ok)}
.sb-pill[data-on="true"] .sb-dot{background:var(--ok);box-shadow:0 0 0 4px rgba(74,222,128,.2)}
.sb-steps{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 20px;padding:0;list-style:none;color:var(--muted);font-size:16px}
.sb-steps b{color:var(--fg)}
.sb-alert{background:#3b1d1d;border:2px solid #f87171;color:#fff;border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:17px}
.sb-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));align-items:start}
.sb-col{display:grid;gap:20px}
.sb-card{background:var(--panel);border:2px solid var(--line);border-radius:20px;padding:clamp(16px,2vw,24px)}
.sb-label{font-size:15px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.sb-seeing{display:flex;align-items:center;gap:20px;margin-top:20px}
.sb-ring{position:relative;width:132px;height:132px;flex:none}
.sb-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
.sb-ring-letter{position:absolute;inset:0;display:grid;place-items:center;font-size:64px;font-weight:900;color:var(--accent)}
.sb-ring-letter.rest{font-size:24px;color:var(--muted);letter-spacing:.08em}
.sb-ring-letter.unsure{color:var(--dim)}
.sb-seeing-info{flex:1;min-width:0}
.sb-meter{height:10px;background:var(--panel2);border-radius:999px;overflow:hidden;margin:6px 0 10px}
.sb-meter>span{display:block;height:100%;background:var(--accent);transition:width .1s}
.sb-meter.low>span{background:var(--dim)}
.sb-help{font-size:17px;color:var(--muted);line-height:1.4;margin:0}
.sb-details{margin-top:14px;color:var(--dim);font-size:15px}
.sb-details summary{cursor:pointer;padding:4px 0}
.sb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.sb-chip{padding:4px 12px;border-radius:999px;border:2px solid var(--line);font-size:15px;color:var(--muted)}
.sb-word{font-size:clamp(48px,7vw,84px);font-weight:900;letter-spacing:.1em;min-height:1.25em;line-height:1.2;word-break:break-all}
.sb-caret{display:inline-block;width:.08em;height:.9em;background:var(--accent);margin-left:.05em;vertical-align:-.08em;animation:sb-blink 1s steps(1) infinite}
@keyframes sb-blink{50%{opacity:0}}
.sb-muted{color:var(--dim)}
.sb-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.sb-btn{font:inherit;font-size:19px;font-weight:700;min-height:56px;padding:0 22px;border-radius:14px;
  cursor:pointer;background:var(--panel2);color:var(--fg);border:2px solid var(--line)}
.sb-btn:hover:not(:disabled){border-color:#666}
.sb-btn.primary{background:var(--accent);color:#000;border-color:var(--accent)}
.sb-btn:disabled{opacity:.35;cursor:not-allowed}
.sb :focus-visible{outline:4px solid #fff;outline-offset:3px}
.sb-pad{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:8px;margin-top:16px}
.sb-key{font:inherit;font-size:24px;font-weight:800;height:60px;border-radius:12px;
  cursor:pointer;background:var(--panel2);color:var(--fg);border:2px solid var(--line)}
.sb-key:hover{border-color:var(--accent)}
.sb-suggest{border-color:var(--accent);background:#1f1c0b}
.sb-suggest-word{font-size:clamp(40px,5vw,60px);font-weight:900;color:var(--accent);line-height:1.1}
.sb-words{display:flex;flex-wrap:wrap;gap:10px;min-height:56px;align-items:center}
.sb-wtag{padding:10px 18px;border-radius:12px;background:var(--accent);color:#000;font-size:clamp(22px,3vw,30px);font-weight:800}
.sb-captions{margin-top:20px;border-color:var(--info)}
.sb-captions .sb-label{color:var(--info)}
.sb-caption-text{font-size:clamp(36px,6vw,72px);font-weight:800;line-height:1.2;min-height:1.3em}
.sb-input{font:inherit;font-size:18px;padding:12px 14px;width:100%;max-width:560px;margin-top:14px;
  background:var(--panel2);color:var(--fg);border:2px solid var(--line);border-radius:12px}
.sb-foot{margin-top:20px;color:var(--dim);font-size:15px;text-align:center}
`;

function speak(text) {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function HoldRing({ live, hold }) {
  const isRest = live?.label === "NOTHING";
  const unsure = live && live.confidence < 0.7;
  const color = hold.kind === "finish" ? "var(--ok)" : "var(--accent)";
  return (
    <div className="sb-ring" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--panel2)" strokeWidth="10" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={RING}
          strokeDashoffset={RING * (1 - hold.progress)} />
      </svg>
      <div className={`sb-ring-letter${isRest ? " rest" : ""}${unsure ? " unsure" : ""}`}>
        {!live ? "–" : isRest ? "REST" : live.label}
      </div>
    </div>
  );
}

function seeingHelp(live, hold, word) {
  if (!live) return "Hold your right hand up in front of the camera.";
  if (live.label === "NOTHING") {
    return word && hold.progress > 0
      ? "Keep resting to finish the word…"
      : "Resting. Sign a letter to type it.";
  }
  if (live.confidence < 0.7) return "Not sure yet. Hold the shape clearly.";
  return hold.progress >= 1 ? "Typed! Rest briefly to repeat it." : "Hold steady to type this letter…";
}

export default function UI({
  camera, status,
  live, hold, top, hand,
  word, words, suggestion, captions,
  onLetter, onBackspace, onFinishWord,
  onAcceptSuggestion, onKeepSpelled,
  onRemoveLastWord, onClear, onCaptionsChange,
}) {
  const [padOpen, setPadOpen] = useState(false);
  const message = words.join(" ");
  const help = seeingHelp(live, hold, word);

  return (
    <main className="sb">
      <style>{css}</style>
      <div className="sb-wrap">
        <header className="sb-head">
          <div className="sb-brand">
            <div className="sb-logo" aria-hidden="true">SB</div>
            <div>
              <h1 className="sb-title">SignBridge Health</h1>
              <p className="sb-tag">Sign, spell, or type. Staff will hear you.</p>
            </div>
          </div>
          <div className="sb-pill" data-on={hand != null} role="status">
            <span className="sb-dot" aria-hidden="true" />
            {hand == null ? "Show your hand" : hand === "Left" ? "Left hand (mirrored)" : "Right hand"}
          </div>
        </header>

        <ul className="sb-steps" aria-label="How to use">
          <li><b>1.</b> Hold a letter to type it</li>
          <li><b>2.</b> Rest your hand briefly between double letters</li>
          <li><b>3.</b> Rest longer to finish the word</li>
        </ul>

        {status && <div className="sb-alert" role="alert">{status}</div>}

        <div className="sb-grid">
          {/* Left: camera + what the model sees */}
          <section className="sb-card" aria-label="Camera">
            {camera}
            <div className="sb-seeing">
              <HoldRing live={live} hold={hold} />
              <div className="sb-seeing-info">
                <p className="sb-label" style={{ margin: 0 }}>Seeing</p>
                <div className={`sb-meter${live && live.confidence < 0.7 ? " low" : ""}`} aria-hidden="true">
                  <span style={{ width: `${Math.round((live?.confidence ?? 0) * 100)}%` }} />
                </div>
                <p className="sb-help" aria-live="polite">{help}</p>
              </div>
            </div>
            <details className="sb-details">
              <summary>Model details</summary>
              <div className="sb-chips">
                {top.length ? top.map((t) => (
                  <span key={t.label} className="sb-chip">{t.label} {(t.p * 100).toFixed(0)}%</span>
                )) : <span className="sb-muted">No hand</span>}
              </div>
            </details>
          </section>

          <div className="sb-col">
            {/* Spelling */}
            <section className="sb-card" aria-label="Word being spelled">
              <p className="sb-label">Spelling</p>
              <div className="sb-word" aria-live="polite">
                {word || <span className="sb-muted">…</span>}
                {word && <span className="sb-caret" aria-hidden="true" />}
              </div>
              <div className="sb-row">
                <button className="sb-btn primary" onClick={onFinishWord} disabled={!word || !!suggestion}>
                  Finish word
                </button>
                <button className="sb-btn" onClick={onBackspace} disabled={!word || !!suggestion}>
                  ⌫ Backspace
                </button>
                <button className="sb-btn" onClick={() => setPadOpen((o) => !o)} aria-expanded={padOpen}>
                  {padOpen ? "Hide keyboard" : "Type instead"}
                </button>
              </div>
              {padOpen && (
                <div className="sb-pad" role="group" aria-label="Letter keyboard">
                  {LETTERS.map((l) => (
                    <button key={l} className="sb-key" onClick={() => onLetter(l)}
                      disabled={!!suggestion}>{l}</button>
                  ))}
                </div>
              )}
            </section>

            {/* Autocorrect suggestion */}
            {suggestion && (
              <section className="sb-card sb-suggest" aria-label="Word suggestion" role="alert">
                <p className="sb-label">Did you mean</p>
                <div className="sb-suggest-word">{suggestion.word}</div>
                <div className="sb-row">
                  <button className="sb-btn primary" onClick={onAcceptSuggestion}>
                    Use “{suggestion.word}”
                  </button>
                  <button className="sb-btn" onClick={onKeepSpelled}>
                    Keep “{suggestion.typed}”
                  </button>
                </div>
              </section>
            )}

            {/* Message */}
            <section className="sb-card" aria-label="Message">
              <p className="sb-label">Message</p>
              <div className="sb-words" aria-live="polite">
                {words.length
                  ? words.map((w, i) => <span key={i} className="sb-wtag">{w}</span>)
                  : <span className="sb-muted" style={{ fontSize: 22 }}>Finished words appear here</span>}
              </div>
              <div className="sb-row">
                <button className="sb-btn primary" onClick={() => speak(message)} disabled={!message}>
                  🔊 Speak
                </button>
                <button className="sb-btn" onClick={onRemoveLastWord} disabled={!words.length}>
                  Undo word
                </button>
                <button className="sb-btn" onClick={onClear} disabled={!words.length && !word}>
                  Clear all
                </button>
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
          {/* Temporary stand-in for speech-to-text, so the layout can be tested */}
          <input className="sb-input" value={captions}
            onChange={(e) => onCaptionsChange(e.target.value)}
            placeholder="Test: type a staff reply" aria-label="Test staff reply" />
        </section>

        <p className="sb-foot">
          Video never leaves this device. SignBridge is a communication aid, not a replacement for a qualified interpreter.
        </p>
      </div>
    </main>
  );
}
