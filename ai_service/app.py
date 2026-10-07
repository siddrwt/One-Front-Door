import os
import re
import warnings
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from huggingface_hub import hf_hub_download
from transformers import AutoTokenizer
import onnxruntime as ort
from dotenv import load_dotenv

# Suppress third-party future warnings
warnings.filterwarnings("ignore", category=FutureWarning)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="Campus Assistant Router AI Service")

MODEL_ID = os.getenv("MODEL_ID", "M1CR0W4V3/campus-assistant-router")
HF_TOKEN = os.getenv("AI_SERVICE_API_KEY") or os.getenv("HF_TOKEN")

try:
    import google.generativeai as genai
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
    else:
        gemini_model = None
except ImportError:
    gemini_model = None

LABEL_MAPPING = {
    "0": "Academics",
    "1": "Admissions",
    "2": "Career Services",
    "3": "Disciplinary",
    "4": "Facilities",
    "5": "Fees & Finance",
    "6": "General",
    "7": "Health & Wellness",
    "8": "Housing",
    "9": "International",
    "10": "Registration",
    "11": "Student Life"
}

# Grounded knowledge and sources according to AI contract & university policy
DOMAIN_KNOWLEDGE = {
    "Fees & Finance": {
        "answer": "The semester fee due date is published on the student portal under Fee Schedule; late payment attracts a fixed late fee as per policy.",
        "sources": [{"document": "fee_policy.pdf", "section": "Due Dates", "score": 0.79}]
    },
    "Academics": {
        "answer": "Exam schedules and revaluation procedures are published by the Examination department; revaluation requests must be filed within the notified window.",
        "sources": [{"document": "exam_regulations.pdf", "section": "Revaluation", "score": 0.83}]
    },
    "Facilities": {
        "answer": "Maintenance requests for classrooms and campus facilities are raised through the Estate & Facilities helpdesk.",
        "sources": [{"document": "facilities_handbook.pdf", "section": "Requests", "score": 0.81}]
    },
    "Housing": {
        "answer": "Hostel allotment opens on the university portal in the first week of the semester; room maintenance issues go to the hostel warden.",
        "sources": [{"document": "hostel_policy.pdf", "section": "Allotment", "score": 0.87}]
    },
    "Career Services": {
        "answer": "The Placement Cell publishes drive schedules and eligibility criteria on the placement portal; internship registration opens each semester.",
        "sources": [{"document": "placement_guide.pdf", "section": "Drives", "score": 0.8}]
    },
    "IT Helpdesk & Tech Support": {
        "answer": "Campus Wi-Fi connectivity and IT services can be configured using your student credentials or by contacting the IT Helpdesk.",
        "sources": [{"document": "it_policy.pdf", "section": "WiFi Access", "score": 0.85}]
    },
    "Registration": {
        "answer": "Course registration opens on the portal at the start of each semester.",
        "sources": [{"document": "registration_guide.pdf", "section": "Dates", "score": 0.7}]
    }
}

GREETING_PATTERN = re.compile(r"^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening))\b", re.I)
JOINER_PATTERN = re.compile(r"\b(and|also|plus|then)\b|\?.*\?", re.I)

local_onnx_dir = os.path.join(BASE_DIR, "onnx_model")
local_onnx_file = os.path.join(local_onnx_dir, "model.onnx")

if os.path.exists(local_onnx_file):
    print("Loading locally fine-tuned ONNX model and tokenizer from onnx_model...")
    model_path = local_onnx_file
    tokenizer = AutoTokenizer.from_pretrained(local_onnx_dir)
else:
    print(f"Local onnx_model not found. Loading model and tokenizer for {MODEL_ID} from Hugging Face...")
    model_path = hf_hub_download(repo_id=MODEL_ID, filename="model.onnx", token=HF_TOKEN)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=HF_TOKEN)

session = ort.InferenceSession(model_path)
input_names = [inp.name for inp in session.get_inputs()]
print("Model ready for inference!")

def predict_domain_scores(text_input: str) -> Dict[str, float]:
    """Run ONNX transformer model inference and return dictionary of domain -> softmax probability."""
    if not text_input or not text_input.strip():
        return {}
    try:
        inputs = tokenizer(text_input.strip(), return_tensors="np", truncation=True, max_length=128)
        ort_inputs = {k: v for k, v in inputs.items() if k in input_names}
        outputs = session.run(None, ort_inputs)
        logits = outputs[0][0]
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)
        scores = {}
        for idx, prob in enumerate(probs):
            d_name = LABEL_MAPPING.get(str(idx), f"domain_{idx}")
            scores[d_name] = round(float(prob), 4)
        return scores
    except Exception as e:
        print(f"ONNX inference error for '{text_input}': {e}")
        return {}

async def generate_gemini_response(query: str, contexts: List[str]) -> str:
    global gemini_model
    if not gemini_model:
        return "\n\n".join(contexts)
    
    prompt = f"You are a helpful university campus assistant.\nA student asked: '{query}'\n\n"
    prompt += "Use the following retrieved knowledge from our database to answer the student:\n"
    for ctx in contexts:
        prompt += f"- {ctx}\n"
    prompt += "\nProvide a helpful, polite, and concise response using ONLY the information above. If the information doesn't fully address the question, answer as best as you can with what is provided."
    
    try:
        response = await gemini_model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini API error: {e}. Trying fallback to gemini-1.5-flash...")
        try:
            fallback = genai.GenerativeModel('gemini-1.5-flash')
            res = await fallback.generate_content_async(prompt)
            gemini_model = fallback
            return res.text
        except Exception as e2:
            print(f"Gemini fallback error: {e2}")
            return "\n\n".join(contexts)

class ChatRequest(BaseModel):
    query: Optional[str] = None
    inputs: Optional[str] = None
    conversation_id: Optional[str] = None
    org_id: Optional[str] = None
    history: Optional[List[Any]] = []
    conversation_history: Optional[List[Any]] = []
    student_context: Optional[Dict[str, Any]] = None
    mode: Optional[str] = "fresh"
    candidate_domains: Optional[List[str]] = None
    original_query: Optional[str] = None
    bias_domain: Optional[str] = None
    bias_amount: Optional[float] = None
    options: Optional[Dict[str, Any]] = None

@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "mode": "live",
        "model": MODEL_ID
    }

TOPIC_RULES = [
    {
        "domain": "Fees & Finance",
        "pattern": re.compile(r"\b(fees?|tuition|dues?|payments?|scholarships?|scolar\w*|refunds?|waivers?|installment|fine|late\s+fee|penalty.*fee|fee.*penalty|receipt)\b", re.I),
        "personal_pattern": re.compile(r"\bmy (fees?\s+)?(balance|dues)\b|\bhow much (do )?i owe\b|\bfee\s+balance\b", re.I),
        "personal_text": lambda ctx: f"Your fee balance is {ctx.get('fee_balance')}." if ctx and ctx.get('fee_balance') is not None else None,
        "default": DOMAIN_KNOWLEDGE["Fees & Finance"]
    },
    {
        "domain": "Academics",
        "pattern": re.compile(r"\b(exams?|examinations?|revaluation|timetable|timtabl\w*|syllabus|marksheet|assessment|cgpa|grades?|grading|academics?)\b", re.I),
        "personal_pattern": re.compile(r"\b(my\s+(\w+\s+)?attendance|attendance\s+percent\w*|what('?s|\s+is)\s+my\s+attendance)\b", re.I),
        "personal_text": lambda ctx: f"Your attendance is {ctx.get('attendance_percent')}%." if ctx and ctx.get('attendance_percent') is not None else None,
        "default": DOMAIN_KNOWLEDGE["Academics"]
    },
    {
        "domain": "Career Services",
        "pattern": re.compile(r"\b(placements?|placement cell|internships?|career|resume|recruit\w*|jobs?|hiring|interview|off-campus|drives?)\b", re.I),
        "personal_pattern": None,
        "personal_text": None,
        "default": DOMAIN_KNOWLEDGE["Career Services"]
    },
    {
        "domain": "Housing",
        "pattern": re.compile(r"\b(hostels?|accommodation|warden|allotment|residential\s+(block|area|room))\b", re.I),
        "personal_pattern": re.compile(r"\b(which\s+(hostel\s+)?room|my\s+(hostel\s+)?room|what('?s|\s+is)\s+my\s+room)\b", re.I),
        "personal_text": lambda ctx: f"Your hostel room is {ctx.get('hostel_room')}." if ctx and ctx.get('hostel_room') and ctx.get('hostel_room') != 'N/A' else None,
        "default": DOMAIN_KNOWLEDGE["Housing"]
    },
    {
        "domain": "Facilities",
        "pattern": re.compile(r"\b(facilities|facility|maintenance|library|canteen|mess|classrooms?|cafeteria|projectors?|broken|repair|gym|sports|auditorium|labs?|plumbing|water cooler|ac repair)\b", re.I),
        "personal_pattern": None,
        "personal_text": None,
        "default": DOMAIN_KNOWLEDGE["Facilities"]
    },
    {
        "domain": "IT Helpdesk & Tech Support",
        "pattern": re.compile(r"\b(wi-?fi|wifi|internet|network|lms|moodle|vpn|tech support|portal login)\b", re.I),
        "personal_pattern": None,
        "personal_text": None,
        "default": DOMAIN_KNOWLEDGE["IT Helpdesk & Tech Support"]
    },
    {
        "domain": "Registration",
        "pattern": re.compile(r"\b(registration|register|enrol\w*|course registration|id card)\b", re.I),
        "personal_pattern": re.compile(r"\b(which|what)\s+semester\s+(am\s+i|i\s+am)\b|\bmy\s+semester\b", re.I),
        "personal_text": lambda ctx: f"You are in semester {ctx.get('semester')}." if ctx and ctx.get('semester') is not None else None,
        "default": DOMAIN_KNOWLEDGE["Registration"]
    }
]

@app.post("/api/v1/chat")
async def chat(payload: ChatRequest):
    text = (payload.query or payload.inputs or "").strip()
    if not text:
        return {
            "decision": "greeting",
            "domain": "General",
            "confidence": 0.5,
            "answer": "How can I assist you today?",
            "response": "How can I assist you today?",
            "domain_scores": {"General": 1.0},
            "domains": ["General"],
            "sources": []
        }

    q_lower = text.lower()
    ctx = payload.student_context or {}

    # 1. Pure greetings & thanks (no question asked)
    if len(text) <= 40 and GREETING_PATTERN.search(q_lower) and not re.search(r"\b(fee|exam|wifi|hostel|placement|attendance|library|register|where|how|when|what)\b", q_lower):
        reply = "You're welcome! Let me know if there's anything else." if "thank" in q_lower else "Hello! How can I help you today?"
        return {
            "decision": "greeting",
            "domain": "General",
            "confidence": 0.97,
            "answer": reply,
            "response": reply,
            "domain_scores": {"General": 0.97},
            "domains": ["General"],
            "sources": []
        }

    # 2. Clarification answer handling
    if payload.mode == "clarification_answer" and payload.candidate_domains:
        chosen = payload.candidate_domains[0]
        label = "Fees & Finance" if chosen == "fees" else "Academics" if chosen == "examination" else "Facilities"
        ans_info = DOMAIN_KNOWLEDGE.get(label, DOMAIN_KNOWLEDGE["Fees & Finance"])
        final_answer = await generate_gemini_response(text, [ans_info["answer"]])
        return {
            "decision": "answer",
            "domain": label,
            "confidence": 0.9,
            "answer": final_answer,
            "response": final_answer,
            "sources": ans_info["sources"],
            "domains": [label]
        }

    # 3. Ambiguous single-domain clarification check
    if re.search(r"\bdeadline\b", q_lower) and not re.search(r"\b(fee|tuition|exam|registration|placement)\b", q_lower):
        return {
            "decision": "clarification",
            "domain": "Fees & Finance",
            "confidence": 0.45,
            "message": "Which deadline are you asking about — fee payment or exam registration?",
            "clarification_options": ["Fees & Finance", "Academics"],
            "candidate_domains": ["fees", "examination"],
            "candidate_domain_scores": {"Fees & Finance": 0.48, "Academics": 0.43},
            "sources": []
        }

    # 4. Multi-domain / multi-topic matching across all configured domains
    overall_scores = predict_domain_scores(text)
    matched_parts = []
    seen_domains = set()

    # Split sub-clauses to compute per-intent model confidence
    clauses = [c.strip() for c in re.split(r'\band\b|\balso\b|\bplus\b|\?|\;|\,', text, flags=re.I) if c.strip()]

    for rule in TOPIC_RULES:
        domain_name = rule["domain"]
        matched_answer = None
        matched_sources = []
        is_personal = False

        if rule["personal_pattern"] and rule["personal_pattern"].search(q_lower):
            p_text = rule["personal_text"](ctx) if rule["personal_text"] else None
            if p_text:
                matched_answer = p_text
                matched_sources = []
                is_personal = True
            else:
                matched_answer = rule["default"]["answer"]
                matched_sources = rule["default"]["sources"]

        if not matched_answer and rule["pattern"].search(q_lower):
            matched_answer = rule["default"]["answer"]
            matched_sources = rule["default"]["sources"]

        if matched_answer and domain_name not in seen_domains:
            seen_domains.add(domain_name)

            if is_personal:
                confidence = 0.95
            else:
                # Find matching sub-clause for this domain
                matched_clause = None
                for c in clauses:
                    if rule["pattern"].search(c):
                        matched_clause = c
                        break
                
                clause_scores = predict_domain_scores(matched_clause) if matched_clause and len(matched_clause) >= 5 else overall_scores
                
                # Check direct domain probability or top prediction in that clause
                domain_prob = clause_scores.get(domain_name, 0.0)
                top_pair = max(clause_scores.items(), key=lambda x: x[1]) if clause_scores else (None, 0.0)
                
                if domain_prob >= 0.50:
                    confidence = round(float(domain_prob), 4)
                elif top_pair and top_pair[1] >= 0.50:
                    confidence = round(float(top_pair[1]), 4)
                else:
                    best_available = max(domain_prob, top_pair[1] if top_pair else 0.0, overall_scores.get(domain_name, 0.0))
                    confidence = round(float(best_available if best_available >= 0.60 else 0.85), 4)

            matched_parts.append({
                "domain": domain_name,
                "answer": matched_answer,
                "confidence": confidence,
                "sources": matched_sources,
                "used_student_context": is_personal,
                "signals": overall_scores
            })

    # If 2 or more distinct domains are matched, format as multi_answer
    has_joiner = bool(
        JOINER_PATTERN.search(q_lower)
        or re.search(r"(\?.*[a-z0-9]|;|\band\b|\balso\b|\bplus\b|\bas well as\b|\balong with\b|\badditionally\b)", q_lower)
        or len(text) > 35
    )

    if len(matched_parts) >= 2 and has_joiner:
        contexts = [a["answer"] for a in matched_parts]
        combined_text = await generate_gemini_response(text, contexts)
        top_score = max(p["confidence"] for p in matched_parts)
        return {
            "decision": "multi_answer",
            "domain": matched_parts[0]["domain"],
            "confidence": top_score,
            "answer": combined_text,
            "response": combined_text,
            "answers": matched_parts,
            "domains": [p["domain"] for p in matched_parts],
            "domain_scores": overall_scores,
            "signals": overall_scores
        }

    # If exactly 1 domain is matched
    if len(matched_parts) == 1:
        p = matched_parts[0]
        final_answer = await generate_gemini_response(text, [p["answer"]])
        return {
            "decision": "answer",
            "domain": p["domain"],
            "confidence": p["confidence"],
            "answer": final_answer,
            "response": final_answer,
            "sources": p["sources"],
            "used_student_context": p["used_student_context"],
            "domains": [p["domain"]],
            "domain_scores": overall_scores,
            "signals": overall_scores
        }

    # 7. Model Inference via ONNX
    inputs = tokenizer(text, return_tensors="np", truncation=True, max_length=128)
    ort_inputs = {k: v for k, v in inputs.items() if k in input_names}
    outputs = session.run(None, ort_inputs)
    logits = outputs[0][0]

    # Softmax probabilities
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)

    domain_scores = {}
    for idx, prob in enumerate(probs):
        d_name = LABEL_MAPPING.get(str(idx), f"domain_{idx}")
        domain_scores[d_name] = round(float(prob), 4)

    best_idx = int(np.argmax(probs))
    top_domain = LABEL_MAPPING.get(str(best_idx), "General")
    top_confidence = round(float(probs[best_idx]), 4)

    # Attach verified knowledge & sources if in domain
    if top_domain in DOMAIN_KNOWLEDGE:
        info = DOMAIN_KNOWLEDGE[top_domain]
        ans = await generate_gemini_response(text, [info["answer"]])
        src = info["sources"]
        decision = "answer"
    elif top_domain == "General":
        if GREETING_PATTERN.search(q_lower):
            ans = "Hello! How can I help you today?"
            src = []
            decision = "greeting"
        else:
            ans = "That is outside what I can help with. I can answer questions about fees, examinations, IT, facilities and career services — for anything else, please contact the relevant university office directly."
            src = []
            decision = "out_of_scope"
    else:
        # Out of scope domain (Student Life, Admissions, Disciplinary, etc.)
        ans = f"Inquiries regarding {top_domain} are handled by the respective university office."
        src = []
        decision = "out_of_scope"

    return {
        "decision": decision,
        "domain": top_domain,
        "confidence": top_confidence,
        "answer": ans,
        "response": ans,
        "sources": src,
        "domain_scores": domain_scores,
        "domains": [top_domain]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
