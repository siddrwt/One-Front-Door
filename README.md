# One Front Door (Campus Assistant)

A multi-domain campus assistant and query router designed to streamline student support across universities (e.g., CAMU and university portals).

## Architecture

The system consists of two primary services:

1. **Backend (\/backend\)**:
   - Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.
   - Handles student authentication, session management, multi-turn conversations, domain routing, IT pre-routing guardrails, feedback collection, and support ticketing.
   - Provides mock AI fallback capabilities for offline evaluation and testing.

2. **AI Service (\/ai_service\)**:
   - Built with **FastAPI** and **ONNX Runtime**.
   - Uses Hugging Face transformer models (e.g., \M1CR0W4V3/campus-assistant-router\) to classify student inquiries into appropriate campus administrative domains (Finance, Academic, IT Support, Admissions, etc.) with confidence scores and explainability.

---

## Getting Started

### 1. AI Service Setup (Python)

\\\ash
cd ai_service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --host 127.0.0.1 --port 8000
\\\

### 2. Backend Setup (Node.js)

\\\ash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm run dev
\\\

### 3. Running Tests & Evaluations

\\\ash
cd backend
# Run test suite
npm test

# Run query evaluation against dataset
npm run eval
\\\

---

## Environment Configuration

Both \ackend\ and \i_service\ include \.env.example\ templates. Ensure you never commit actual secret keys or credentials to version control.
