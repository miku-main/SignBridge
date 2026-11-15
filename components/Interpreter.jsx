"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import HandTracker from "./HandTracker";
import UI from "./UI";
import { normalize } from "../lib/normalize";
import { MLP } from "../lib/mlp";
import { suggestWord } from "../lib/autocorrect";

// Fallback only. The real order comes from `labels` in mlp_weights.json
// (alphabetical, so NOTHING sits between N and O).
const FALLBACK_LABELS = [..."ABCDEFGHIKLMN", "NOTHING", ..."OPQRSTUVWXY"];

const TICK_MS = 100;
const COMMIT_SEC = 0.7;   // hold a letter this long to type it
const FINISH_SEC = 1.5;   // rest your hand this long to finish the word
const MIN_CONFIDENCE = 0.7; // ignore predictions the model isn't sure about

export default function Interpreter() {
  const landmarksRef = useRef(null);
  const handRef = useRef(null);

  const [model, setModel] = useState(null);
  const [modelError, setModelError] = useState(null);

  // Live prediction (for display)
  const [live, setLive] = useState(null);
  const [hold, setHold] = useState({ progress: 0, kind: "letter" });
  const [top, setTop] = useState([]);
  const [hand, setHand] = useState(null);

  // Message being built
  const [word, setWord] = useState("");
  const [words, setWords] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [captions, setCaptions] = useState("");

  // Mirrors of state the inference loop reads, so the loop never goes stale
  const wordRef = useRef("");
  const suggestionRef = useRef(null);
  const trackRef = useRef({ label: null, start: 0, done: false });

  const updateWord = useCallback((w) => { wordRef.current = w; setWord(w); }, []);
  const updateSuggestion = useCallback((s) => { suggestionRef.current = s; setSuggestion(s); }, []);

  // Finish the current word: suggest a close clinic word, or add it as spelled
  const finishWord = useCallback(() => {
    const w = wordRef.current;
    if (!w) return;
    const suggested = suggestWord(w);
    if (suggested) {
      updateSuggestion({ typed: w, word: suggested });
    } else {
      setWords((ws) => [...ws, w]);
      updateWord("");
    }
  }, [updateWord, updateSuggestion]);

  // Load model weights
  useEffect(() => {
    fetch("/mlp_weights.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((weights) => {
        const labels = weights.labels ?? FALLBACK_LABELS;
        const outSize = weights.layers.at(-1).b.length;
        if (labels.length !== outSize) {
          throw new Error(`model has ${outSize} outputs but ${labels.length} labels`);
        }
        setModel({ net: new MLP(weights), labels });
      })
      .catch((err) => {
        console.error("Failed to load model:", err);
        setModelError(err.message);
      });
  }, []);

  // Inference loop
  useEffect(() => {
    if (!model) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      const landmarks = landmarksRef.current;
      setHand(handRef.current);

      if (!landmarks) {
        // Hand left the frame: reset so the next letter starts its own timer
        trackRef.current = { label: null, start: 0, done: false };
        setLive(null);
        setTop([]);
        setHold({ progress: 0, kind: "letter" });
        return;
      }

      const { probabilities } = model.net.predict(normalize(landmarks));
      const ranked = probabilities
        .map((p, i) => ({ label: model.labels[i], p }))
        .sort((a, b) => b.p - a.p);
      const best = ranked[0];
      setTop(ranked.slice(0, 3));
      setLive({ label: best.label, confidence: best.p });

      // Pause typing while the patient decides on a suggestion
      if (suggestionRef.current || best.p < MIN_CONFIDENCE) {
        trackRef.current = { label: null, start: 0, done: false };
        setHold({ progress: 0, kind: "letter" });
        return;
      }

      const now = performance.now();
      if (best.label !== track.label) {
        trackRef.current = { label: best.label, start: now, done: false };
        setHold({ progress: 0, kind: best.label === "NOTHING" ? "finish" : "letter" });
        return;
      }

      const elapsed = (now - track.start) / 1000;
      if (best.label === "NOTHING") {
        // A short rest separates letters (so double letters like LL work);
        // a long rest finishes the word.
        if (!wordRef.current || track.done) {
          setHold({ progress: 0, kind: "finish" });
          return;
        }
        setHold({ progress: Math.min(1, elapsed / FINISH_SEC), kind: "finish" });
        if (elapsed >= FINISH_SEC) {
          track.done = true;
          finishWord();
        }
      } else {
        setHold({ progress: track.done ? 1 : Math.min(1, elapsed / COMMIT_SEC), kind: "letter" });
        if (!track.done && elapsed >= COMMIT_SEC) {
          track.done = true;
          updateWord(wordRef.current + best.label);
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [model, finishWord, updateWord]);

  const camera = (
    <HandTracker
      onLandmarks={(lm, h) => {
        landmarksRef.current = lm;
        handRef.current = h;
      }}
    />
  );

  return (
    <UI
      camera={camera}
      status={modelError ? `Model failed to load: ${modelError}` : model ? null : "Loading model…"}
      live={live}
      hold={hold}
      top={top}
      hand={hand}
      word={word}
      words={words}
      suggestion={suggestion}
      captions={captions}
      onLetter={(l) => updateWord(wordRef.current + l)}
      onBackspace={() => updateWord(wordRef.current.slice(0, -1))}
      onFinishWord={() => finishWord()}
      onAcceptSuggestion={() => {
        setWords((ws) => [...ws, suggestion.word]);
        updateWord("");
        updateSuggestion(null);
      }}
      onKeepSpelled={() => {
        setWords((ws) => [...ws, suggestion.typed]);
        updateWord("");
        updateSuggestion(null);
      }}
      onRemoveLastWord={() => setWords((ws) => ws.slice(0, -1))}
      onClear={() => {
        setWords([]);
        updateWord("");
        updateSuggestion(null);
      }}
      onCaptionsChange={setCaptions}
    />
  );
}
