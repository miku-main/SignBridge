"use client";
import { useRef } from "react";
import HandTracker from "../components/HandTracker";
import Recorder from "../components/Recorder";

export default function Home() {
  const landmarksRef = useRef(null);
  return (
    <>
      <HandTracker onLandmarks={(h) => (landmarksRef.current = h)} />
      <Recorder landmarksRef={landmarksRef} />
    </>
  );
}