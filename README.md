# Universal Answer Paper Evaluator MVP

A premium, high-fidelity system for engineering colleges to automate the evaluation of scanned answer papers using Local OCR and AI-driven Semantic Analysis.

## 🌑 Imperial Midnight UI
The system has been overhauled with the **Imperial Midnight** design system, featuring:
- **Deep Charcoal Aesthetics**: Low-eye-strain, professional interface.
- **Glassmorphism**: Sophisticated translucent components.
- **Micro-animations**: Smooth, responsive feedback on all interactions.
- **Sidebar Navigation**: Efficient, persistence-based controls.

## 🚀 Setup Instructions

### 1. Prerequisites
- **Node.js** (v18+) installed.
- **TensorFlow.js** dependencies (included in `package.json`).
- *Note: No OpenAI API key is required as the system uses a local Universal Sentence Encoder.*

### 2. Backend Setup
1. Navigate to the `backend/` directory.
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Ensure Ollama is installed to run local inference:
   ```bash
   ollama pull gemma
   ollama serve
   ```
4. Set up the Python virtual environment for EasyOCR:
   ```bash
   python3 -m venv .venv_easyocr
   source .venv_easyocr/bin/activate
   pip install -r requirements.txt
   ```
5. Start the server:
   ```bash
   npm run dev
   ```
   *The server will initialize the TensorFlow model on the first request (Logic Node Alpha).*

### 3. Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Access the app at `http://localhost:3000` (or `3001` if port 3000 is occupied).*

## 🧠 Intelligence Engine
The evaluation pipeline is a robust two-stage architecture:
1. **EasyOCR Extraction**: Uses a detached Python process with `easyocr` and OpenCV adaptive thresholding to precisely read handwritten and printed student answers.
2. **Gemma Local AI Evaluation**: A clean text-only feed into the `gemma` reasoning model matched against the extracted student text to the original question context, outputting strict JSON evaluation grades and feedback privately via localhost `11434`.

## 📂 Architecture
- `backend/services/`: Local OCR, Regex-based Parser, and TF.js Evaluation logic.
- `backend/data/`: Persistent JSON ledger for exams and student records.
- `frontend/src/pages/`: Redesigned components in the Imperial Midnight theme.
