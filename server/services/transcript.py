"""
Production-ready YouTube Transcript Service for Web Application
Optimized for handling user requests to generate PDF notes from YouTube videos
"""

import re
import logging
from typing import Tuple, Optional, List, Dict
from requests import Session

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled, 
        NoTranscriptFound, 
        VideoUnavailable,
        RequestBlocked,
        IpBlocked
    )
except ImportError:
    raise ImportError(
        "youtube-transcript-api not installed. "
        "Run: pip install youtube-transcript-api"
    )

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TranscriptService:
    """Service for fetching YouTube transcripts"""
    
    def __init__(self, default_language: str = 'en'):
        """
        Initialize the transcript service.
        
        Args:
            default_language: Default language code for transcripts (e.g., 'en', 'es', 'hi')
        """
        self.default_language = default_language
        self.api = YouTubeTranscriptApi()
    
    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """
        Extract video ID from various YouTube URL formats.
        
        Supports:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/shorts/VIDEO_ID
        - https://www.youtube.com/embed/VIDEO_ID
        
        Args:
            url: YouTube video URL
            
        Returns:
            Video ID if found, None otherwise
        """
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
    
    def get_transcript(
        self, 
        video_url: str, 
        language: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Fetch transcript from a YouTube video.
        
        Args:
            video_url: YouTube video URL
            language: Preferred language code (defaults to self.default_language)
            
        Returns:
            Tuple of (transcript_text, error_dict)
            - On success: (transcript_text, None)
            - On failure: (None, {'error': error_message, 'code': error_code})
        """
        lang = language or self.default_language
        
        # Extract video ID
        video_id = self.extract_video_id(video_url)
        if not video_id:
            logger.error(f"Invalid URL: {video_url}")
            return None, {
                'error': 'Invalid YouTube URL. Please provide a valid YouTube video link.',
                'code': 'INVALID_URL'
            }
        
        logger.info(f"Fetching transcript for video: {video_id}, language: {lang}")
        
        try:
            # Try to fetch transcript in preferred language
            transcript_data = self.api.fetch(video_id, languages=[lang])
            
            # Combine all text segments
            transcript_text = ' '.join([
                snippet.text if hasattr(snippet, 'text') else snippet['text']
                for snippet in transcript_data
            ])
            
            # Clean up whitespace
            transcript_text = ' '.join(transcript_text.split())
            
            logger.info(f"Successfully fetched transcript: {len(transcript_text)} characters")
            return transcript_text, None
            
        except NoTranscriptFound:
            # Try to get any available transcript
            logger.warning(f"No {lang} transcript found, trying alternatives...")
            return self._get_any_transcript(video_id)
            
        except TranscriptsDisabled:
            logger.error(f"Transcripts disabled for video: {video_id}")
            return None, {
                'error': 'Transcripts are disabled for this video.',
                'code': 'TRANSCRIPTS_DISABLED'
            }
            
        except VideoUnavailable:
            logger.error(f"Video unavailable: {video_id}")
            return None, {
                'error': 'This video is unavailable, private, or region-restricted.',
                'code': 'VIDEO_UNAVAILABLE'
            }
            
        except (RequestBlocked, IpBlocked) as e:
            logger.error(f"IP blocked for video: {video_id}")
            return None, {
                'error': 'YouTube is blocking requests from this IP address. This commonly happens on cloud servers. Consider using residential proxies.',
                'code': 'IP_BLOCKED'
            }
            
        except Exception as e:
            logger.exception(f"Unexpected error fetching transcript: {str(e)}")
            return None, {
                'error': f'Failed to fetch transcript: {str(e)}',
                'code': 'UNKNOWN_ERROR'
            }
    
    def _get_any_transcript(self, video_id: str) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Fallback method to get any available transcript.
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Tuple of (transcript_text, error_dict)
        """
        try:
            # Get list of available transcripts
            transcript_list = self.api.list(video_id)
            
            # Priority order: manually created > auto-generated
            try:
                # Try manually created transcript in any language
                transcript = transcript_list.find_manually_created_transcript(
                    [self.default_language, 'en']
                )
            except:
                try:
                    # Try auto-generated transcript
                    transcript = transcript_list.find_generated_transcript(
                        [self.default_language, 'en']
                    )
                except:
                    # Get any available transcript
                    transcript = next(iter(transcript_list))
            
            # Fetch the transcript data
            transcript_data = transcript.fetch()
            
            # Combine text
            transcript_text = ' '.join([
                snippet.text if hasattr(snippet, 'text') else snippet['text']
                for snippet in transcript_data
            ])
            transcript_text = ' '.join(transcript_text.split())
            
            logger.info(f"Fetched transcript in language: {transcript.language}")
            return transcript_text, None
            
        except Exception as e:
            logger.error(f"Failed to get any transcript: {str(e)}")
            return None, {
                'error': 'No transcript available for this video.',
                'code': 'NO_TRANSCRIPT'
            }
    
    def get_available_languages(self, video_url: str) -> Tuple[Optional[List[Dict]], Optional[Dict]]:
        """
        Get list of available transcript languages for a video.
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            Tuple of (languages_list, error_dict)
        """
        video_id = self.extract_video_id(video_url)
        if not video_id:
            return None, {
                'error': 'Invalid YouTube URL',
                'code': 'INVALID_URL'
            }
        
        try:
            transcript_list = self.api.list(video_id)
            
            languages = []
            for transcript in transcript_list:
                languages.append({
                    'language': transcript.language,
                    'language_code': transcript.language_code,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })
            
            return languages, None
            
        except Exception as e:
            logger.error(f"Failed to list languages: {str(e)}")
            return None, {
                'error': f'Failed to get available languages: {str(e)}',
                'code': 'LANGUAGE_LIST_ERROR'
            }
    
    def get_transcript_with_timestamps(
        self, 
        video_url: str, 
        language: Optional[str] = None
    ) -> Tuple[Optional[List[Dict]], Optional[Dict]]:
        """
        Fetch transcript with timestamp information.
        
        Args:
            video_url: YouTube video URL
            language: Preferred language code
            
        Returns:
            Tuple of (transcript_segments, error_dict)
            Each segment contains: {'text': str, 'start': float, 'duration': float}
        """
        lang = language or self.default_language
        video_id = self.extract_video_id(video_url)
        
        if not video_id:
            return None, {'error': 'Invalid URL', 'code': 'INVALID_URL'}
        
        try:
            transcript_data = self.api.fetch(video_id, languages=[lang])
            
            segments = []
            for snippet in transcript_data:
                segments.append({
                    'text': snippet.text if hasattr(snippet, 'text') else snippet['text'],
                    'start': snippet.start if hasattr(snippet, 'start') else snippet['start'],
                    'duration': snippet.duration if hasattr(snippet, 'duration') else snippet['duration']
                })
            
            return segments, None
            
        except Exception as e:
            logger.error(f"Failed to get timestamped transcript: {str(e)}")
            return None, {
                'error': f'Failed to fetch transcript: {str(e)}',
                'code': 'FETCH_ERROR'
            }


# Example Flask/FastAPI integration
def create_flask_endpoint(app):
    """
    Example Flask endpoint integration.
    
    Usage:
        from flask import Flask, request, jsonify
        app = Flask(__name__)
        create_flask_endpoint(app)
    """
    from flask import request, jsonify
    
    service = TranscriptService()
    
    @app.route('/api/transcript', methods=['POST'])
    def get_transcript():
        data = request.get_json()
        video_url = data.get('video_url')
        language = data.get('language', 'en')
        
        if not video_url:
            return jsonify({'error': 'video_url is required'}), 400
        
        transcript, error = service.get_transcript(video_url, language)
        
        if error:
            return jsonify(error), 400
        
        return jsonify({
            'success': True,
            'transcript': transcript,
            'length': len(transcript)
        })
    
    @app.route('/api/languages', methods=['GET'])
    def get_languages():
        video_url = request.args.get('video_url')
        
        if not video_url:
            return jsonify({'error': 'video_url parameter is required'}), 400
        
        languages, error = service.get_available_languages(video_url)
        
        if error:
            return jsonify(error), 400
        
        return jsonify({
            'success': True,
            'languages': languages
        })


# Example usage
if __name__ == "__main__":
    # Initialize service
    service = TranscriptService(default_language='en')
    
    # Test URL
    test_url = "https://www.youtube.com/watch?v=8zr741ePUCw"
    
    print("="*70)
    print("Testing YouTube Transcript Service")
    print("="*70)
    
    # Get transcript
    transcript, error = service.get_transcript(test_url)
    
    if error:
        print(f"\n❌ Error: {error['error']}")
        print(f"Error Code: {error['code']}")
    else:
        print(f"\n✅ Success!")
        print(f"Transcript Length: {len(transcript)} characters")
        print(f"\nPreview:\n{transcript[:300]}...")
    
    print("\n" + "="*70)
    
    # Get available languages
    languages, error = service.get_available_languages(test_url)
    
    if not error:
        print("\n📋 Available Languages:")
        for lang in languages:
            print(f"  - {lang['language']} ({lang['language_code']}) - "
                  f"{'Auto-generated' if lang['is_generated'] else 'Manual'}")
    
    print("\n" + "="*70)