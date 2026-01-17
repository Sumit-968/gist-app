from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, Dict, Tuple
from services.transcript import TranscriptService
from services.ai import AIService
import os
import json
from datetime import datetime, timedelta
import hashlib
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow connection from ANYWHERE (Vercel, Localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
transcript_service = TranscriptService()
try:
    ai_service = AIService()
except ValueError as e:
    print(f"Warning: {e}. AI features will fail.")
    ai_service = None

# ==================== RATE LIMITING & STORAGE ====================

class RateLimiter:
    """In-memory rate limiter for free tier users"""
    
    MAX_FREE_REQUESTS = 3
    RESET_PERIOD_HOURS = 24
    
    def __init__(self):
        self.requests = {}  # {client_id: [timestamps]}
        
    def get_client_id(self, request: Request) -> str:
        """Generate client fingerprint from IP + User-Agent"""
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get('user-agent', 'unknown')
        fingerprint = f"{ip}:{user_agent}"
        return hashlib.sha256(fingerprint.encode()).hexdigest()[:16]
    
    def is_rate_limited(self, client_id: str) -> Tuple[bool, Dict]:
        """Check if client has exceeded rate limit"""
        now = datetime.now()
        
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Remove old requests outside reset period
        cutoff_time = now - timedelta(hours=self.RESET_PERIOD_HOURS)
        self.requests[client_id] = [
            ts for ts in self.requests[client_id] 
            if ts > cutoff_time
        ]
        
        remaining = self.MAX_FREE_REQUESTS - len(self.requests[client_id])
        
        if len(self.requests[client_id]) >= self.MAX_FREE_REQUESTS:
            reset_time = self.requests[client_id][0] + timedelta(hours=self.RESET_PERIOD_HOURS)
            return True, {
                "remaining": 0,
                "limit": self.MAX_FREE_REQUESTS,
                "reset_at": reset_time.isoformat(),
                "reset_in_hours": round((reset_time - now).total_seconds() / 3600, 1)
            }
        
        return False, {
            "remaining": remaining,
            "limit": self.MAX_FREE_REQUESTS,
            "used": len(self.requests[client_id])
        }
    
    def record_request(self, client_id: str):
        """Record a new request"""
        self.requests[client_id].append(datetime.now())


class FeedbackStorage:
    """Store user feedback to JSON file"""
    
    FEEDBACK_FILE = "feedback.json"
    
    @staticmethod
    def save_feedback(feedback_data: dict) -> bool:
        """Save feedback to file"""
        try:
            # Load existing feedback
            if os.path.exists(FeedbackStorage.FEEDBACK_FILE):
                with open(FeedbackStorage.FEEDBACK_FILE, 'r') as f:
                    all_feedback = json.load(f)
            else:
                all_feedback = []
            
            # Add new feedback with timestamp
            feedback_data['timestamp'] = datetime.now().isoformat()
            all_feedback.append(feedback_data)
            
            # Save back
            with open(FeedbackStorage.FEEDBACK_FILE, 'w') as f:
                json.dump(all_feedback, f, indent=2)
            
            logger.info(f"Feedback saved: {feedback_data.get('email', 'anonymous')}")
            return True
        except Exception as e:
            logger.error(f"Failed to save feedback: {str(e)}")
            return False


def get_video_duration(video_url: str) -> Optional[int]:
    """Get video duration in seconds from YouTube"""
    try:
        from yt_dlp import YoutubeDL
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return info.get('duration')  # Duration in seconds
    except Exception as e:
        logger.warning(f"Could not fetch video duration: {str(e)}")
        return None

# ==================== MODELS ====================

class VideoRequest(BaseModel):
    url: str
    mode: Optional[str] = "cornell"
    
    @validator('url')
    def validate_url(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("URL must be a non-empty string")
        v = v.strip()
        if 'youtube.com' not in v and 'youtu.be' not in v:
            raise ValueError("Must be a valid YouTube URL")
        return v


class FeedbackRequest(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None
    mode_used: Optional[str] = None
    email: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if not isinstance(v, int) or v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

# ==================== INITIALIZE ====================

rate_limiter = RateLimiter()
feedback_storage = FeedbackStorage()

# ==================== API ENDPOINTS ====================

@app.post("/api/generate")
async def generate_notes(request_data: VideoRequest, request: Request):
    """Generate notes from YouTube video with rate limiting"""
    
    # 1. RATE LIMITING CHECK
    client_id = rate_limiter.get_client_id(request)
    is_limited, rate_info = rate_limiter.is_rate_limited(client_id)
    
    if is_limited:
        logger.warning(f"Rate limit exceeded for client: {client_id}")
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Free trial limit reached",
                "message": f"You've used all {rate_limiter.MAX_FREE_REQUESTS} free requests. Please try again after 24 hours or upgrade to paid plan.",
                "rate_limit_info": rate_info
            }
        )
    
    # 2. VIDEO DURATION VALIDATION
    logger.info(f"Checking video duration for: {request_data.url}")
    video_duration = get_video_duration(request_data.url)
    
    if video_duration:
        max_duration_seconds = 3600  # 1 hour for free tier
        if video_duration > max_duration_seconds:
            hours = round(video_duration / 3600, 1)
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Video too long",
                    "message": f"Free trial supports videos up to 1 hour. This video is {hours} hours long.",
                    "video_duration_hours": round(video_duration / 3600, 1),
                    "upgrade_message": "Upgrade to paid plan to process longer videos"
                }
            )
    
    # 3. VALIDATE AI SERVICE
    if ai_service is None:
        raise HTTPException(
            status_code=500,
            detail="AI service not initialized. Check GEMINI_API_KEY configuration."
        )
    
    # Validate mode
    valid_modes = ["cornell", "dev", "summary"]
    mode = request_data.mode if request_data.mode in valid_modes else "cornell"
    
    # 4. FETCH TRANSCRIPT
    print(f"\n{'='*60}")
    print(f"📥 Fetching transcript for: {request_data.url}")
    print(f"📋 Mode selected: {mode.upper()}")
    print(f"👤 Client: {client_id}")
    print(f"{'='*60}\n")
    
    transcript_text, error = transcript_service.get_transcript(request_data.url)
    
    if error:
        error_msg = error.get('error') if isinstance(error, dict) else str(error)
        logger.error(f"Transcript Error: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    print(f"✅ Transcript fetched successfully ({len(transcript_text)} characters)")
    
    # 5. GENERATE AI NOTES
    print(f"🤖 Generating {mode.upper()} notes using Gemini AI...")
    ai_notes, ai_error = ai_service.generate_notes(transcript_text, mode)
    
    if ai_error:
        logger.error(f"AI Generation Error: {ai_error}")
        raise HTTPException(status_code=500, detail=f"AI Error: {ai_error}")
    
    print(f"✅ Notes generated successfully")
    print(f"{'='*60}\n")
    
    # 6. RECORD REQUEST (only after successful generation)
    rate_limiter.record_request(client_id)
    
    # Get updated rate info
    _, updated_rate_info = rate_limiter.is_rate_limited(client_id)
    
    return {
        "status": "success",
        "markdown": ai_notes,
        "mode": mode,
        "rate_limit": updated_rate_info,
        "metadata": {
            "transcript_length": len(transcript_text),
            "notes_length": len(ai_notes),
            "mode_used": mode,
            "generated_at": datetime.now().isoformat()
        }
    }


@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackRequest, request: Request):
    """Submit user feedback"""
    
    try:
        client_id = rate_limiter.get_client_id(request)
        ip_address = request.client.host if request.client else "unknown"
        
        feedback_data = {
            "client_id": client_id,
            "ip_address": ip_address,
            "rating": feedback.rating,
            "comment": feedback.comment or "",
            "mode_used": feedback.mode_used or "unknown",
            "email": feedback.email or "anonymous"
        }
        
        success = feedback_storage.save_feedback(feedback_data)
        
        if success:
            return {
                "status": "success",
                "message": "Thank you for your feedback! We appreciate it.",
                "rating": feedback.rating
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to save feedback. Please try again."
            )
    
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing feedback: {str(e)}"
        )


@app.get("/api/rate-limit-info")
async def get_rate_limit_info(request: Request):
    """Get current rate limit status for client"""
    
    client_id = rate_limiter.get_client_id(request)
    is_limited, rate_info = rate_limiter.is_rate_limited(client_id)
    
    return {
        "client_id": client_id,
        "is_limited": is_limited,
        "rate_limit": rate_info,
        "tier": "free",
        "limits": {
            "requests_per_24h": rate_limiter.MAX_FREE_REQUESTS,
            "max_video_duration_minutes": 60,
            "reset_period_hours": rate_limiter.RESET_PERIOD_HOURS
        }
    }


@app.get("/")
def read_root():
    return {
        "message": "🎉 Gist Backend is Live & Running",
        "version": "2.1.0",
        "status": "operational",
        "features": {
            "modes": ["cornell", "dev", "summary"],
            "ai_model": "gemini-2.0-flash",
            "transcript_provider": "YouTube Transcript API",
            "rate_limiting": "enabled",
            "feedback_system": "enabled"
        },
        "beta_features": {
            "free_tier_requests": rate_limiter.MAX_FREE_REQUESTS,
            "max_video_duration_minutes": 60,
            "security": "IP + User-Agent fingerprinting"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "services": {
            "transcript": "operational",
            "ai": "operational" if ai_service else "unavailable",
            "rate_limiting": "operational",
            "feedback": "operational"
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/modes")
def get_modes():
    """Get list of available note-taking modes"""
    return {
        "modes": [
            {
                "id": "cornell",
                "name": "Study Mode",
                "icon": "📚",
                "description": "Cornell-style notes for learning",
                "features": [
                    "Learning objectives",
                    "Cornell Q&A format",
                    "Study action plan",
                    "Self-test questions"
                ]
            },
            {
                "id": "dev",
                "name": "Developer Mode",
                "icon": "💻",
                "description": "Code snippets & implementation",
                "features": [
                    "Code examples",
                    "Step-by-step guides",
                    "Troubleshooting tips",
                    "Best practices"
                ]
            },
            {
                "id": "summary",
                "name": "Summary Mode",
                "icon": "⚡",
                "description": "Quick overview & takeaways",
                "features": [
                    "One-sentence summary",
                    "Key insights",
                    "Action items",
                    "Quick read format"
                ]
            }
        ]
    }