# One Front Door (Campus Assistant)

A multi-domain campus assistant and intelligent query router designed to streamline student support across university administrative departments and portals (such as CAMU).

---

## 🌟 Key Capabilities

- **Multi-Domain Intent Decomposition**: Automatically partitions complex, multi-intent inquiries (e.g. *"What is the fee deadline and where is the placement cell?"*) and routes each intent to its corresponding university department with verified citations.
- **Dynamic Neural Classification**: Powered by an ONNX-optimized transformer classifier (`M1CR0W4V3/campus-assistant-router`) to generate continuous softmax confidence scores and explainability signals across administrative domains.
- **Grounded Student Context**: Securely retrieves authenticated student record data (such as live attendance %, hostel room allotment, and fee balance) without exposing private information across sessions.
- **Guardrails & Escalation Ticketing**: Out-of-scope questions or critical IT failures automatically generate support tickets in MongoDB with unique tracking IDs.
- **Explainable Routing Mesh**: Transparently visualizes confidence scores, department routing targets, and source documents directly in the student chat interface.

---

## 🏛️ System Architecture

```text
                        ┌───────────────────────────────┐
                        │     React Frontend (Vite)     │
                        │    CAMU Student Chat Portal   │
                        └──────────────┬────────────────┘
                                       │ HTTP / JSON
                                       ▼
                        ┌───────────────────────────────┐
                        │    Node.js Express Backend    │
                        │   JWT Auth & Rate Limiting    │
                        │   Context Service & Tickets   │
                        │   MongoDB Database Storage    │
                        └──────────────┬────────────────┘
                                       │ HTTP POST (/api/v1/chat)
                                       ▼
                        ┌───────────────────────────────┐
                        │    Python AI Service (FastAPI)│
                        │    ONNX Runtime Transformer   │
                        │   Multi-Intent Decomposition  │
                        └───────────────────────────────┘
```

1. **Frontend (`/frontend`)**:
   - Built with **React 18**, **Vite**, and **Vanilla CSS**.
   - Features responsive chat threads, multi-domain decomposed response cards, quick query chips, and ticket history.
2. **Backend (`/backend`)**:
   - Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**.
   - Manages JWT student authentication, multi-turn conversation memory, IT pre-routing guardrails, feedback collection, and administrative ticketing.
   - Includes full fallback support for offline development (`USE_MOCK_AI=true`).
3. **AI Service (`/ai_service`)**:
   - Built with **FastAPI**, **Uvicorn**, and **ONNX Runtime**.
   - Leverages Hugging Face tokenizers and ONNX embeddings for high-throughput, low-latency classification across campus domains.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 to v3.12
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI

---

### Step 1: Start the AI Service (Port 8000)

```powershell
cd ai_service

# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate    # On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server with hot-reload
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
*Health check URL: `http://127.0.0.1:8000/health`*

---

### Step 2: Start the Backend (Port 5000)

```powershell
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env to set your MONGO_URI and JWT_SECRET

# Seed demo student accounts (run once)
npm run seed:students

# Start backend dev server with nodemon
npm run dev
```
*Health check URL: `http://localhost:5000/api/health`*

---

### Step 3: Start the Frontend (Port 3000)

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Open your browser and navigate to: `http://localhost:3000`*

---

## 🔑 Demo Student Accounts

Pre-seeded accounts available for testing student-context queries:

| Student ID | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **BU2023CSE045** | Aryan Sharma | `aryan.sharma@demo.camu.edu` | `demoPass123` | B.Tech CSE (Sem 5), 87% Attendance, Room C-204, Nil balance |
| **BU2023ECE012** | Priya Verma | `priya.verma@demo.camu.edu` | `demoPass123` | B.Tech ECE (Sem 3), 91% Attendance, Room A-118, ₹15,000 balance |

---

## 🧪 Sample Inquiries to Try

### 1. Single-Domain Policy Queries
- *"When is the semester tuition fee payment deadline?"* $\rightarrow$ **The Fees Department**
- *"Where can I download my examination hall ticket?"* $\rightarrow$ **The Examination Department**
- *"How can I book a discussion room in the campus library?"* $\rightarrow$ **Estate & Facilities**

### 2. Multi-Domain Inquiries (Compound Questions)
- *"What is the fee deadline and where is the placement cell?"* $\rightarrow$ Routes simultaneously to **The Fees Department** & **The Placement Cell**.
- *"When is the tuition fee due and how do I connect to campus wifi?"* $\rightarrow$ Routes to **The Fees Department** & **The IT Department**.
- *"Where do I report a hostel room issue and how do I apply for exam revaluation?"* $\rightarrow$ Routes to **Estate & Facilities** & **The Examination Department**.

### 3. Student-Context Grounded Questions
- *"What is my attendance?"* $\rightarrow$ Returns authenticated student attendance % from student record.
- *"What is my room number?"* $\rightarrow$ Returns allotted hostel room (`C-204`).
- *"What is my attendance and when is the fee due?"* $\rightarrow$ Decomposes personal record data with university fee policy.

### 4. Human Handoff & Escalations
- *"Can I bring an exotic pet to stay in the campus hostel?"* $\rightarrow$ Recognized as out of scope; creates an escalated support ticket with a reference ID.

---

## 🔬 Testing & Evaluation

Run the automated test suite from the `/backend` directory:

```powershell
cd backend

# Run the complete test suite (guardrails, adapter, flow, feedback)
npm test

# Run query evaluation report against the test dataset
npm run eval

# Run explainability verification test
node test/testExplainabilityResponse.js
```

---

## 📄 License

This project is licensed under the MIT License.
