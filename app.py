import os
import re
import nltk
from collections import Counter
from flask import Flask, request, jsonify, render_template
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import PyPDF2

# Download NLTK resources
try:
    nltk.download("punkt", quiet=True)
    nltk.download("stopwords", quiet=True)
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    NLTK_AVAILABLE = True
except Exception as e:
    print(f"NLTK download/import warning: {e}. Falling back to basic text parsing.")
    NLTK_AVAILABLE = False

# Try importing Gemini API
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

app = Flask(__name__)

# Configure Gemini if key is in environment
if GEMINI_AVAILABLE and os.environ.get("GEMINI_API_KEY"):
    try:
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    except Exception as e:
        print(f"Failed to configure Gemini API: {e}")

# ---------------------------
# Text Extraction & Cleansing
# ---------------------------

def extract_text_from_pdf(uploaded_file):
    """Extract text from PDF file object."""
    try:
        pdf_reader = PyPDF2.PdfReader(uploaded_file)
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""


def clean_text(text):
    """Lowercases, removes non-alphabetic chars, and standardizes spacing."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def remove_stopwords(text):
    """Remove standard English stopwords."""
    if not text:
        return ""
    
    if NLTK_AVAILABLE:
        try:
            stop_words = set(stopwords.words("english"))
            words = word_tokenize(text)
            filtered = [word for word in words if word not in stop_words]
            return " ".join(filtered)
        except Exception:
            pass
            
    # Basic fallback stopword removal
    fallback_stopwords = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", 
        "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", 
        "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
        "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
        "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", 
        "with", "about", "against", "between", "into", "through", "during", "before", "after", 
        "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", 
        "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", 
        "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", 
        "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", 
        "should", "now"
    }
    words = text.split()
    filtered = [word for word in words if word not in fallback_stopwords]
    return " ".join(filtered)


# ---------------------------
# ATS Scoring & Metrics Algorithms
# ---------------------------

def calculate_similarity(resume_text, job_description):
    """Calculate TF-IDF and Cosine Similarity Match Score."""
    resume_processed = remove_stopwords(clean_text(resume_text))
    job_processed = remove_stopwords(clean_text(job_description))

    if not resume_processed.strip() or not job_processed.strip():
        return 0.0

    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_processed, job_processed])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(similarity * 100, 2)
    except Exception as e:
        print(f"TF-IDF similarity calculation error: {e}")
        return 0.0


def find_missing_keywords(resume_text, job_text):
    """Find words present in job description but missing in resume."""
    resume_clean = remove_stopwords(clean_text(resume_text))
    job_clean = remove_stopwords(clean_text(job_text))

    resume_words = set(resume_clean.split())
    job_words = set(job_clean.split())

    # Keep only words with length > 2
    resume_words = {w for w in resume_words if len(w) > 2}
    job_words = {w for w in job_words if len(w) > 2}

    missing = list(job_words - resume_words)
    return sorted(missing)[:25]


def compare_skills(resume_text, job_text):
    """Find words shared between resume and job description (common words)."""
    resume_clean = remove_stopwords(clean_text(resume_text))
    job_clean = remove_stopwords(clean_text(job_text))

    resume_words = set(resume_clean.split())
    job_words = set(job_clean.split())

    # Keep only words with length > 2
    resume_words = {w for w in resume_words if len(w) > 2}
    job_words = {w for w in job_words if len(w) > 2}

    common = sorted(list(resume_words.intersection(job_words)))
    return common


def get_top_keywords(resume_text, limit=30):
    """Extract top repeating keywords for Word Cloud visualization."""
    resume_clean = remove_stopwords(clean_text(resume_text))
    words = [w for w in resume_clean.split() if len(w) > 2]
    counts = Counter(words).most_common(limit)
    return [{"word": w, "count": c} for w, c in counts]


def calculate_direct_ats_score_internal(resume_text):
    """
    Evaluate resume structure directly without a Job Description.
    Returns: (score, list of issues, stats_dict)
    """
    clean_resume = resume_text.lower()
    
    score = 20  # Base Score
    issues = []
    
    # 1. Section presence checks (max 60 points)
    experience_keywords = ["experience", "work history", "employment", "professional background", "professional experience", "positions held"]
    education_keywords = ["education", "academic", "university", "college", "degree", "qualifications"]
    skills_keywords = ["skills", "technologies", "technical skills", "expertise", "core competencies", "specialties", "proficiencies"]
    projects_keywords = ["projects", "personal projects", "portfolio", "key projects", "academic projects", "accomplishments"]
    
    has_experience = any(kw in clean_resume for kw in experience_keywords)
    has_education = any(kw in clean_resume for kw in education_keywords)
    has_skills = any(kw in clean_resume for kw in skills_keywords)
    has_projects = any(kw in clean_resume for kw in projects_keywords)
    
    if has_experience:
        score += 20
    else:
        issues.append("Work experience section was not detected. A standard resume should detail your work history.")
        
    if has_education:
        score += 15
    else:
        issues.append("Education section is missing. List your degree, university, and graduation details.")
        
    if has_skills:
        score += 15
    else:
        issues.append("Skills section is missing. A dedicated skills table helps automated screeners index your technical talents.")
        
    if has_projects:
        score += 10
    else:
        issues.append("Projects section is missing. Adding projects is highly recommended to display practical capabilities.")
        
    # 2. Contact details checks (max 10 points)
    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
    phone_pattern = r'(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b)'
    
    has_email = bool(re.search(email_pattern, resume_text))
    has_phone = bool(re.search(phone_pattern, resume_text))
    
    if has_email:
        score += 5
    else:
        issues.append("Contact email address not found. Ensure your email is clearly visible.")
        
    if has_phone:
        score += 5
    else:
        issues.append("Phone number not found. Recruiters require a telephone number for direct outreach.")
        
    # 3. Word count check (max 5 points)
    word_count = len(resume_text.split())
    if 300 <= word_count <= 1000:
        score += 5
    elif word_count < 300:
        issues.append(f"Low word count ({word_count} words). Your resume is too brief. Elaborate on achievements using the STAR method.")
    else:
        issues.append(f"High word count ({word_count} words). Keep your resume concise; aim for 1-2 pages (approx 400-800 words).")
        
    # 4. Action verb check (max 5 points)
    action_verbs = {
        "led", "managed", "developed", "created", "designed", "implemented", "analyzed", 
        "achieved", "improved", "optimized", "increased", "built", "programmed", 
        "formulated", "established", "coordinated", "directed", "executed", 
        "organized", "spearheaded", "collaborated", "generated", "engineered", 
        "launched", "supervised", "conducted", "delivered", "produced", "monitored", 
        "evaluated"
    }
    words_in_resume = set(clean_text(resume_text).split())
    found_verbs = action_verbs.intersection(words_in_resume)
    
    if len(found_verbs) >= 5:
        score += 5
    else:
        issues.append(f"Few action verbs detected ({len(found_verbs)} found). Start experience bullet points with strong action verbs like 'Designed', 'Launched', or 'Optimized'.")
        
    # Standard statistics
    stats = {
        "has_experience": has_experience,
        "has_education": has_education,
        "has_skills": has_skills,
        "has_projects": has_projects,
        "has_email": has_email,
        "has_phone": has_phone,
        "word_count": word_count,
        "action_verbs_count": len(found_verbs)
    }
    
    return min(score, 100), issues, stats


def extract_candidate_name(resume_text, filename):
    """Try to extract a professional name from the resume text or default to filename."""
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    if not lines:
        # Fallback to filename
        name = os.path.splitext(filename)[0]
        return name
        
    # Check first few lines for a valid candidate name
    for line in lines[:5]:
        # Filter out contact details, links, emails, and header garbage
        if "@" in line or "http" in line or "Resume" in line or "CV" in line or "Page" in line:
            continue
        # Check if line has 2 to 4 words (typical name structure)
        words = line.split()
        if 2 <= len(words) <= 4:
            # Check if alphabetic
            clean_line = re.sub(r'[^a-zA-Z\s]', '', line).strip()
            if len(clean_line.split()) == len(words):
                return clean_line
                
    # Fallback: clean filename
    name = os.path.splitext(filename)[0]
    name = re.sub(r'[^a-zA-Z0-9\s-_]', '', name)
    name = name.replace('-', ' ').replace('_', ' ').title()
    return name


# ---------------------------
# Flask Routing Handlers
# ---------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Handles standard Candidate match scoring against a job description, or direct scoring."""
    if "resume" not in request.files:
        return jsonify({"error": "No resume file uploaded"}), 400

    file = request.files["resume"]
    job_description = request.form.get("job_description", "").strip()

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Extract text from resume PDF
    resume_text = extract_text_from_pdf(file)
    if not resume_text.strip():
        return jsonify({"error": "Could not extract text from the uploaded PDF"}), 400

    # Direct ATS scoring (no Job Description provided)
    if not job_description:
        score, issues, stats = calculate_direct_ats_score_internal(resume_text)
        top_keywords = get_top_keywords(resume_text, limit=30)
        return jsonify({
            "is_direct": True,
            "match_score": score,
            "resume_word_count": stats["word_count"],
            "stats": stats,
            "issues": issues,
            "top_keywords": top_keywords
        })

    # Standard Match Analysis (Job Description provided)
    match_score = calculate_similarity(resume_text, job_description)
    missing_keywords = find_missing_keywords(resume_text, job_description)
    matching_skills = compare_skills(resume_text, job_description)
    top_keywords = get_top_keywords(resume_text, limit=30)
    
    # Calculate general issues to display in direct section of matched results
    _, issues, stats = calculate_direct_ats_score_internal(resume_text)

    result = {
        "is_direct": False,
        "match_score": match_score,
        "resume_word_count": len(resume_text.split()),
        "jd_word_count": len(job_description.split()),
        "matching_skills": matching_skills,
        "missing_keywords": missing_keywords,
        "top_keywords": top_keywords,
        "issues": issues,
        "stats": stats
    }

    return jsonify(result)


@app.route("/api/rank", methods=["POST"])
def rank_resumes():
    """Recruiter multi-resume ranking endpoint against a Job Description."""
    if "resumes" not in request.files:
        return jsonify({"error": "No resumes uploaded"}), 400

    files = request.files.getlist("resumes")
    job_description = request.form.get("job_description", "").strip()

    if not files or files[0].filename == "":
        return jsonify({"error": "No resume files selected"}), 400

    if not job_description:
        return jsonify({"error": "No Job Description provided for ranking"}), 400

    candidates = []
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            continue
            
        resume_text = extract_text_from_pdf(file)
        if not resume_text.strip():
            continue
            
        score = calculate_similarity(resume_text, job_description)
        matching_skills = compare_skills(resume_text, job_description)
        missing_keywords = find_missing_keywords(resume_text, job_description)
        candidate_name = extract_candidate_name(resume_text, file.filename)
        
        candidates.append({
            "name": candidate_name,
            "filename": file.filename,
            "score": score,
            "word_count": len(resume_text.split()),
            "matching_skills_count": len(matching_skills),
            "matching_skills": matching_skills[:10],  # Return top 10 for dashboard preview
            "missing_keywords_count": len(missing_keywords)
        })
        
    # Sort candidates by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    return jsonify({
        "job_desc_word_count": len(job_description.split()),
        "candidates": candidates
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    """Chat API route for resume Q&A."""
    data = request.get_json() or {}
    message = data.get("message", "").strip()
    resume_text = data.get("resume_text", "").strip()

    if not message:
        return jsonify({"error": "No chat message provided"}), 400

    if not resume_text:
        return jsonify({"reply": "I see you haven't uploaded a resume yet. Please drag & drop a PDF resume first so I can analyze details and answer your questions!"})

    # Try calling Gemini API if configured
    api_key = os.environ.get("GEMINI_API_KEY")
    if GEMINI_AVAILABLE and api_key:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""You are a professional resume parser, recruiter reviewer, and career coach AI called CV-PRO Chatbot.
You have access to the user's resume text below. Answer the user's question or query about their resume in a concise, professional, and friendly manner. Use markdown format for answers.

--- RESUME TEXT START ---
{resume_text}
--- RESUME TEXT END ---

User Query: {message}

Your Answer:"""
            response = model.generate_content(prompt)
            return jsonify({"reply": response.text.strip()})
        except Exception as e:
            print(f"Gemini API invocation failed: {e}. Falling back to offline rule agent.")

    # Rule-based offline QA fallback
    reply = local_chatbot_response(resume_text, message)
    return jsonify({"reply": reply})


def local_chatbot_response(resume_text, message):
    """Clean offline rule-based processor for answering queries using resume text."""
    message_lower = message.lower().strip()
    
    # 1. Contact Details
    if any(k in message_lower for k in ["contact", "email", "phone", "number", "reach", "address", "linkedin", "github"]):
        emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
        phones = re.findall(r'(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b)', resume_text)
        links = re.findall(r'(?:https?://)?(?:www\.)?(?:linkedin\.com/in/|github\.com/)[\w\.-]+', resume_text, re.IGNORECASE)
        
        resp = "Here are the contact details I found in your resume:\n\n"
        resp += f"- **Email**: {emails[0] if emails else 'Not found.'}\n"
        resp += f"- **Phone**: {phones[0] if phones else 'Not found.'}\n"
        if links:
            resp += "- **Social Links**:\n"
            for link in links[:3]:
                resp += f"  - [{link}](https://{link.replace('https://','').replace('http://','')})\n"
        return resp
        
    # 2. Skills Search
    if any(k in message_lower for k in ["skills", "languages", "technologies", "tools", "expert", "capable", "know", "stack"]):
        skills_header = re.search(r'(?:skills|technologies|tools|expertise|core competencies)[:\s\-\n]+(.*?)(?:\n\n|\n[A-Z][a-z]+|$)', resume_text, re.IGNORECASE | re.DOTALL)
        if skills_header:
            skills_extracted = skills_header.group(1).strip()
            return f"Based on your resume, your skills section lists:\n\n```\n{skills_extracted}\n```\n\nWould you like suggestions on how to improve this section or what skills might be missing for a specific role?"
        else:
            common_skills_list = ["python", "javascript", "react", "html", "css", "sql", "java", "c++", "aws", "docker", "git", "machine learning", "excel", "project management", "agile", "scrum", "data analysis"]
            found = [s for s in common_skills_list if s in resume_text.lower()]
            if found:
                return f"I detected the following skills in your resume text: {', '.join([s.title() for s in found])}.\n\nIt seems you don't have a dedicated skills section, or it is formatted in a way I couldn't isolate. I recommend creating a clear 'Skills' section."
            return "I couldn't locate a dedicated skills section in your resume. Please make sure to add one listing your key technical and soft skills."

    # 3. Work Experience Search
    if any(k in message_lower for k in ["experience", "work", "jobs", "employer", "history", "career", "projects"]):
        exp_match = re.search(r'(?:experience|work history|employment|professional background)[:\s\-\n]+(.*?)(?:\n\n\n|\n\n[A-Z][a-z]+ \n|$)', resume_text, re.IGNORECASE | re.DOTALL)
        if exp_match:
            exp_text = exp_match.group(1).strip()[:400] + "..."
            return f"Here is a snippet of your work history I extracted:\n\n> {exp_text}\n\n*Tips to optimize*: Start each bullet point with a strong action verb (e.g., 'Led', 'Developed') and quantify your results (e.g., 'increased efficiency by 20%')."
        return "I found your experience details in the text, but to optimize, ensure you have a section labeled 'Work Experience' or 'Professional Experience' with clear bullet points outlining your contributions."

    # 4. Education Search
    if any(k in message_lower for k in ["education", "academic", "university", "college", "degree", "gpa", "study"]):
        edu_match = re.search(r'(?:education|academic history|university|credentials)[:\s\-\n]+(.*?)(?:\n\n|\n[A-Z][a-z]+|$)', resume_text, re.IGNORECASE | re.DOTALL)
        if edu_match:
            edu_text = edu_match.group(1).strip()
            return f"Here are your education details:\n\n{edu_text}\n\nMake sure to list your graduation year and relevant honors/GPA if they are above 3.5."
        return "I couldn't isolate a dedicated 'Education' section. Ensure you clearly state your degree, institution, major, and graduation year."

    # 5. Issues & ATS Score Search
    if any(k in message_lower for k in ["improvement", "issue", "score", "ats", "feedback", "wrong", "fix", "problems"]):
        score, issues, stats = calculate_direct_ats_score_internal(resume_text)
        issue_str = "\n".join([f"- {issue}" for issue in issues])
        return f"Your direct ATS score is estimated at **{score}/100**.\n\nHere are the critical items we found to improve:\n\n{issue_str if issues else '- No major issues found! Your resume format is solid.'}"

    # 6. Welcome / Hello Greetings
    if any(k in message_lower for k in ["hello", "hi", "hey", "greetings", "yo"]):
        return "Hello! I am your CV-PRO Chatbot Assistant. Ask me anything about your uploaded resume! Try asking: 'What are my top skills?' or 'What are the main issues with my resume?'"

    # Default
    return f"I've analyzed your resume (word count: {len(resume_text.split())} words).\n\nYou can ask me specific questions about your resume, such as:\n" \
           f"- 'What are my top skills?'\n" \
           f"- 'Extract my education'\n" \
           f"- 'What are the main issues with my resume?'\n" \
           f"- 'Give me tips to improve my work experience section'\n\n" \
           f"If you paste a Job Description on the right, I can also help you see how well you match that specific role!"


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
