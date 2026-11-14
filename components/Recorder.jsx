"use client";
import { useEffect, useRef, useState } from "react";
import { normalize } from "../lib/normalize";

// J and Z need motion, so they're excluded from the static classifier.
// NOTHING = resting/no-sign hand, which stops the model from inventing letters.
const LABELS = [..."ABCDEFGHIKLMNOPQRSTUVWXY", "NOTHING"];
const INTERVAL_MS = 70; // about 14 samples per second
const STORE_KEY = "signbridge-samples";

export default function Recorder({ landmarksRef }) {
  const [label, setLabel] = useState("A");
  const [person, setPerson] = useState("me");
  const [recording, setRecording] = useState(false);
  const [counts, setCounts] = useState({});
  const rowsRef = useRef([]);

  // Restore samples after a page refresh
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      rowsRef.current = saved;
      const c = {};
      saved.forEach((r) => (c[r[0]] = (c[r[0]] || 0) + 1));
      setCounts(c);
    } catch {}
  }, []);

  // Capture a burst of frames while recording is on
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const hand = landmarksRef.current;
      if (!hand) return; // no hand in frame, skip
      const vec = normalize(hand).map((v) => +v.toFixed(5));
      rowsRef.current.push([label, ...vec]);
      setCounts((c) => ({ ...c, [label]: (c[label] || 0) + 1 }));
    }, INTERVAL_MS);
    return () => {
      clearInterval(id);
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(rowsRef.current));
      } catch {}
    };
  }, [recording, label]);

  // Hold SPACE to record
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space" && !e.repeat && e.target.tagName !== "INPUT") {
        e.preventDefault();
        document.activeElement?.blur();
        setRecording(true);
      }
    };
    const up = (e) => e.code === "Space" && setRecording(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function downloadCSV() {
    const header = [
      "label",
      ...Array.from({ length: 21 }, (_, i) => [`x${i}`, `y${i}`, `z${i}`]).flat(),
    ];
    const csv = [header, ...rowsRef.current].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `samples_${person}_${Date.now()}.csv`;
    a.click();
  }

  function clearAll() {
    if (!confirm("Delete all recorded samples?")) return;
    rowsRef.current = [];
    setCounts({});
    localStorage.removeItem(STORE_KEY);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={label} onChange={(e) => setLabel(e.target.value)}
          style={{ fontSize: 24 }}>
          {LABELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <input value={person} onChange={(e) => setPerson(e.target.value)}
          placeholder="your name" />
        <button
          onMouseDown={() => setRecording(true)}
          onMouseUp={() => setRecording(false)}
          onMouseLeave={() => setRecording(false)}
          style={{ fontSize: 20, background: recording ? "crimson" : "#eee" }}>
          {recording ? "● Recording" : "Hold to record (or SPACE)"}
        </button>
      </div>

      <p>Samples for <b>{label}</b>: {counts[label] || 0} | Total: {total}</p>
      <button onClick={downloadCSV}>Download CSV</button>{" "}
      <button onClick={clearAll}>Clear all</button>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {LABELS.map((l) => (
          <span key={l} style={{
            padding: "2px 8px", borderRadius: 4,
            background: (counts[l] || 0) >= 200 ? "#9f9" : "#eee" }}>
            {l}: {counts[l] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}