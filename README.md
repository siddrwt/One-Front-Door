# One Front Door (Campus Assistant) - v2.0

A multi-domain campus assistant and intelligent query router designed to streamline student support across university administrative departments and portals (such as CAMU).

---

## 🌟 Key Capabilities

- **Interactive Routing Visualizer (New in v2)**: A dedicated live telemetry panel that illustrates the internal routing decision path via a graphical node flow diagram, continuous softmax probability distribution meters across all 5 domains, and cited RAG policy evidence.
- **Multi-Domain Intent Decomposition**: Automatically partitions complex, multi-intent inquiries (e.g. *"What is the fee deadline and where is the placement cell?"*) and routes each intent to its corresponding university department with verified citations.
- **Dynamic Neural Classification**: Powered by an ONNX-optimized transformer classifier (`M1CR0W4V3/campus-assistant-router`) to generate real-time softmax confidence scores and explainability signals across administrative domains.
- **Grounded Student Context**: Securely retrieves authenticated student record data (such as live attendance %, hostel room allotment, and fee balance) without exposing private information across sessions.
- **Robust Guardrails & Automated Ticketing**: Out-of-scope inquiries and critical IT technical issues (e.g. Wi-Fi down, login failures) automatically generate tracked support tickets in MongoDB with unique reference IDs.
- **Private Data Protection**: Proactively intercepts inquiries regarding unheld student records (e.g. marks, results, CGPA) and guides students to the official CAMU records portal.

---

## 🏛️ System Architecture

```text
                        ┌────────────────────────────────────────────────────────┐
                        │                 React Frontend (Vite)                  │
                        │   CAMU Student Portal & Visual Route Inspector         │
                        └──────────────────────────┬─────────────────────────────┘
                                                   │ HTTP / JSON
                                                   ▼
                        ┌────────────────────────────────────────────────────────┐
                        │                Node.js Express Backend                 │
                        │   JWT Auth • Context Injection • Guardrails & Tickets   │
                        │   MongoDB Database Storage & Status Management         │
                        └──────────────────────────┬─────────────────────────────┘
                                                   │ HTTP POST (/api/v1/chat)
                                                   ▼
                        ┌────────────────────────────────────────────────────────┐
                        │               Python AI Service (FastAPI)              │
                        │   ONNX Runtime Transformer • Intent Decomposition      │
                        │   Grounded Domain Knowledge & Confidence Scoring       │
                        └────────────────────────────────────────────────────────┘
```

1. **Frontend (`/frontend`)**:
   - Built with **React**, **Vite**, and **Vanilla CSS**.
   - Features responsive chat threads, dedicated **Visual Routing Inspector** side panel with live probability meters, multi-domain decomposed response cards, and support ticket management.
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

### Step 3: Start the Frontend

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Open your browser and navigate to: `http://localhost:5173` (or the port indicated by Vite)*

---

## 🔑 Demo Student Accounts

Pre-seeded accounts available for testing student-context queries:

| Student ID | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **BU2023CSE045** | Aryan Sharma | `aryan.sharma@demo.camu.edu` | `demoPass123` | B.Tech CSE (Sem 5), 87% Attendance, Room C-204, Nil balance |
| **BU2023ECE012** | Priya Verma | `priya.verma@demo.camu.edu` | `demoPass123` | B.Tech ECE (Sem 3), 91% Attendance, Room A-118, ₹15,000 balance |

---

## 🧪 Inquiries to Try & Routing Behaviors

### 1. Single-Domain Policy Inquiries
- *"When is the semester tuition fee payment deadline?"* $\rightarrow$ **The Fees Department**
- *"What is the procedure and deadline to apply for revaluation?"* $\rightarrow$ **The Examination Department**
- *"How do I submit a maintenance request for classroom facilities?"* $\rightarrow$ **Estate & Facilities**
- *"Where is the placement cell and how do I register for campus drives?"* $\rightarrow$ **The Placement Cell**

### 2. Multi-Domain Inquiries (Compound Questions)
- *"What is the fee deadline and where is the placement cell?"* $\rightarrow$ Decomposes into **The Fees Department** & **The Placement Cell**.
- *"When is the semester fee due and when do exams start?"* $\rightarrow$ Decomposes into **The Fees Department** & **The Examination Department**.
- *"Where is the campus library and how do I register for placements?"* $\rightarrow$ Decomposes into **Estate & Facilities** & **The Placement Cell**.

### 3. Student-Context Grounded Questions
- *"What is my attendance?"* $\rightarrow$ Returns authenticated student attendance % (e.g. `87%`).
- *"What is my fee balance?"* $\rightarrow$ Returns authenticated student fee balance (e.g. `Nil balance`).
- *"Which hostel room is allotted to me?"* $\rightarrow$ Returns allotted hostel room (`C-204`).

### 4. IT Support & Automated Ticket Creation
- *"My campus Wi-Fi is not connecting in hostel block C"* $\rightarrow$ Detects IT support requirement; automatically generates a tracked support ticket in MongoDB.
- *"Unable to log in to student LMS portal, getting password error"* $\rightarrow$ Creates an escalated IT support ticket.

### 5. Private Data Guardrails
- *"What are my exam marks and grades?"* $\rightarrow$ Intercepted by personal data guardrail; directs student to check CAMU portal directly.

### 6. Out-of-Scope Questions
- *"Tell me about student clubs and societies"* $\rightarrow$ Out-of-scope guidance pointing to relevant university administration.
- *"What is the disciplinary action for ragging?"* $\rightarrow$ Out-of-scope guidance.

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
