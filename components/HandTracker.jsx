"use client";
import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

async function createLandmarker(vision) {
  const make = (delegate) =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 1,
    });
  try { return await make("GPU"); } catch { return await make("CPU"); }
}

export default function HandTracker({ onLandmarks }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cbRef = useRef(onLandmarks);
  const [status, setStatus] = useState("Loading model...");

  // Keep the newest callback available to the camera loop
  useEffect(() => {
    cbRef.current = onLandmarks;
  });

  useEffect(() => {
    let landmarker = null, stream = null, rafId = 0, stopped = false;
    let lastStatus = "";
    const show = (s) => { if (s !== lastStatus) { lastStatus = s; setStatus(s); } };

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(WASM);
      landmarker = await createLandmarker(vision);
      if (stopped) { landmarker.close(); return; }

      show("Starting camera...");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      const drawing = new DrawingUtils(ctx);
      let lastTime = -1;

      const loop = () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const hand = result.landmarks?.[0] ?? null;
          if (hand) {
            drawing.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00FF00", lineWidth: 4,
            });
            drawing.drawLandmarks(hand, {
              color: "#FF0000", fillColor: "#FF0000", radius: 4,
            });
            show("Hand detected");
          } else {
            show("Ready: show your hand");
          }
          // Handedness is the subject's own hand (the feed is unmirrored).
          // The model was trained on right hands only, so mirror left hands
          // into right-hand space before anyone else sees the landmarks.
          const side = hand ? result.handedness?.[0]?.[0]?.categoryName ?? null : null;
          const out = hand && side === "Left"
            ? hand.map((p) => ({ ...p, x: 1 - p.x }))
            : hand;
          cbRef.current?.(out, side); // 21 {x,y,z} points (or null), "Left" | "Right" | null
        }
        rafId = requestAnimationFrame(loop);
      };
      loop();
    }

    init().catch((e) => { if (!stopped) show("Error: " + e.message); });

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%",
    transform: "scaleX(-1)" }; // mirror for display only; data stays unmirrored

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 750, margin: "0 auto",
      aspectRatio: "4 / 3", background: "#222", borderRadius: 12, overflow: "hidden" }}>
      <video ref={videoRef} playsInline muted style={{ ...fill, objectFit: "cover" }} />
      <canvas ref={canvasRef} style={fill} />
      <div style={{ position: "absolute", left: 0, bottom: 0, right: 0, padding: "6px 12px",
        background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 16 }}>
        {status}
      </div>
    </div>
  );
}