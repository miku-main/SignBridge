# SignBridge Health

**Real-time ASL fingerspelling recognition that helps Deaf and hard-of-hearing patients communicate at the clinic front desk, running on the device and working alongside interpreters.**

Built in 36 hours at **Emory Hacks** · Track: Healthcare (Accessibility)

> SignBridge is a communication aid. It is **not** a medical device and **not** a replacement for qualified ASL interpreters.

---

## What it does

- Tracks the patient's hand from a regular webcam and draws a live skeleton overlay.
- Recognizes **24 static letters of the ASL alphabet** (A–Y, without J and Z, which need motion) plus a `NOTHING` class for a resting hand.
- Types a letter only after it's held steady for **~0.7 s**, so in-between hand shapes aren't typed.
- Builds letters into words. Showing a resting hand (`NOTHING`) ends the word, and a **medical-vocabulary autocorrect** suggests the closest clinic word, which the patient can accept or reject.
- **No video leaves the device.** Hand tracking and classification run entirely in the browser.

### Scope
Full ASL translation is an unsolved research problem: ASL has its own grammar and relies on motion and facial expressions. We don't claim to translate it. SignBridge does fingerspelling and a small, fixed clinic vocabulary, and it's meant to support interpreters, not replace them.

---

## How it works

```
Webcam
  → MediaPipe Hand Landmarker (in browser)    21 landmarks (x, y, z)
  → normalize()                               63-value vector
  → MLP classifier (plain JS)                 label + confidence
  → stability filter (~0.7 s)                 commit a letter
  → word builder + autocorrect                closest clinic word
```

### Shared contracts
These must stay identical between training (Python) and the app (JavaScript).

| Contract | Definition |
|---|---|
| **Normalization** | Subtract the wrist (landmark 0) from all points, divide by the wrist→middle-finger-base (landmark 9) distance, flatten to 63 values. [`lib/normalize.js`](lib/normalize.js) and the notebook's `normalize.py`. |
| **CSV format** | `label,x0,y0,z0,…,x20,y20,z20` (header row, already normalized) |
| **Labels** | `A B C D E F G H I K L M N NOTHING O P Q R S T U V W X Y`, sorted alphabetically, so **`NOTHING` sits between N and O**. The app's label order must match `labels` in `mlp_weights.json`. |
| **Model interface** | `predict(vec63) → { index, confidence, probabilities }` ([`lib/mlp.js`](lib/mlp.js)) |
| **Hand** | Training data is **right hand only**. |

---

## Getting started

Requires **Node.js 20.9+** (22.13+ avoids a harmless lint-tool warning).

```bash
npm install
npm run dev
```

Open http://localhost:3000 and allow camera access. Use Chrome or Edge for the best MediaPipe support.

> Ignore the `npm audit` warnings and **don't** run `npm audit fix --force`. It upgrades packages in ways that break the app and changes the shared lock file.

---

## Project structure

```
app/
  page.js              Main page: HandTracker + Interpreter
  layout.js
components/
  HandTracker.jsx      Webcam + MediaPipe hand tracking + skeleton overlay
  Interpreter.jsx      Live prediction, stability filter, word builder, autocorrect UI
  Recorder.jsx         Data collection tool (hold SPACE to record, export CSV)
  UI.jsx               Accessible high-contrast UI (large type, letter pad, captions, TTS) — not wired into page.js yet
lib/
  normalize.js         Shared normalization contract
  mlp.js               Plain-JS forward pass for the exported MLP
  autocorrect.js       Clinic vocabulary + edit-distance matching
public/
  mlp_weights.json     Model weights + labels loaded by the app
ml/
  signbridge_training.ipynb   Colab notebook: data loading, training, evaluation, export
  mlp_weights.json            Exported weights (copy of the one in public/)
  confusion_cost.json         Per-letter confusion costs from evaluation
data/raw/
  samples_<person>_session<N>.csv   Recorded training data
```

---

## Recording training data

`Recorder.jsx` isn't on the main page right now. To record, temporarily swap `Interpreter` for `Recorder` in [`app/page.js`](app/page.js):

```jsx
import Recorder from "../components/Recorder";
// ...
<Recorder landmarksRef={landmarksRef} />
```

Then:
1. Pick a letter, type your name, and **hold SPACE** (or the button) while signing. That's about 14 samples per second.
2. Aim for **200+ samples per letter**. Each letter's counter turns green when it gets there.
3. Click **Download CSV** and save it as `data/raw/samples_<name>_session<N>.csv`.
4. Click **Clear all** after every download. Samples are stored in the browser's local storage until downloaded, which fills up after roughly 8–10k samples. Once it's full, new samples are silently lost.

**Recording rules**
- **Right hand only**, for now.
- **One person per file**, and keep the name's spelling and capitalization the same every time. The notebook takes the person from the filename, so `Jessie` and `jessie` count as two different people.
- Vary the conditions: lighting, background, distance, small rotations, sleeves vs. bare arms. **More people beats more samples.**
- Record `NOTHING` generously: resting hands, transitions, half-formed shapes.
- Give look-alike letters extra care: **M/N/T/S, U/V, C/O, I/Y, K/V**.
- Keep 1–2 people **out of training entirely**, for the strangers test.

**Current data:** ~21,000 samples across 4 sessions from 3 signers (plus the Kaggle ASL Alphabet dataset for the early baseline).

---

## Training the model

Open [`ml/signbridge_training.ipynb`](ml/signbridge_training.ipynb) in Google Colab and run the cells top to bottom.

1. Upload the recorder CSVs to `MyDrive/signbridge/recordings/` in Google Drive.
2. The notebook trains a small MLP (`63 → 128 → 64 → 25`, ReLU, dropout 0.3) with augmentation (rotation ±10°, ±10% scale, Gaussian noise).
3. It evaluates with **leave-one-person-out** testing, which is the number to trust. A random split scores near 100% because it tests on people the model already saw.
4. It exports `mlp_weights.json` (weights + labels). Copy it to `public/mlp_weights.json`.

**Baseline finding:** trained on one signer and tested on another, accuracy was only **41–48%**. Accuracy depends far more on how many different signers are in the data than on how many samples.

---

## Known issues

- [ ] **Left hands are misread with high confidence.** The model only knows right hands. Fix: use MediaPipe's `handedness` output and mirror the x coordinates of left hands in `HandTracker.jsx`. Check which label your right hand actually gets, because MediaPipe assumes a mirrored image when it labels hands.
- [ ] **No minimum confidence:** any prediction held for 0.7 s is typed. Add a threshold of about 0.7.
- [ ] **The stability timer doesn't reset when the hand leaves the frame,** so a letter can be typed instantly when the hand comes back.
- [ ] **Double letters (e.g. the LL in HELLO) can't be typed.**
- [ ] **Label order is hard-coded** in `Interpreter.jsx`. Read it from `mlp_weights.json` instead.
- [ ] **The autocorrect vocabulary doesn't match the planned clinic vocabulary yet.** Lock one list.

## Roadmap

- Whole-sign recognition for 10–15 clinic signs (LSTM / 1D CNN on ~30-frame landmark sequences)
- Gloss-to-sentence with an LLM ("ME EAR PAIN" → "I have ear pain."), shown to the patient for confirmation before it's spoken
- Text-to-speech for staff, and live speech-to-text captions of the receptionist's replies for the patient
- Wire up the accessible `UI.jsx`, including a "type instead" fallback
- Left-handed signer support
- Validation with Deaf community members and interpreters

---

## Tech stack

Next.js 16 · React 19 · MediaPipe Tasks Vision · Tailwind CSS · Python · TensorFlow / Keras · scikit-learn · pandas · NumPy · OpenCV · Google Colab

## Team

| Role | Responsibilities |
|---|---|
| ML Lead | Data pipeline, training, evaluation, model export |
| Frontend / Computer Vision | Hand tracking, normalization, recorder, live inference |
| Backend / Integration | Interpreter, autocorrect, speech, deployment |
| Data, Design & Pitch | Data collection, accessibility design, user testing, pitch |

## Privacy & data

- Video is processed **on-device** and is never uploaded or stored.
- Training data contains only hand-landmark coordinates (no images), recorded by team members, plus the public Kaggle ASL Alphabet dataset.
- No real patient data is used.
