"use client";
import { useRef } from "react";
import HandTracker from "../components/HandTracker";
import Interpreter from "../components/Interpreter";

export default function Home() {
  const landmarksRef = useRef(null);
  return (
    <>
      <HandTracker onLandmarks={(h) => (landmarksRef.current = h)} />
      <Interpreter landmarksRef={landmarksRef} />
    </>
  );
}