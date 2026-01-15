import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file")
        
        genai.configure(api_key=api_key)
        
        # Use the fast and powerful Gemini 2.5 Flash
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def generate_notes(self, transcript_text: str):
        prompt = f"""
        You are an expert student and note-taker. 
        Analyze the following video transcript and generate comprehensive Cornell Notes.
        
        Transcript:
        {transcript_text[:25000]}  # Limit characters to avoid token limits

        Output Format (Markdown):
        
        # [Video Title Placeholder]
        
        ## 📝 Executive Summary
        (A concise 3-sentence summary of the main idea)
        
        ## 🔑 Key Concepts
        (Bulleted list of the most important takeaways)
        
        ## 🧠 Cornell Notes
        | Cues / Questions | Notes & Explanations |
        |------------------|----------------------|
        | **Concept 1** | Detailed explanation... |
        | **Concept 2** | Detailed explanation... |
        
        ## 🚀 Actionable Steps
        (List of things the viewer can actually do or apply)
        """

        try:
            print(f"Sending {len(transcript_text)} chars to Gemini...")
            response = self.model.generate_content(prompt)
            return response.text, None
        except Exception as e:
            print(f"\n❌ AI GENERATION FAILED: {str(e)}\n") 
            return None, str(e)