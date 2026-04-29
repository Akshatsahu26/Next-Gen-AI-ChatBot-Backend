# BankSeva AI Chatbot (Groq + RAG)

This refactor replaces legacy AI providers with a production-ready Groq-only architecture.

## Architecture (5 Layers)

1. **Intent Detection Layer**: `src/services/intent.service.js`
2. **RAG Retrieval Layer**:
   - Knowledge base: `src/data/knowledgeBase.js`
   - Embeddings: `src/services/rag/embedding.service.js`
   - Vector store: `src/services/rag/vectorStore.service.js`
   - Retrieval: `src/services/rag/rag.service.js`
3. **Business Logic Layer**: `src/services/business.service.js`
4. **AI Generation Layer (Groq)**: `src/services/groqAI.js`
5. **Response Layer**: `src/services/response.service.js`

## Chat Flow

`User Input -> detectIntent -> (EMI? business calculation) -> RAG retrieval -> Groq generation -> API response`

## Environment

Use `backend/.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GROQ_API_KEY`
- `GROQ_MODEL` (default: `llama3-70b-8192`)

## Error Handling

Groq generation retries once. If both attempts fail:

`⚠️ Temporary AI issue. Please try again.`

## Frontend Voice Support

Existing widget uses:
- Web Speech API for speech-to-text
- SpeechSynthesis for text-to-speech auto-play

## Quick Local Verification

1. Business + RAG smoke checks:
   - `node scripts/test-chatbot.js`
2. Start backend:
   - `npm run dev`
3. Chat API:
   - `POST /api/chat`

## Example test prompts

- `hello`
- `emi`
- `emi 100000 10 12`
- `fraud message received`
- `loan not working`
