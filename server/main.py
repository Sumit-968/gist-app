from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.transcript import TranscriptService
from services.ai import AIService

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
transcript_service = TranscriptService()
try:
    ai_service = AIService()
except ValueError as e:
    print(f"Warning: {e}. AI features will fail.")

class VideoRequest(BaseModel):
    url: str

@app.post("/api/generate")
async def generate_notes(request: VideoRequest):
    # 1. Fetch Transcript
    print("Fetching transcript...")
    transcript_text, error = transcript_service.get_transcript(request.url)
    if error:
        error_msg = error.get('error') if isinstance(error, dict) else str(error)
        raise HTTPException(status_code=400, detail=error_msg)

    # 2. Generate AI Notes
    print("Generating AI notes...")
    ai_notes, ai_error = ai_service.generate_notes(transcript_text)
    if ai_error:
        raise HTTPException(status_code=500, detail=f"AI Error: {ai_error}")

    return {
        "status": "success",
        "markdown": ai_notes
    }

@app.get("/")
def read_root():
    return {"message": "Gist Backend Online"}