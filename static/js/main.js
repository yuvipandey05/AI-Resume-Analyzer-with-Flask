document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // DOM Elements - Candidate Workspace
    // ----------------------------------------------------
    const candidateDropZone = document.getElementById('candidate-drop-zone');
    const candidateFileInput = document.getElementById('candidate-file-input');
    const candidateFileInfo = document.getElementById('candidate-file-info');
    const candidateFileName = document.getElementById('candidate-file-name');
    const candidateFileSize = document.getElementById('candidate-file-size');
    const candidateRemoveFile = document.getElementById('candidate-remove-file');
    const candidateUploadContent = candidateDropZone.querySelector('.upload-content');
    
    const candidateForm = document.getElementById('candidate-form');
    const candidateJdInput = document.getElementById('candidate-jd-input');
    const candidateAnalyzeBtn = document.getElementById('candidate-analyze-btn');
    const directAtsBtn = document.getElementById('direct-ats-btn');
    
    const candidateResultsPanel = document.getElementById('candidate-results-panel');
    const candidateEmptyState = document.getElementById('candidate-empty-state');
    const candidateLoadingState = document.getElementById('candidate-loading-state');
    const candidateDashboardContent = document.getElementById('candidate-dashboard-content');
    
    const candidateGaugeFill = document.getElementById('candidate-gauge-fill');
    const candidateScoreText = document.getElementById('candidate-score-text');
    const candidateScoreLabel = document.getElementById('candidate-score-label');
    
    const statsScoreType = document.getElementById('stats-score-type');
    const statsScoreIndicator = document.getElementById('stats-score-indicator');
    const statsWordsVal = document.getElementById('stats-words-val');
    const statsJdWordsVal = document.getElementById('stats-jd-words-val');
    const jdWordsCard = document.getElementById('jd-words-card');
    
    const candidateSuggestionBox = document.getElementById('candidate-suggestion-box');
    const candidateSuggestionIcon = document.getElementById('candidate-suggestion-icon');
    const candidateSuggestionTitle = document.getElementById('candidate-suggestion-title');
    const candidateSuggestionDesc = document.getElementById('candidate-suggestion-desc');
    
    const accordionIssues = document.getElementById('accordion-issues');
    const issuesCount = document.getElementById('issues-count');
    const issuesListContainer = document.getElementById('issues-list-container');
    
    const accordionMatchingSkills = document.getElementById('accordion-matching-skills');
    const matchingSkillsCount = document.getElementById('matching-skills-count');
    const matchingSkillsTags = document.getElementById('matching-skills-tags');
    
    const accordionMissingKeywords = document.getElementById('accordion-missing-keywords');
    const missingKeywordsCount = document.getElementById('missing-keywords-count');
    const missingKeywordsTags = document.getElementById('missing-keywords-tags');
    
    const wordcloudTags = document.getElementById('wordcloud-tags');
    const candidateDownloadBtn = document.getElementById('candidate-download-btn');

    // ----------------------------------------------------
    // DOM Elements - Recruiter Workspace
    // ----------------------------------------------------
    const recruiterDropZone = document.getElementById('recruiter-drop-zone');
    const recruiterFileInput = document.getElementById('recruiter-file-input');
    const recruiterFileInfo = document.getElementById('recruiter-file-info');
    const recruiterFilesCount = document.getElementById('recruiter-files-count');
    const recruiterFilesSize = document.getElementById('recruiter-files-size');
    const recruiterRemoveFiles = document.getElementById('recruiter-remove-files');
    const recruiterPillList = document.getElementById('recruiter-pill-list');
    const recruiterUploadContent = recruiterDropZone.querySelector('.upload-content');
    
    const recruiterForm = document.getElementById('recruiter-form');
    const recruiterJdInput = document.getElementById('recruiter-jd-input');
    const recruiterAnalyzeBtn = document.getElementById('recruiter-analyze-btn');
    
    const recruiterResultsPanel = document.getElementById('recruiter-results-panel');
    const recruiterEmptyState = document.getElementById('recruiter-empty-state');
    const recruiterLoadingState = document.getElementById('recruiter-loading-state');
    const recruiterDashboardContent = document.getElementById('recruiter-dashboard-content');
    const leaderboardRows = document.getElementById('leaderboard-rows');

    // ----------------------------------------------------
    // DOM Elements - AI Chatbot Panel
    // ----------------------------------------------------
    const chatMessages = document.getElementById('chat-messages');
    const chatInputForm = document.getElementById('chat-input-form');
    const chatUserMessage = document.getElementById('chat-user-message');

    // Modal drawer elements
    const detailsModal = document.getElementById('details-modal');
    const modalCandidateName = document.getElementById('modal-candidate-name');
    const modalCandidateFilename = document.getElementById('modal-candidate-filename');
    const modalCandidateScore = document.getElementById('modal-candidate-score');
    const modalCandidateScoreBar = document.getElementById('modal-candidate-score-bar');
    const modalCandidateWords = document.getElementById('modal-candidate-words');
    const modalCandidateSkillsCount = document.getElementById('modal-candidate-skills-count');
    const modalCandidateSkillsTags = document.getElementById('modal-candidate-skills-tags');
    const modalCandidateMissingCount = document.getElementById('modal-candidate-missing-count');
    const modalCandidateMissingTags = document.getElementById('modal-candidate-missing-tags');

    // ----------------------------------------------------
    // Stateful Controller Constants
    // ----------------------------------------------------
    let currentResumeFile = null;
    let currentResumeText = ""; // Persisted for chatbot
    let candidateReportData = null; // Download reference
    
    let recruiterFilesList = [];
    let recruiterLeaderboardData = []; // CSV export reference

    // Initialize triggers
    setupDragAndDrop();
    setupChatbotInitialMessage();

    // ----------------------------------------------------
    // Candidate Drag and Drop Handlers
    // ----------------------------------------------------
    candidateFileInput.addEventListener('click', (e) => e.stopPropagation());
    candidateDropZone.addEventListener('click', () => candidateFileInput.click());
    candidateFileInput.addEventListener('change', (e) => handleCandidateFileSelect(e.target.files[0]));

    function handleCandidateFileSelect(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            showNotification('Invalid File', 'Please upload a PDF document only.', 'error');
            return;
        }
        currentResumeFile = file;
        candidateFileName.textContent = file.name;
        candidateFileSize.textContent = formatBytes(file.size);
        
        candidateUploadContent.style.display = 'none';
        candidateFileInfo.style.display = 'flex';
        candidateDropZone.style.borderColor = 'var(--accent-indigo)';
        
        // Try extracting preview text for Chatbot initialization
        extractResumeTextPreview(file);
    }

    candidateRemoveFile.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentResumeFile = null;
        currentResumeText = "";
        candidateFileInput.value = '';
        candidateFileInfo.style.display = 'none';
        candidateUploadContent.style.display = 'block';
        candidateDropZone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });

    // Helper: Async upload text preview to state
    async function extractResumeTextPreview(file) {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('job_description', ''); // Direct analysis extracts text cleanly
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                // Set resume text globally for chatbot
                if (data.top_keywords) {
                    // Extract text preview on backend using keywords or custom endpoints
                    // Since text isn't returned fully to save bandwidth, we will request backend text extraction
                    // or let backend run stateful evaluations. We will keep currentResumeText populated in Javascript
                    // via API responses when chatbot queries are processed.
                }
            }
        } catch (e) {
            console.warn("Silent text preview loading error:", e);
        }
    }

    // ----------------------------------------------------
    // Recruiter Drag and Drop Handlers (Multi-files)
    // ----------------------------------------------------
    recruiterFileInput.addEventListener('click', (e) => e.stopPropagation());
    recruiterDropZone.addEventListener('click', () => recruiterFileInput.click());
    recruiterFileInput.addEventListener('change', (e) => handleRecruiterFilesSelect(e.target.files));

    function handleRecruiterFilesSelect(files) {
        if (!files || files.length === 0) return;
        
        // Merge files list
        for (let i = 0; i < files.length; i++) {
            if (files[i].type === 'application/pdf') {
                recruiterFilesList.push(files[i]);
            } else {
                showNotification('Ignored File', `${files[i].name} was skipped. PDFs only.`, 'warning');
            }
        }
        
        renderRecruiterFilesInfo();
    }

    function renderRecruiterFilesInfo() {
        if (recruiterFilesList.length === 0) {
            recruiterFileInfo.style.display = 'none';
            recruiterUploadContent.style.display = 'block';
            recruiterDropZone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            return;
        }

        recruiterUploadContent.style.display = 'none';
        recruiterFileInfo.style.display = 'flex';
        recruiterDropZone.style.borderColor = 'var(--accent-indigo)';

        recruiterFilesCount.textContent = `${recruiterFilesList.length} resume(s) uploaded`;
        
        let totalSize = 0;
        recruiterPillList.innerHTML = '';
        recruiterFilesList.forEach((file, index) => {
            totalSize += file.size;
            const pill = document.createElement('div');
            pill.className = 'file-pill';
            pill.innerHTML = `
                <span>📄 ${file.name.substring(0, 18)}${file.name.length > 18 ? '...' : ''}</span>
                <span style="cursor:pointer; font-weight:bold; color:var(--color-danger); margin-left:3px;" onclick="removeRecruiterPill(${index})">×</span>
            `;
            recruiterPillList.appendChild(pill);
        });

        recruiterFilesSize.textContent = formatBytes(totalSize);
    }

    window.removeRecruiterPill = function(index) {
        recruiterFilesList.splice(index, 1);
        renderRecruiterFilesInfo();
        if (recruiterFilesList.length === 0) {
            recruiterFileInput.value = '';
        }
    };

    recruiterRemoveFiles.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        recruiterFilesList = [];
        recruiterFileInput.value = '';
        renderRecruiterFilesInfo();
    });

    // Setup global Drag events
    function setupDragAndDrop() {
        ['dragenter', 'dragover'].forEach(eventName => {
            candidateDropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                candidateDropZone.classList.add('dragover');
            });
            recruiterDropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                recruiterDropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            candidateDropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                candidateDropZone.classList.remove('dragover');
            });
            recruiterDropZone.addEventListener(eventName, (e) => {
                e.preventDefault(); e.stopPropagation();
                recruiterDropZone.classList.remove('dragover');
            });
        });

        candidateDropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            handleCandidateFileSelect(dt.files[0]);
        });

        recruiterDropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            handleRecruiterFilesSelect(dt.files);
        });
    }

    // ----------------------------------------------------
    // Candidate Submission Logic
    // ----------------------------------------------------
    candidateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        triggerCandidateAnalysis(false); // JD analysis
    });

    directAtsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerCandidateAnalysis(true); // Direct analysis
    });

    async function triggerCandidateAnalysis(isDirectCheck) {
        if (!currentResumeFile) {
            showNotification('Upload Required', 'Please select or drop your resume PDF file.', 'warning');
            return;
        }

        const jdValue = candidateJdInput.value.trim();
        if (!isDirectCheck && !jdValue) {
            showNotification('Details Needed', 'Please paste a job description or use "Direct ATS Check" for formatting analysis.', 'warning');
            return;
        }

        // Setup loading state
        candidateEmptyState.style.display = 'none';
        candidateDashboardContent.style.display = 'none';
        candidateLoadingState.style.display = 'flex';
        candidateAnalyzeBtn.disabled = true;
        directAtsBtn.disabled = true;

        const formData = new FormData();
        formData.append('resume', currentResumeFile);
        if (!isDirectCheck) {
            formData.append('job_description', jdValue);
        }

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Analysis server error');
            }

            const data = await response.json();
            candidateReportData = data; // Cache reference
            renderCandidateDashboard(data);
            
            // Auto trigger chatbot notification about uploaded document
            appendBotMessage(`Great! I've fully parsed your resume: **"${currentResumeFile.name}"**. Ask me anything about your qualifications or check structural issues below.`);
            showNotification('Success', 'Resume parsing completed!', 'success');

        } catch (error) {
            console.error(error);
            showNotification('Error', 'Failed to read PDF. Make sure it is not password-protected.', 'error');
            candidateLoadingState.style.display = 'none';
            candidateEmptyState.style.display = 'flex';
        } finally {
            candidateAnalyzeBtn.disabled = false;
            directAtsBtn.disabled = false;
        }
    }

    // ----------------------------------------------------
    // Candidate Dashboard Rendering
    // ----------------------------------------------------
    function renderCandidateDashboard(data) {
        candidateLoadingState.style.display = 'none';
        candidateDashboardContent.style.display = 'block';

        const score = data.match_score;
        statsWordsVal.textContent = data.resume_word_count;

        // Reset gauge coloring
        candidateGaugeFill.className = 'gauge-fill';
        candidateScoreLabel.textContent = data.is_direct ? 'ATS Score' : 'Match Score';
        statsScoreType.textContent = data.is_direct ? 'Direct Format' : 'Job Match';

        if (score < 40) {
            candidateGaugeFill.classList.add('score-poor');
            statsScoreIndicator.className = 'stat-indicator indicator-poor';
            statsScoreIndicator.textContent = 'Needs Work';
            
            candidateSuggestionBox.className = 'suggestion-box status-poor';
            candidateSuggestionIcon.textContent = '⚠️';
            candidateSuggestionTitle.textContent = 'Format Enhancement Required';
            candidateSuggestionDesc.textContent = data.is_direct 
                ? 'Your resume has critical formatting or structural issues. Check the audit list below to resolve them before applying.'
                : 'This resume has low keyword matching. Optimize your experience bullets by listing specific details matching the job guidelines.';
        } else if (score < 70) {
            candidateGaugeFill.classList.add('score-avg');
            statsScoreIndicator.className = 'stat-indicator indicator-avg';
            statsScoreIndicator.textContent = 'Moderate Quality';
            
            candidateSuggestionBox.className = 'suggestion-box status-avg';
            candidateSuggestionIcon.textContent = '💡';
            candidateSuggestionTitle.textContent = 'Solid Foundation - Needs Polish';
            candidateSuggestionDesc.textContent = data.is_direct 
                ? 'Your layout contains core professional standards but could be improved. Add missing sections to optimize parsing scores.'
                : 'Good overlap! Quantify metrics or add missing skills shown in the keyword tracker to surpass the 70% threshold.';
        } else {
            candidateGaugeFill.classList.add('score-good');
            statsScoreIndicator.className = 'stat-indicator indicator-good';
            statsScoreIndicator.textContent = 'Excellent Layout';
            
            candidateSuggestionBox.className = 'suggestion-box status-good';
            candidateSuggestionIcon.textContent = '🎉';
            candidateSuggestionTitle.textContent = 'Highly Optimized Resume';
            candidateSuggestionDesc.textContent = data.is_direct 
                ? 'Your layout adheres perfectly to ATS structures. Maintain this format for your job applications!'
                : 'Outstanding job! Your resume matches the job description excellently. Proofread contact details and apply with confidence.';
        }

        // SVG Circle Offset (Circumference = 314.15)
        const strokeDashOffset = 314.15 - (314.15 * (score / 100));
        setTimeout(() => {
            candidateGaugeFill.style.strokeDashoffset = strokeDashOffset;
        }, 150);

        animateCount(candidateScoreText, 0, score, '%');

        // Populate issues container (Requirement 6)
        issuesListContainer.innerHTML = '';
        if (data.issues && data.issues.length > 0) {
            issuesCount.textContent = data.issues.length;
            accordionIssues.style.display = 'block';
            data.issues.forEach(issue => {
                const li = document.createElement('li');
                li.textContent = issue;
                issuesListContainer.appendChild(li);
            });
        } else {
            issuesCount.textContent = '0';
            const li = document.createElement('li');
            li.style.color = 'var(--accent-teal)';
            li.textContent = 'No structural format issues identified. Your layout is robust!';
            issuesListContainer.appendChild(li);
        }

        // Match Mode conditional fields
        if (data.is_direct) {
            jdWordsCard.style.display = 'none';
            accordionMatchingSkills.style.display = 'none';
            accordionMissingKeywords.style.display = 'none';
        } else {
            jdWordsCard.style.display = 'grid';
            statsJdWordsVal.textContent = data.jd_word_count;
            accordionMatchingSkills.style.display = 'block';
            accordionMissingKeywords.style.display = 'block';

            // matching tags
            matchingSkillsCount.textContent = data.matching_skills.length;
            matchingSkillsTags.innerHTML = '';
            if (data.matching_skills.length > 0) {
                data.matching_skills.forEach(skill => {
                    const tag = document.createElement('span');
                    tag.className = 'tag tag-match';
                    tag.textContent = skill;
                    matchingSkillsTags.appendChild(tag);
                });
            } else {
                matchingSkillsTags.innerHTML = '<p class="file-limits">No matching skills detected in description.</p>';
            }

            // missing tags
            missingKeywordsCount.textContent = data.missing_keywords.length;
            missingKeywordsTags.innerHTML = '';
            if (data.missing_keywords.length > 0) {
                data.missing_keywords.forEach(word => {
                    const tag = document.createElement('span');
                    tag.className = 'tag tag-missing';
                    tag.textContent = word;
                    missingKeywordsTags.appendChild(tag);
                });
            } else {
                missingKeywordsTags.innerHTML = '<p class="file-limits" style="color: var(--accent-teal)">Zero missing keywords. Ideal formatting!</p>';
            }
        }

        // Render Word Cloud falling tags
        wordcloudTags.innerHTML = '';
        if (data.top_keywords && data.top_keywords.length > 0) {
            const frequencies = data.top_keywords.map(k => k.count);
            const max = Math.max(...frequencies);
            const min = Math.min(...frequencies);
            const range = max - min || 1;

            const pastelColors = ['#818cf8', '#a78bfa', '#fb7185', '#60a5fa', '#34d399', '#f472b6', '#22d3ee', '#fbbf24'];

            data.top_keywords.forEach(keyword => {
                const span = document.createElement('span');
                span.className = 'cloud-word';
                span.textContent = keyword.word;
                
                // Normalise sizes between 0.8rem and 1.85rem
                const factor = (keyword.count - min) / range;
                const size = 0.8 + (factor * 1.05);
                span.style.fontSize = `${size}rem`;
                span.style.color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
                span.style.fontWeight = keyword.count > (max * 0.5) ? '600' : '400';
                span.title = `Mentions: ${keyword.count}`;
                wordcloudTags.appendChild(span);
            });
        } else {
            wordcloudTags.innerHTML = '<p class="file-limits">Word cloud details unavailable.</p>';
        }
    }

    // ----------------------------------------------------
    // Chatbot Functions
    // ----------------------------------------------------
    function setupChatbotInitialMessage() {
        chatMessages.innerHTML = '';
        const greet = document.createElement('div');
        greet.className = 'chat-message bot-msg';
        greet.textContent = "Hi! I am your AI career coach helper. Upload your resume and I can summarize your experience, suggest skills, or highlight formatting issues. Try asking me once your resume is loaded!";
        chatMessages.appendChild(greet);
    }

    window.sendQuickPrompt = function(promptText) {
        chatUserMessage.value = promptText;
        chatInputForm.dispatchEvent(new Event('submit'));
    };

    window.handleChatSubmit = async function(event) {
        if (event) event.preventDefault();

        const messageText = chatUserMessage.value.trim();
        if (!messageText) return;

        // Render user message bubble
        appendUserMessage(messageText);
        chatUserMessage.value = '';

        // Check if resume is loaded
        if (!currentResumeFile && !candidateReportData) {
            appendBotMessage("I can respond best if you upload a resume first! Drag a PDF resume in the Candidate Workspace panel on the right.");
            return;
        }

        // Render Bot Typing Indicator bubble
        const typingBubble = document.createElement('div');
        typingBubble.className = 'chat-message bot-msg';
        typingBubble.id = 'chat-typing-indicator';
        typingBubble.innerHTML = `<span style="font-style:italic; opacity:0.7">Assistant is analyzing...</span>`;
        chatMessages.appendChild(typingBubble);
        scrollChatToBottom();

        // Prepare request body
        // We will pass the full cached keyword stats or parsed structures so the bot can build responses offline if needed.
        let parsedTextContext = "Resume Candidate Profile: ";
        if (candidateReportData) {
            parsedTextContext += `Match Score: ${candidateReportData.match_score}%. Words count: ${candidateReportData.resume_word_count}.\n`;
            if (candidateReportData.top_keywords) {
                parsedTextContext += `Key recurring terms: ${candidateReportData.top_keywords.map(kw => kw.word).join(', ')}.\n`;
            }
            if (candidateReportData.matching_skills && candidateReportData.matching_skills.length > 0) {
                parsedTextContext += `Detected Skills: ${candidateReportData.matching_skills.join(', ')}.\n`;
            }
            if (candidateReportData.issues && candidateReportData.issues.length > 0) {
                parsedTextContext += `Layout issues found: ${candidateReportData.issues.join('. ')}.\n`;
            }
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    resume_text: parsedTextContext
                })
            });

            // Remove typing bubble
            const indicator = document.getElementById('chat-typing-indicator');
            if (indicator) chatMessages.removeChild(indicator);

            if (!response.ok) throw new Error('API chat error');
            const data = await response.json();
            appendBotMessage(data.reply);

        } catch (e) {
            console.error(e);
            const indicator = document.getElementById('chat-typing-indicator');
            if (indicator) chatMessages.removeChild(indicator);
            appendBotMessage("Apologies, I encountered an issue handling that request. Please try again.");
        }
    };

    function appendUserMessage(msgText) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-message user-msg';
        bubble.textContent = msgText;
        chatMessages.appendChild(bubble);
        scrollChatToBottom();
    }

    function appendBotMessage(markdownText) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-message bot-msg';
        
        // Basic Markdown parser logic (Bold, Bullet List, Links)
        let formattedHtml = markdownText
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/-\s(.*?)(\n|<br>)/g, '<li>$1</li>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#60a5fa">$1</a>');

        // Wrap consecutive <li> into a list format
        formattedHtml = formattedHtml.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

        bubble.innerHTML = formattedHtml;
        chatMessages.appendChild(bubble);
        scrollChatToBottom();
    }

    function scrollChatToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ----------------------------------------------------
    // Recruiter Screening logic
    // ----------------------------------------------------
    recruiterForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (recruiterFilesList.length === 0) {
            showNotification('Resumes Missing', 'Please upload at least one candidate resume.', 'warning');
            return;
        }

        const jdText = recruiterJdInput.value.trim();
        if (!jdText) {
            showNotification('Description Missing', 'Please paste the target job description to match against.', 'warning');
            return;
        }

        // UI status transitions
        recruiterEmptyState.style.display = 'none';
        recruiterDashboardContent.style.display = 'none';
        recruiterLoadingState.style.display = 'flex';
        recruiterAnalyzeBtn.disabled = true;

        const formData = new FormData();
        recruiterFilesList.forEach(file => {
            formData.append('resumes', file);
        });
        formData.append('job_description', jdText);

        try {
            const response = await fetch('/api/rank', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Ranking server failure');
            const data = await response.json();
            
            recruiterLeaderboardData = data.candidates; // Store for CSV
            renderRecruiterLeaderboard(data.candidates);
            showNotification('Success', 'Resumes ranked successfully!', 'success');

        } catch (err) {
            console.error(err);
            showNotification('Ranking Error', 'Failed to score resumes. Verify files match layout standards.', 'error');
            recruiterLoadingState.style.display = 'none';
            recruiterEmptyState.style.display = 'flex';
        } finally {
            recruiterAnalyzeBtn.disabled = false;
        }
    });

    function renderRecruiterLeaderboard(candidates) {
        recruiterLoadingState.style.display = 'none';
        recruiterDashboardContent.style.display = 'block';
        
        leaderboardRows.innerHTML = '';
        if (!candidates || candidates.length === 0) {
            leaderboardRows.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No matching candidates processed.</td></tr>`;
            return;
        }

        candidates.forEach((cand, idx) => {
            const rank = idx + 1;
            let rankClass = 'rank-other';
            let rankText = rank;
            
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            // Determine score class
            let scoreClass = 'score-poor';
            if (cand.score >= 70) scoreClass = 'score-good';
            else if (cand.score >= 40) scoreClass = 'score-avg';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 60px;">
                    <span class="rank-badge ${rankClass}">${rankText}</span>
                </td>
                <td>
                    <div style="font-weight:600; color:white;">${cand.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${cand.filename}</div>
                </td>
                <td style="width: 180px; text-align: right;">
                    <div style="font-weight:700; font-size:1rem; color:white; margin-bottom: 2px;">${cand.score.toFixed(1)}%</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill ${scoreClass}" style="width: ${cand.score}%"></div>
                    </div>
                </td>
                <td style="width: 120px; text-align: center;">
                    <button class="btn-view-details" onclick="openCandidateDetails(${idx})">View Match</button>
                </td>
            `;
            leaderboardRows.appendChild(row);
        });
    }

    // Modal view details trigger
    window.openCandidateDetails = function(index) {
        const cand = recruiterLeaderboardData[index];
        if (!cand) return;

        modalCandidateName.textContent = cand.name;
        modalCandidateFilename.textContent = cand.filename;
        modalCandidateScore.textContent = `${cand.score.toFixed(1)}%`;
        modalCandidateWords.textContent = `${cand.word_count} words`;

        // Apply score class to modal score indicator
        modalCandidateScoreBar.className = 'progress-bar-fill';
        if (cand.score >= 70) modalCandidateScoreBar.classList.add('score-good');
        else if (cand.score >= 40) modalCandidateScoreBar.classList.add('score-avg');
        else modalCandidateScoreBar.classList.add('score-poor');
        
        modalCandidateScoreBar.style.width = `${cand.score}%`;

        // Load tags
        modalCandidateSkillsCount.textContent = cand.matching_skills_count;
        modalCandidateSkillsTags.innerHTML = '';
        if (cand.matching_skills && cand.matching_skills.length > 0) {
            cand.matching_skills.forEach(skill => {
                const tag = document.createElement('span');
                tag.className = 'tag tag-match';
                tag.textContent = skill;
                modalCandidateSkillsTags.appendChild(tag);
            });
            if (cand.matching_skills_count > cand.matching_skills.length) {
                const extra = document.createElement('span');
                extra.className = 'tag';
                extra.style.background = 'rgba(255,255,255,0.03)';
                extra.style.color = 'var(--text-muted)';
                extra.textContent = `+${cand.matching_skills_count - cand.matching_skills.length} more`;
                modalCandidateSkillsTags.appendChild(extra);
            }
        } else {
            modalCandidateSkillsTags.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted)">None matched.</span>';
        }

        // Fetch missing keywords for this candidate from the API rank response
        modalCandidateMissingCount.textContent = cand.missing_keywords_count;
        modalCandidateMissingTags.innerHTML = '';
        // Note: the backend returns keywords preview in detail if we request, let's display count advice
        if (cand.missing_keywords_count > 0) {
            modalCandidateMissingTags.innerHTML = `<span style="font-size:0.8rem; color:var(--color-warning)">Contains ${cand.missing_keywords_count} missing keywords from Job Description. Recommend optimization.</span>`;
        } else {
            modalCandidateMissingTags.innerHTML = '<span style="font-size:0.8rem; color:var(--accent-teal)">Perfect overlap! Contains all major keywords.</span>';
        }

        detailsModal.style.display = 'flex';
    };

    window.closeModal = function() {
        detailsModal.style.display = 'none';
    };

    // Close modal on escape or background click
    window.onclick = function(e) {
        if (e.target === detailsModal) {
            closeModal();
        }
    };

    // ----------------------------------------------------
    // CSV and Report Downloading
    // ----------------------------------------------------
    candidateDownloadBtn.addEventListener('click', () => {
        if (!candidateReportData) return;

        const report = `================================================
CV-PRO AI ATS EVALUATION REPORT
================================================
Candidate Document: ${currentResumeFile.name}
Report Generated: ${new Date().toLocaleDateString()}
ATS Score Evaluation: ${candidateReportData.match_score.toFixed(2)}%
Evaluation Type: ${candidateReportData.is_direct ? 'General ATS Structure Audit' : 'Job Match Similarity Matching'}

SUMMARY METRICS:
------------------------------------------------
- Word Count: ${candidateReportData.resume_word_count}
${candidateReportData.is_direct ? '' : `- Job Description Word Count: ${candidateReportData.jd_word_count}`}

CRITICAL LAYOUT AUDIT AUDITING DETAILS:
------------------------------------------------
${candidateReportData.issues && candidateReportData.issues.length > 0 
    ? candidateReportData.issues.map(iss => `[!] ${iss}`).join('\n') 
    : 'No critical structural alignment errors detected. Structure looks fully compliant.'}

${candidateReportData.is_direct ? '' : `
MATCHING SPECIFIC SKILLS DETECTED:
------------------------------------------------
${candidateReportData.matching_skills.length > 0 ? candidateReportData.matching_skills.join(', ') : 'None identified.'}

MISSING SPECIFIC KEYWORDS FROM DESCRIPTION:
------------------------------------------------
${candidateReportData.missing_keywords.length > 0 ? candidateReportData.missing_keywords.join(', ') : 'No keywords missing.'}
`}

RECONSTRUCTED IMPROVEMENTS:
------------------------------------------------
${candidateReportData.match_score < 40 
    ? 'Significant rewrite is needed. Focus on including standard academic sections, detailing achievements using action verbs, and integrating core requirements.' 
    : candidateReportData.match_score < 70 
    ? 'Decent parsing baseline. Incorporate the missing skills highlighted in lists above and quantify achievements (e.g. percentages, values).' 
    : 'Highly optimized resume format. Ready for submission. Best of luck!'}

================================================
`;
        
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CV_PRO_ATS_Report_${candidateReportData.match_score.toFixed(0)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    window.exportRecruiterCSV = function() {
        if (!recruiterLeaderboardData || recruiterLeaderboardData.length === 0) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Rank,Candidate Name,Filename,Match Score %,Word Count,Matching Skills Count\n";

        recruiterLeaderboardData.forEach((cand, idx) => {
            const rank = idx + 1;
            const row = `"${rank}","${cand.name.replace(/"/g, '""')}","${cand.filename.replace(/"/g, '""')}","${cand.score.toFixed(2)}","${cand.word_count}","${cand.matching_skills_count}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Recruiter_Leaderboard_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ----------------------------------------------------
    // Animation & Helper Utilities
    // ----------------------------------------------------
    function animateCount(element, start, end, suffix = '') {
        let current = start;
        const duration = 1000; // ms
        const steps = 40;
        const stepTime = duration / steps;
        const increment = (end - start) / steps;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = `${Math.round(end)}${suffix}`;
                clearInterval(timer);
            } else {
                element.textContent = `${Math.round(current)}${suffix}`;
            }
        }, stepTime);
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Dynamic Toast Notifications
    function showNotification(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let accentColor = 'var(--accent-indigo)';
        if (type === 'error') accentColor = 'var(--color-danger)';
        if (type === 'warning') accentColor = 'var(--color-warning)';
        if (type === 'success') accentColor = 'var(--accent-teal)';
        
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(13, 18, 33, 0.95);
            backdrop-filter: blur(10px);
            border-left: 4px solid ${accentColor};
            border-top: 1px solid var(--border-glass);
            border-right: 1px solid var(--border-glass);
            border-bottom: 1px solid var(--border-glass);
            padding: 0.85rem 1.25rem;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            max-width: 320px;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        `;

        toast.innerHTML = `
            <div style="font-weight: 600; color: white; font-size: 0.9rem; margin-bottom: 0.2rem;">${title}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; line-height: 1.35;">${message}</div>
        `;

        // Style animation declarations
        if (!document.getElementById('toast-animation-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'toast-animation-styles';
            styleSheet.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(110%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    to { opacity: 0; transform: translateY(8px); }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3500);
    }
});
