import os
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file")
        
        # Initialize the client directly
        self.client = genai.Client(api_key=api_key)
        
        # Set the model name (using the correct model string)
        self.model_id = 'gemini-2.5-flash'

    def get_prompt_for_mode(self, mode, transcript_text):
        """Generate mode-specific prompts for different note-taking styles"""
        
        # Cornell Mode - Academic Study Notes
        cornell_prompt = """You are an expert academic note-taker and study coach. Your goal is to help students learn effectively.

Analyze this video transcript and create comprehensive Cornell-style notes that maximize learning and retention.

Transcript:
{transcript}

**CRITICAL INSTRUCTIONS:**
1. Focus on LEARNING and UNDERSTANDING, not just summarizing
2. Break down complex concepts into digestible parts
3. Include concrete examples and analogies where helpful
4. Create questions that promote active recall
5. Highlight connections between different concepts

**Output Format (Strict Markdown):**

# [Descriptive Video Title]

## 📝 Executive Summary
[Write 3-4 sentences that capture the core message and why it matters. What's the main takeaway a student should remember?]

## 🎯 Learning Objectives
After studying these notes, you will be able to:
- [Specific, actionable learning outcome 1]
- [Specific, actionable learning outcome 2]
- [Specific, actionable learning outcome 3]

## 🔑 Key Concepts

### Core Ideas
- **[Concept 1]**: [Brief explanation in simple terms]
- **[Concept 2]**: [Brief explanation with an example]
- **[Concept 3]**: [Brief explanation showing why it matters]

### Important Definitions
- **[Term]**: [Clear, student-friendly definition]
- **[Term]**: [Clear definition + real-world context]

## 🧠 Cornell Notes

| Cues & Questions | Detailed Notes & Explanations |
|------------------|-------------------------------|
| **What is [key concept]?** | [Comprehensive explanation with examples]<br><br>**Why it matters**: [Real-world relevance]<br><br>**Remember**: [Memory aid or mnemonic] |
| **How does [process] work?** | **Step 1**: [Detailed explanation]<br>**Step 2**: [Detailed explanation]<br>**Step 3**: [Detailed explanation]<br><br>**Common mistake**: [What students often get wrong] |
| **What's the difference between X and Y?** | **[Concept X]**:<br>- [Key characteristics]<br>- [When to use it]<br><br>**[Concept Y]**:<br>- [Key characteristics]<br>- [When to use it]<br><br>**Key distinction**: [The crucial difference] |

## 💡 Key Insights & Takeaways
- [Insight 1: Connect concepts in a meaningful way]
- [Insight 2: Highlight a surprising or counterintuitive point]
- [Insight 3: Practical implication or application]

## 🚀 Study Action Plan

### Immediate Actions
1. [Specific thing to review or practice right now]
2. [Quick exercise to test understanding]
3. [Key concept to memorize or internalize]

### For Deeper Learning
- [Suggested follow-up topic or resource]
- [Practice problem or project idea]
- [Related concept to explore]

### Self-Test Questions
1. [Question testing understanding of concept 1]
2. [Question requiring application of knowledge]
3. [Question connecting multiple concepts]

## 📌 Quick Review (2-Minute Recap)
[Write a concise 4-5 sentence summary that a student can read before an exam to refresh their memory on the key points]

---
*Study Tip: Review these notes within 24 hours, then again in a week for optimal retention.*
""".format(transcript=transcript_text[:25000])

        # Dev Mode - Developer/Coding Notes
        dev_prompt = """You are a senior software engineer and technical educator who excels at breaking down coding concepts.

Analyze this video transcript and create developer-focused notes with emphasis on practical implementation.

Transcript:
{transcript}

**CRITICAL INSTRUCTIONS:**
1. Extract ALL code snippets, commands, and technical details
2. Organize code by language/technology
3. Include setup instructions and prerequisites
4. Add practical tips and best practices
5. Highlight common pitfalls and how to avoid them
6. Provide working examples that developers can copy-paste

**Output Format (Strict Markdown):**

# [Technical Video Title]

## ⚡ TL;DR (The Quick Version)
[2-3 sentences explaining what's built and the key technologies used]

**Tech Stack**: [List all technologies, frameworks, libraries mentioned]

## 🎯 What You'll Learn
- [Specific technical skill or concept 1]
- [Specific technical skill or concept 2]
- [Specific technical skill or concept 3]

## 🛠️ Prerequisites & Setup

### Required Knowledge
- [Prerequisite skill 1]
- [Prerequisite skill 2]

### Tools & Dependencies
```bash
# Installation commands
npm install package-name
pip install library-name
```

### Environment Setup
```bash
# Configuration steps
export API_KEY="your-key"
```

## 💻 Core Implementation

### [Feature/Component 1]

**Purpose**: [What this does and why it's needed]

```javascript
// Code snippet with comments
function example() {{
  // Step-by-step explanation in comments
  const result = doSomething();
  return result;
}}
```

**Key Points**:
- [Important detail about the code]
- [Why this approach was chosen]
- [Alternative approach to consider]

**Common Issues**:
- ⚠️ [Potential problem 1] → [Solution]
- ⚠️ [Potential problem 2] → [Solution]

### [Feature/Component 2]

**Purpose**: [What this does]

```python
# Another code example
# With detailed comments
def another_function():
    # Implementation details
    pass
```

**Explanation**:
- [Line-by-line breakdown of complex parts]
- [How this integrates with other components]

## 🔧 Step-by-Step Implementation Guide

### Step 1: [Initial Setup]
```bash
# Commands to run
git clone repo-url
cd project-folder
```
[Explanation of what this does]

### Step 2: [Next Phase]
```javascript
// Code for this step
const app = express();
app.listen(3000);
```
[Explanation and reasoning]

### Step 3: [Final Integration]
```javascript
// Final code
app.get('/api', (req, res) => {{
  res.json({{ message: 'Hello' }});
}});
```
[Wrap-up and testing]

## 📋 Code Reference

### Key Functions/Methods
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `functionName()` | [What it does] | [Params explained] | [Return value] |

### Important Configuration
```json
{{
  "key": "value",
  "option": true
}}
```

## 🎨 Best Practices & Tips

### Do ✅
- [Best practice 1 with reasoning]
- [Best practice 2 with example]
- [Best practice 3 for production]

### Don't ❌
- [Anti-pattern 1 and why to avoid it]
- [Anti-pattern 2 and better alternative]

### Performance Optimization
- [Optimization tip 1]
- [Optimization tip 2]

## 🐛 Troubleshooting Guide

### Problem: [Common Error 1]
**Symptom**: [What you see]
```bash
# Error message
Error: Cannot find module 'express'
```
**Solution**:
```bash
npm install express
```

### Problem: [Common Error 2]
**Solution**: [Step-by-step fix]

## 🚀 Next Steps & Extensions

### Easy Wins (15-30 min)
1. [Simple enhancement idea]
2. [Quick feature to add]

### Medium Challenges (1-3 hours)
1. [More complex improvement]
2. [Integration with another service]

### Advanced Projects (Weekend Project)
1. [Major feature or refactor]
2. [Production-ready considerations]

## 📚 Additional Resources
- **Documentation**: [Links to relevant docs]
- **Related Topics**: [What to learn next]
- **GitHub Repo**: [If mentioned in video]

## 🔖 Quick Reference Cheatsheet

```javascript
// Most important code snippets you'll need
// Copy-paste ready

// Snippet 1: Basic Setup
const express = require('express');
const app = express();

// Snippet 2: API Route
app.get('/api/data', (req, res) => {{
  res.json({{ data: 'example' }});
}});
```

---
*Developer Note: This code is from the video - adapt it to your specific use case and production requirements.*
""".format(transcript=transcript_text[:25000])

        # Summary Mode - Quick Overview
        summary_prompt = """You are an expert content curator and synthesizer who creates clear, scannable summaries.

Analyze this video transcript and create a concise, high-impact summary that busy people can digest quickly.

Transcript:
{transcript}

**CRITICAL INSTRUCTIONS:**
1. Lead with the most important information
2. Be EXTREMELY concise - every word must earn its place
3. Use simple language and short sentences
4. Focus on actionable insights and key facts
5. Make it easy to scan with clear sections
6. Remove all fluff and redundancy

**Output Format (Strict Markdown):**

# [Clear, Descriptive Title]

## ⚡ One-Sentence Takeaway
[The single most important thing someone should know - max 20 words]

## 📊 At a Glance
- **Topic**: [Main subject]
- **Length**: [Estimated read time: X min]
- **Best For**: [Who should read this]
- **Key Insight**: [Most valuable piece of information]

## 🎯 Main Points

### 1. [Core Point 1]
[2-3 concise sentences explaining this point. Focus on what, why, and impact.]

**Practical Application**: [One specific way to use this information]

### 2. [Core Point 2]
[2-3 concise sentences. Get straight to the point.]

**Practical Application**: [Actionable takeaway]

### 3. [Core Point 3]
[2-3 concise sentences. No unnecessary details.]

**Practical Application**: [What to do with this info]

## 💡 Key Insights
| Insight | Why It Matters |
|---------|----------------|
| [Surprising fact or key finding 1] | [Real-world impact in 1 sentence] |
| [Important concept or principle 2] | [Why you should care in 1 sentence] |
| [Critical takeaway 3] | [Practical relevance in 1 sentence] |

## 🔢 By The Numbers
[If the video contains data, statistics, or metrics - list 3-5 most important ones]
- **[Stat 1]**: [Context in 5 words]
- **[Stat 2]**: [Context in 5 words]
- **[Stat 3]**: [Context in 5 words]

## ✅ Action Items
[What should someone DO after watching/reading?]

**Immediate** (5 min):
- [Quick action 1]
- [Quick action 2]

**Short-term** (This week):
- [Action requiring some effort]
- [Specific next step]

**Long-term** (This month):
- [Bigger commitment or goal]

## 🎓 Key Terms Explained
[Only include if technical terms were used - define them simply]
- **[Term 1]**: [Simple 1-sentence definition]
- **[Term 2]**: [Easy explanation anyone can understand]

## 🤔 Critical Thinking Questions
[2-3 questions to help someone think deeper about the content]
1. [Thought-provoking question about application]
2. [Question that challenges assumptions]
3. [Question about broader implications]

## 📌 Remember This
[The ONE thing that should stick if someone only remembers a single point]

> [Powerful quote or key principle from the video - max 25 words]

## ⏭️ What To Explore Next
[If someone found this valuable, what should they learn about next?]
- [Related topic 1]
- [Deeper dive suggestion]
- [Complementary skill or knowledge area]

---
*Reading time: [X] minutes | Value: [High/Medium] | Difficulty: [Easy/Medium/Advanced]*
""".format(transcript=transcript_text[:25000])

        # Return the appropriate prompt based on mode
        prompts = {
            "cornell": cornell_prompt,
            "dev": dev_prompt,
            "summary": summary_prompt
        }
        
        return prompts.get(mode, cornell_prompt)

    def generate_notes(self, transcript_text, mode="cornell"):
        """Generate notes based on selected mode"""
        
        # Validate mode
        valid_modes = ["cornell", "dev", "summary"]
        if mode not in valid_modes:
            print(f"Invalid mode '{mode}', defaulting to 'cornell'")
            mode = "cornell"
        
        # Get the appropriate prompt
        prompt = self.get_prompt_for_mode(mode, transcript_text)

        try:
            print(f"Generating {mode} notes with {len(transcript_text)} chars...")
            
            # Generate content using the new SDK
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            
            # Return the text
            return response.text, None
            
        except Exception as e:
            error_message = str(e)
            print(f"\n❌ AI GENERATION FAILED: {error_message}\n")
            
            # More detailed error information
            if "API_KEY" in error_message.upper():
                return None, "Invalid or missing Gemini API key. Please check your .env file."
            elif "QUOTA" in error_message.upper() or "LIMIT" in error_message.upper():
                return None, "API quota exceeded. Please try again later or check your Gemini API quota."
            elif "MODEL" in error_message.upper():
                return None, f"Model error. The model '{self.model_id}' may not be available. Try 'gemini-2.0-flash-exp' or 'gemini-1.5-flash'."
            else:
                return None, f"AI generation error: {error_message}"