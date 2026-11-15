"use client";
import { useEffect, useRef, useState } from "react";
import { normalize } from "../lib/normalize";
import { MLP } from "../lib/mlp";
import { findClosestWord, VOCABULARY } from "../lib/autocorrect";

// Label order MUST match training order from confusion_cost.json
const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "NOTHING", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];
const STABILITY_THRESHOLD = 0.7; // seconds

const css = `
.ip{--bg:#0b0b0f;--panel:#14141b;--line:#2a2a36;--fg:#fff;--muted:#b5b5c3;--accent:#FFD400;
  background:var(--bg);color:var(--fg);width:100%;max-width:800px;margin:0 auto;
  text-align:center;border-radius:16px;
  padding:clamp(12px,2vw,24px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.ip *{box-sizing:border-box}
.ip-title{font-size:clamp(22px,3vw,28px);font-weight:800;margin:0 0 16px}
.ip-card{background:var(--panel);border:2px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px}
.ip-label{font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.ip-letter{font-size:clamp(64px,10vw,112px);font-weight:900;line-height:1;color:var(--accent)}
.ip-conf{font-size:18px;color:var(--muted);margin-top:8px}
.ip-meter{height:10px;max-width:360px;margin:8px auto 0;background:#1e1e29;border-radius:999px;overflow:hidden}
.ip-meter>span{display:block;height:100%;background:var(--accent);transition:width .1s}
.ip-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}
.ip-chip{padding:4px 12px;border-radius:999px;border:2px solid var(--line);font-size:16px;color:var(--muted)}
.ip-hint{font-size:16px;line-height:1.4;color:#8a8a99;margin:12px 0 0}
.ip-word{font-size:clamp(40px,6vw,64px);font-weight:900;letter-spacing:.08em;min-height:1.3em;word-break:break-all}
.ip-muted{color:#8a8a99}
.ip-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}
.ip-btn{font:inherit;font-size:20px;font-weight:700;min-height:56px;padding:0 22px;border-radius:12px;
  cursor:pointer;background:#1e1e29;color:var(--fg);border:2px solid var(--line)}
.ip-btn:hover{border-color:#555}
.ip-btn.primary{background:var(--accent);color:#000;border-color:var(--accent)}
.ip-btn.small{font-size:16px;min-height:44px;padding:0 16px}
.ip :focus-visible{outline:4px solid #fff;outline-offset:3px}
.ip-suggest{border-color:var(--accent)}
.ip-suggest-word{font-size:clamp(36px,5vw,56px);font-weight:900;color:var(--accent);line-height:1.1}
.ip-head{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.ip-words{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;min-height:48px}
.ip-tag{padding:8px 16px;border-radius:10px;background:var(--accent);color:#000;font-size:22px;font-weight:800}
.ip-details summary{cursor:pointer;font-size:18px;color:var(--muted);padding:8px 0}
.ip-vocab{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
.ip-vocab span{padding:6px 12px;border-radius:8px;background:#1e1e29;border:2px solid var(--line);font-size:16px}
`;

export default function Interpreter({ landmarksRef }) {
  const [model, setModel] = useState(null);
  const [currentLetter, setCurrentLetter] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [topPredictions, setTopPredictions] = useState([]);
  const [collectedLetters, setCollectedLetters] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [completedWords, setCompletedWords] = useState([]);

  const stabilityRef = useRef({ letter: "", startTime: 0, confirmed: false });
  const lastPredictionRef = useRef("");

  // Load model weights
  useEffect(() => {
    fetch("/mlp_weights.json")
      .then(res => res.json())
      .then(weights => {
        setModel(new MLP(weights));
        console.log("Model loaded successfully");
      })
      .catch(err => console.error("Failed to load model:", err));
  }, []);

  // Run inference continuously
  useEffect(() => {
    if (!model) return;

    const interval = setInterval(() => {
      const landmarks = landmarksRef.current;
      if (!landmarks) {
        setCurrentLetter("(no hand)");
        setConfidence(0);
        return;
      }

      const normalized = normalize(landmarks);
      const result = model.predict(normalized);
      const predictedLabel = LABELS[result.index];

      // Get top 3 predictions for debugging
      const top3 = result.probabilities
        .map((prob, idx) => ({ label: LABELS[idx], prob }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3);

      setCurrentLetter(predictedLabel);
      setConfidence(result.confidence);
      setTopPredictions(top3);
      lastPredictionRef.current = predictedLabel;

      // Check stability for confirmation
      const now = Date.now();
      const stability = stabilityRef.current;

      if (predictedLabel === stability.letter) {
        const elapsed = (now - stability.startTime) / 1000;

        if (elapsed >= STABILITY_THRESHOLD && !stability.confirmed) {
          stability.confirmed = true;

          if (predictedLabel === "NOTHING") {
            // Word completion signal
            if (collectedLetters.length > 0) {
              const match = findClosestWord(collectedLetters);
              setSuggestion(match);
            }
          } else {
            // Add letter to word
            setCollectedLetters(prev => prev + predictedLabel);
            setSuggestion(null); // Clear any previous suggestion
          }
        }
      } else {
        // Letter changed, reset stability tracking
        stability.letter = predictedLabel;
        stability.startTime = now;
        stability.confirmed = false;
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [model, collectedLetters]);

  function acceptSuggestion() {
    if (suggestion) {
      setCompletedWords(prev => [...prev, suggestion.word]);
      setCollectedLetters("");
      setSuggestion(null);
      stabilityRef.current = { letter: "", startTime: 0, confirmed: false };
    }
  }

  function rejectSuggestion() {
    setSuggestion(null);
  }

  function clearCurrent() {
    setCollectedLetters("");
    setSuggestion(null);
    stabilityRef.current = { letter: "", startTime: 0, confirmed: false };
  }

  function clearAll() {
    setCompletedWords([]);
    clearCurrent();
  }

  if (!model) {
    return (
      <div className="ip">
        <style>{css}</style>
        <p className="ip-hint" role="status">Loading interpreter model…</p>
      </div>
    );
  }

  return (
    <div className="ip">
      <style>{css}</style>
      <h2 className="ip-title">ASL Interpreter</h2>

      {/* Current Prediction */}
      <section className="ip-card" aria-label="Current sign">
        <p className="ip-label">Current sign</p>
        <div className="ip-letter" aria-live="polite">{currentLetter || "–"}</div>
        <div className="ip-conf">Confidence: {(confidence * 100).toFixed(1)}%</div>
        <div className="ip-meter" aria-hidden="true">
          <span style={{ width: `${Math.round(confidence * 100)}%` }} />
        </div>

        {/* Top 3 predictions for debugging */}
        <div className="ip-chips">
          {topPredictions.map((p, i) => (
            <span key={i} className="ip-chip">
              {p.label} {(p.prob * 100).toFixed(0)}%
            </span>
          ))}
        </div>

        <p className="ip-hint">
          Hold a sign steady for 0.7s to confirm. Sign “NOTHING” (resting hand) to complete the word.
        </p>
      </section>

      {/* Building Word */}
      <section className="ip-card" aria-label="Word being built">
        <p className="ip-label">Building word</p>
        <div className="ip-word" aria-live="polite">
          {collectedLetters || <span className="ip-muted">…</span>}
        </div>
        {collectedLetters && (
          <div className="ip-row">
            <button className="ip-btn small" onClick={clearCurrent}>
              Clear current
            </button>
          </div>
        )}
      </section>

      {/* Suggestion */}
      {suggestion && (
        <section className="ip-card ip-suggest" aria-label="Word suggestion">
          <p className="ip-label">Suggestion for “{collectedLetters}”</p>
          <div className="ip-suggest-word" aria-live="polite">{suggestion.word}</div>
          <p className="ip-hint">
            Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            {" "}(edit distance: {suggestion.distance})
          </p>
          <div className="ip-row">
            <button className="ip-btn primary" onClick={acceptSuggestion}>
              ✓ Accept
            </button>
            <button className="ip-btn" onClick={rejectSuggestion}>
              ✗ Reject
            </button>
          </div>
        </section>
      )}

      {/* Completed Words */}
      <section className="ip-card" aria-label="Completed words">
        <div className="ip-head">
          <p className="ip-label" style={{ margin: 0 }}>
            Completed words ({completedWords.length})
          </p>
          {completedWords.length > 0 && (
            <button className="ip-btn small" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        <div className="ip-words">
          {completedWords.length > 0 ? (
            completedWords.map((word, i) => (
              <span key={i} className="ip-tag">{word}</span>
            ))
          ) : (
            <span className="ip-muted">No words yet</span>
          )}
        </div>
      </section>

      {/* Vocabulary Reference */}
      <details className="ip-details">
        <summary>Demo vocabulary (15 words)</summary>
        <div className="ip-vocab">
          {VOCABULARY.map(word => (
            <span key={word}>{word}</span>
          ))}
        </div>
      </details>
    </div>
  );
}