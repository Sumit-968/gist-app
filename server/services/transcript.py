import os
import re
import logging
import requests
import urllib3
from typing import Tuple, Optional, Dict

# 1. Disable the "InsecureRequestWarning" so your terminal stays clean
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TranscriptService:
    """
    Fetches transcripts using 'YouTube Transcript 3' via RapidAPI.
    """
    
    def __init__(self):
        self.api_key = os.getenv("RAPID_API_KEY")
        if not self.api_key:
            logger.warning("RAPID_API_KEY is missing! Transcripts will fail.")

    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
            r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
            r'(?:shorts\/)([0-9A-Za-z_-]{11})',
            r'(?:embed\/)([0-9A-Za-z_-]{11})'
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def get_transcript(self, video_url: str) -> Tuple[Optional[str], Optional[Dict]]:
        
        video_id = self.extract_video_id(video_url)
        if not video_id:
            return None, {'error': 'Invalid YouTube URL', 'code': 'INVALID_URL'}

        if not self.api_key:
            return None, {'error': 'Server configuration error: API Key missing.', 'code': 'CONFIG_ERROR'}

        logger.info(f"Fetching transcript for: {video_id}")

        url = "https://youtube-transcript3.p.rapidapi.com/api/transcript"
        querystring = {"videoId": video_id}
        
        headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com"
        }

        try:
            # 2. KEY CHANGE: verify=False tells Python to accept the company proxy certificate
            response = requests.get(url, headers=headers, params=querystring, verify=False)
            
            if response.status_code == 403:
                return None, {'error': 'API Key invalid or quota exceeded.', 'code': 'API_LIMIT'}
            
            if response.status_code != 200:
                logger.error(f"API Error: {response.text}")
                return None, {'error': 'Failed to fetch transcript from provider.', 'code': 'API_ERROR'}

            data = response.json()
            
            if not data.get('success'):
                return None, {'error': 'Transcript not available for this video.', 'code': 'NO_TRANSCRIPT'}

            transcript_list = data.get('transcript', [])
            full_text = " ".join([str(item.get('text', '')) for item in transcript_list if item.get('text')])

            if not full_text:
                return None, {'error': 'Transcript was empty.', 'code': 'EMPTY_TRANSCRIPT'}

            return full_text, None

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return None, {'error': f"System Error: {str(e)}", 'code': 'UNKNOWN'}