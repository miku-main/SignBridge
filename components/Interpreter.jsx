"use client";
import { useEffect, useRef, useState } from "react";
import { normalize } from "../lib/normalize";
import { MLP } from "../lib/mlp";
import { findClosestWord, VOCABULARY } from "../lib/autocorrect";

const LABELS = [..."ABCDEFGHIKLMNOPQRSTUVWXY", "NOTHING"];
const STABILITY_THRESHOLD = 0.7; // seconds

export default function Interpreter({ landmarksRef }) {
  const [model, setModel] = useState(null);
  const [currentLetter, setCurrentLetter] = useState("");
  const [confidence, setConfidence] = useState(0);
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

      setCurrentLetter(predictedLabel);
      setConfidence(result.confidence);
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
    return <div style={{ padding: 16 }}>Loading interpreter model...</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>ASL Interpreter</h2>

      {/* Current Prediction */}
      <div style={{
        background: "#f0f0f0",
        padding: 16,
        borderRadius: 8,
        marginBottom: 16
      }}>
        <div style={{ fontSize: 14, color: "#666" }}>Current Sign:</div>
        <div style={{ fontSize: 48, fontWeight: "bold", color: "#333" }}>
          {currentLetter}
        </div>
        <div style={{ fontSize: 14, color: "#666" }}>
          Confidence: {(confidence * 100).toFixed(1)}%
        </div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
          Hold a sign steady for 0.7s to confirm. Sign "NOTHING" to complete word.
        </div>
      </div>

      {/* Building Word */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
          Building Word:
        </div>
        <div style={{
          fontSize: 32,
          fontWeight: "bold",
          minHeight: 48,
          padding: 8,
          background: "#e3f2fd",
          borderRadius: 4
        }}>
          {collectedLetters || "(empty)"}
        </div>
        {collectedLetters && (
          <button
            onClick={clearCurrent}
            style={{ marginTop: 8, fontSize: 12 }}>
            Clear Current
          </button>
        )}
      </div>

      {/* Suggestion */}
      {suggestion && (
        <div style={{
          background: "#fff3cd",
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
          border: "2px solid #ffc107"
        }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            Suggestion for "{collectedLetters}":
          </div>
          <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
            {suggestion.word}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            (Edit distance: {suggestion.distance})
          </div>
          <button
            onClick={acceptSuggestion}
            style={{
              marginRight: 8,
              background: "#28a745",
              color: "white",
              padding: "8px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}>
            ✓ Accept
          </button>
          <button
            onClick={rejectSuggestion}
            style={{
              background: "#dc3545",
              color: "white",
              padding: "8px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 4,
              cursor: "pointer"
            }}>
            ✗ Reject
          </button>
        </div>
      )}

      {/* Completed Words */}
      <div>
        <div style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>Completed Words ({completedWords.length}):</span>
          {completedWords.length > 0 && (
            <button onClick={clearAll} style={{ fontSize: 12 }}>
              Clear All
            </button>
          )}
        </div>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          minHeight: 40,
          padding: 8,
          background: "#f8f9fa",
          borderRadius: 4
        }}>
          {completedWords.length > 0 ? (
            completedWords.map((word, i) => (
              <span key={i} style={{
                padding: "6px 12px",
                background: "#28a745",
                color: "white",
                borderRadius: 4,
                fontSize: 16,
                fontWeight: "bold"
              }}>
                {word}
              </span>
            ))
          ) : (
            <span style={{ color: "#999", fontSize: 14 }}>No words yet</span>
          )}
        </div>
      </div>

      {/* Vocabulary Reference */}
      <details style={{ marginTop: 24 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, color: "#666" }}>
          Demo Vocabulary (15 words)
        </summary>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8
        }}>
          {VOCABULARY.map(word => (
            <span key={word} style={{
              padding: "4px 8px",
              background: "#e0e0e0",
              borderRadius: 4,
              fontSize: 12
            }}>
              {word}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
