"use client";
import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

export default function HandTracker({ onLandmarks }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Loading model...");

  useEffect(() => {
    let landmarker, rafId, stream, stopped = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setStatus("Ready");

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const drawing = new DrawingUtils(ctx);
      let lastTime = -1;

      function loop() {
        if (stopped) return;
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const hand = result.landmarks?.[0];
          if (hand) {
            drawing.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { lineWidth: 3 });
            drawing.drawLandmarks(hand, { radius: 3 });
          }
          onLandmarks?.(hand ?? null); // 21 {x,y,z} points, or null
        }
        rafId = requestAnimationFrame(loop);
      }
      loop();
    }

    init().catch((e) => setStatus("Error: " + e.message));
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: 640, height: 480 }}>
      <video ref={videoRef} playsInline muted
        style={{ position: "absolute", width: "100%", transform: "scaleX(-1)" }} />
      <canvas ref={canvasRef}
        style={{ position: "absolute", width: "100%", transform: "scaleX(-1)" }} />
      <p style={{ position: "absolute", bottom: 0, color: "white" }}>{status}</p>
    </div>
  );
}