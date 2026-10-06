const axios = require('axios');

async function runTest() {
  console.log('--- Step 1: Student Login ---');
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    email: 'aryan.sharma@demo.camu.edu',
    password: 'demoPass123'
  });
  const token = loginRes.data.token || loginRes.data.data?.token;
  console.log('Login successful! Authenticated as Aryan Sharma (BU2023CSE045)\n');

  const client = axios.create({
    baseURL: 'http://localhost:5000',
    headers: { Authorization: `Bearer ${token}` }
  });

  const questions = [
    {
      id: 1,
      category: 'Single-Domain Policy (Fees & Finance)',
      query: 'When is the semester tuition fee payment deadline and what happens if I pay late?'
    },
    {
      id: 2,
      category: 'Compound Multi-Domain Query (Fees & Finance + Career Services)',
      query: 'What is the fee payment deadline and where is the placement cell?'
    },
    {
      id: 3,
      category: 'Authenticated Student Context Query (Attendance & Hostel Room)',
      query: 'What is my attendance and what is my hostel room number?'
    },
    {
      id: 4,
      category: 'Campus Facilities & IT Services (Facilities + IT Helpdesk)',
      query: 'How do I report a classroom maintenance issue and how do I connect to campus wifi?'
    },
    {
      id: 5,
      category: 'Out of Scope / Escalation Guardrail',
      query: 'Can I bring an exotic pet snake to live with me in the hostel dorm?'
    }
  ];

  for (const q of questions) {
    console.log('======================================================================');
    console.log(`TEST ${q.id}: ${q.category}`);
    console.log(`Student Query: "${q.query}"`);
    console.log('----------------------------------------------------------------------');
    try {
      const startTime = Date.now();
      const res = await client.post('/api/chat', { message: q.query });
      const durationMs = Date.now() - startTime;

      console.log(`⏱️ Latency: ${durationMs}ms`);
      console.log(`🎯 Routing Decision / Type: ${res.data.type || res.data.decision}`);
      console.log(`🏷️ Primary Domain: ${res.data.domain}`);
      console.log(`🏛️ Domains Involved: ${JSON.stringify(res.data.domains || [res.data.domain])}`);
      console.log(`📈 Model Confidence Score: ${res.data.routingScore ?? res.data.confidence ?? 'N/A'}`);
      console.log(`\n💬 Generated Answer:\n${res.data.answer || res.data.response}\n`);
      
      if (res.data.sources && res.data.sources.length > 0) {
        console.log(`📚 Verified Sources Cited (${res.data.sources.length}):`);
        res.data.sources.forEach((s, idx) => {
          console.log(`   [${idx + 1}] ${s.document || s.title} | Section: ${s.section || 'General'} | Relevancy: ${s.score || 'N/A'}`);
        });
      }

      if (res.data.answers && Array.isArray(res.data.answers)) {
        console.log(`\n🔀 Decomposed Domain Answers:`);
        res.data.answers.forEach((ans, idx) => {
          console.log(`   Domain [${idx + 1}]: ${ans.domain} (Confidence: ${ans.routingScore ?? ans.confidence})`);
          console.log(`   Text: ${ans.answer}`);
        });
      }

      if (res.data.ticket) {
        console.log(`🎫 Escalation Ticket Created: ID ${res.data.ticket.ticketId || res.data.ticket.id} (${res.data.ticket.status})`);
      }

      if (res.data.signals) {
        console.log(`\n🧠 ONNX Model Softmax Distribution:`);
        const sortedSignals = Object.entries(res.data.signals).sort((a, b) => b[1] - a[1]);
        sortedSignals.slice(0, 4).forEach(([domain, score]) => {
          console.log(`   - ${domain}: ${(score * 100).toFixed(2)}%`);
        });
      }
    } catch (err) {
      console.error(`❌ Error in Test ${q.id}:`, err.response ? err.response.data : err.message);
    }
    console.log('\n');
  }
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
});
