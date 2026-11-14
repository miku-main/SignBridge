export function normalize(landmarks) {
    // landmarks: array of 21 points, each { x, y, z } (MediaPipe output)
    const wrist = landmarks[0];
    const midBase = landmarks[9]; // middle-finger base
  
    const scale =
      Math.hypot(
        midBase.x - wrist.x,
        midBase.y - wrist.y,
        midBase.z - wrist.z
      ) + 1e-6;
  
    const out = new Array(63);
    for (let i = 0; i < 21; i++) {
      out[i * 3] = (landmarks[i].x - wrist.x) / scale;
      out[i * 3 + 1] = (landmarks[i].y - wrist.y) / scale;
      out[i * 3 + 2] = (landmarks[i].z - wrist.z) / scale;
    }
    return out; // 63 numbers: x0, y0, z0, x1, y1, z1, ...
  }