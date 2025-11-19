# Building an AI Tabla Tuner: Real-Time DSP and Modern Web Tech for a Classical Instrument

Tuning a tabla has always been part science and part intuition. Digital tuners are usually designed for string instruments, so they often misinterpret percussion harmonics. I wanted a tool that actually understands how tabla pitch behaves, how stable it is, and how tension varies across the drumhead.

Live demo: https://aituning.netlify.app  
Code: https://github.com/trinav-code/tabla-tuner

---

## What the Tuner Tries to Solve

Tabla tuning has three main challenges:

1. **Finding the true fundamental frequency**
2. **Measuring tuning stability during real playing**
3. **Detecting uneven tension across the 12–3–6–9 positions**

This tuner brings these into a single workflow.

---

## Interface Overview

### 1. Starting Screen: Select Raga and Sa

The musician chooses the raga and the singer’s Sa, which determines the recommended tuning note.

![Start Screen](./tuning-start.png)

---

### 2. Real-Time Pitch Detection

Once recording starts, the system identifies the pitch continuously and provides cent deviation and basic tuning guidance.

![Recording and Detection](./tuning-detect.png)

---

### 3. Quick Sound Check: Stability and Consistency

This mode records ten seconds of playing and analyzes average pitch, drift, variance, and tension imbalance.

![Quick Analysis and Detailed Breakdown](./tuning-analysis.png)

---

## How It Works

### Real-Time Pitch Tracking

Using the Web Audio API:

- FFT analysis  
- Harmonic filtering  
- Parabolic interpolation  
- Note and cent mapping  

### Raga-Aware Recommendations

Ragas influence which tuning note is musically appropriate. The tuner incorporates these rules directly.

### Tension and Stability Analysis

A lightweight AI layer interprets pitch variation and produces musician-friendly recommendations.

### Architecture

The project is built with React and the Web Audio API. All audio stays on-device.

---

## Try It Yourself

Online: https://aituning.netlify.app

Local setup:

```bash
git clone https://github.com/trinav-code/tabla-tuner
cd tabla-tuner
npm install
npm run dev
```

---

## Closing Thoughts

This project started with a simple goal: can a browser understand a tabla stroke like a trained ear? Building it revealed more about the acoustics and physics of tabla tuning than I expected.

---

## Recommended Repo Structure

```
/docs
    /blog
        ai-tabla-tuner.md
        tuning-start.png
        tuning-detect.png
        tuning-analysis.png
```

---

