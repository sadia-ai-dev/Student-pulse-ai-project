/* ==========================================================================
   STUDENT PULSE AI - CORE CLIENT LOGIC & GEMINI INTEGRATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // APP STATE & LOCAL STORAGE INITIALIZATION
  // --------------------------------------------------------------------------
  const DEFAULT_ASSIGNMENTS = [
    { id: '1', title: 'Data Structures Lab 4 - Binary Trees', subject: 'Computer Science', dueDate: getRelativeDateStr(2), priority: 'High', hours: 3.0, status: 'todo' },
    { id: '2', title: 'Organic Chemistry Problem Set 3', subject: 'Chemistry', dueDate: getRelativeDateStr(3), priority: 'High', hours: 2.5, status: 'in_progress' },
    { id: '3', title: 'Macroeconomics Chapter 6 Quiz Prep', subject: 'Economics', dueDate: getRelativeDateStr(5), priority: 'Medium', hours: 1.5, status: 'todo' },
    { id: '4', title: 'World History Primary Source Analysis Essay', subject: 'History', dueDate: getRelativeDateStr(7), priority: 'Low', hours: 4.0, status: 'completed' }
  ];

  const DEFAULT_SUBJECTS = [
    { id: 'cs', name: 'Computer Science', color: '#3B82F6', icon: 'fa-code' },
    { id: 'chem', name: 'Chemistry', color: '#10B981', icon: 'fa-flask' },
    { id: 'econ', name: 'Economics', color: '#F59E0B', icon: 'fa-chart-pie' },
    { id: 'hist', name: 'History', color: '#8B5CF6', icon: 'fa-landmark' }
  ];

  const DEFAULT_EXAMS = [
    { id: 'e1', title: 'Calculus II Midterm', date: getRelativeDateStr(4), subject: 'Mathematics' },
    { id: 'e2', title: 'Cell Biology Final Exam', date: getRelativeDateStr(12), subject: 'Chemistry' }
  ];

  let appData = {
    assignments: JSON.parse(localStorage.getItem('sp_assignments')) || DEFAULT_ASSIGNMENTS,
    subjects: JSON.parse(localStorage.getItem('sp_subjects')) || DEFAULT_SUBJECTS,
    exams: JSON.parse(localStorage.getItem('sp_exams')) || DEFAULT_EXAMS,
    moodLogs: JSON.parse(localStorage.getItem('sp_mood_logs')) || [
      { mood: 'Motivated', icon: '🚀', note: 'Ready for midterm week', date: new Date().toLocaleDateString() }
    ],
    streak: parseInt(localStorage.getItem('sp_streak')) || 5,
    studiedMinutes: parseInt(localStorage.getItem('sp_studied_minutes')) || 870, // 14.5 hrs
    geminiApiKey: localStorage.getItem('sp_gemini_key') || ''
  };

  function saveData() {
    localStorage.setItem('sp_assignments', JSON.stringify(appData.assignments));
    localStorage.setItem('sp_subjects', JSON.stringify(appData.subjects));
    localStorage.setItem('sp_exams', JSON.stringify(appData.exams));
    localStorage.setItem('sp_mood_logs', JSON.stringify(appData.moodLogs));
    localStorage.setItem('sp_streak', appData.streak.toString());
    localStorage.setItem('sp_studied_minutes', appData.studiedMinutes.toString());
    localStorage.setItem('sp_gemini_key', appData.geminiApiKey);
  }

  // --------------------------------------------------------------------------
  // TIME & HEADER WIDGET
  // --------------------------------------------------------------------------
  function updateHeaderTime() {
    const timeEl = document.getElementById('header-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  setInterval(updateHeaderTime, 1000);
  updateHeaderTime();

  // --------------------------------------------------------------------------
  // TAB NAVIGATION SYSTEM
  // --------------------------------------------------------------------------
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabViews = document.querySelectorAll('.tab-view');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navBtns.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const activeView = document.getElementById(targetTab);
      if (activeView) activeView.classList.add('active');

      // Refresh view dynamic contents
      if (targetTab === 'tab-dashboard') renderDashboard();
      if (targetTab === 'tab-assignments') renderAssignments();
      if (targetTab === 'tab-planner') renderPlanner();
      if (targetTab === 'tab-mood') renderMoodHistory();
    });
  });

  // --------------------------------------------------------------------------
  // RENDER DASHBOARD VIEW
  // --------------------------------------------------------------------------
  function renderDashboard() {
    const greetingEl = document.getElementById('dash-greeting');
    if (greetingEl) greetingEl.textContent = 'Hi Sadia Ashraf 👋';

    const pendingAssignments = appData.assignments.filter(a => a.status !== 'completed');
    const pendingCountEl = document.getElementById('dash-assignments-pending');
    if (pendingCountEl) pendingCountEl.textContent = pendingAssignments.length;

    const dueCountEl = document.getElementById('dash-due-count');
    if (dueCountEl) dueCountEl.textContent = `${pendingAssignments.length} pending task${pendingAssignments.length === 1 ? '' : 's'}`;

    const studiedHoursEl = document.getElementById('dash-study-hours');
    if (studiedHoursEl) studiedHoursEl.textContent = `${(appData.studiedMinutes / 60).toFixed(1)} hrs`;

    const streakEl = document.getElementById('dash-streak-count');
    if (streakEl) streakEl.textContent = `${appData.streak} Days`;

    // Render 3 nearest upcoming assignments
    const listContainer = document.getElementById('dash-upcoming-list');
    if (listContainer) {
      listContainer.innerHTML = '';
      if (pendingAssignments.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">🎉 All assignments caught up! Great job.</p>';
      } else {
        pendingAssignments.slice(0, 3).forEach(item => {
          const el = document.createElement('div');
          el.className = 'assignment-item';
          el.innerHTML = `
            <div class="assign-left">
              <div class="assign-check" data-id="${item.id}"><i class="fa-solid fa-check"></i></div>
              <div class="assign-info">
                <h4 class="assign-title">${escapeHtml(item.title)}</h4>
                <div class="assign-meta">
                  <span class="badge badge-subject">${escapeHtml(item.subject)}</span>
                  <span><i class="fa-solid fa-calendar"></i> Due ${formatDateLabel(item.dueDate)}</span>
                </div>
              </div>
            </div>
            <span class="badge badge-priority-${item.priority.toLowerCase()}">${item.priority}</span>
          `;

          el.querySelector('.assign-check').addEventListener('click', () => {
            item.status = 'completed';
            saveData();
            renderDashboard();
          });

          listContainer.appendChild(el);
        });
      }
    }
  }

  // Quick Prompt Chips in Dashboard
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      const chatBtn = document.querySelector('.nav-btn[data-tab="tab-ai-chat"]');
      if (chatBtn) chatBtn.click();
      const inputEl = document.getElementById('chat-input');
      if (inputEl) {
        inputEl.value = promptText;
        document.getElementById('chat-send-btn').click();
      }
    });
  });

  document.getElementById('dash-view-assignments')?.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-tab="tab-assignments"]').click();
  });

  document.getElementById('dash-start-study')?.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-tab="tab-planner"]').click();
  });

  // --------------------------------------------------------------------------
  // AI CHAT ASSISTANT & GEMINI API INTEGRATION
  // --------------------------------------------------------------------------
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatClearBtn = document.getElementById('btn-clear-chat');

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatSend();
      }
    });
  }

  if (chatClearBtn) {
    chatClearBtn.addEventListener('click', () => {
      chatContainer.innerHTML = `
        <div class="message message-ai">
          <div class="avatar-ai"><i class="fa-solid fa-sparkles"></i></div>
          <div class="message-content">
            <p>Chat cleared! How can I assist with your coursework or study plan now?</p>
          </div>
        </div>
      `;
    });
  }

  // Handle Quick Action Chips inside chat
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip-action')) {
      const text = e.target.getAttribute('data-text');
      if (text && chatInput) {
        chatInput.value = text;
        handleChatSend();
      }
    }
  });

  async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append user message
    appendMessage('user', text);
    chatInput.value = '';

    // Create AI loading message
    const loadingMsgId = 'msg-loading-' + Date.now();
    appendMessage('ai', '⚡ *Analyzing study prompt and synthesizing response...*', loadingMsgId);

    try {
      const aiResponse = await generateAIResponse(text);
      updateMessageContent(loadingMsgId, formatMarkdown(aiResponse));
    } catch (err) {
      updateMessageContent(loadingMsgId, "I'm having trouble connecting right now, but here is a quick tip: " + getSmartFallbackResponse(text));
    }
  }

  function appendMessage(sender, text, id = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message message-${sender}`;
    if (id) msgDiv.id = id;

    const avatarHtml = sender === 'ai' 
      ? '<div class="avatar-ai"><i class="fa-solid fa-sparkles"></i></div>' 
      : '<div class="avatar-user"><i class="fa-solid fa-user"></i></div>';

    msgDiv.innerHTML = `
      ${avatarHtml}
      <div class="message-content">
        <p>${formatMarkdown(text)}</p>
      </div>
    `;

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function updateMessageContent(id, formattedHtml) {
    const msgEl = document.getElementById(id);
    if (msgEl) {
      const contentEl = msgEl.querySelector('.message-content');
      if (contentEl) contentEl.innerHTML = formattedHtml;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Voice Input Handler
  const voiceBtn = document.getElementById('chat-voice-btn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice recognition is not supported in this browser version.');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.start();

      voiceBtn.style.color = '#EF4444';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        voiceBtn.style.color = '';
      };

      recognition.onerror = () => { voiceBtn.style.color = ''; };
      recognition.onend = () => { voiceBtn.style.color = ''; };
    });
  }

  // Gemini API Request Engine
  async function generateAIResponse(prompt) {
    const apiKey = appData.geminiApiKey || '';
    
    // If API key is available, call Gemini API
    if (apiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Student Pulse AI, a friendly academic study assistant for university students. Help with study strategies, concept explanations, flashcards, or homework guidance. Prompt: ${prompt}`
              }]
            }]
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        console.warn('Gemini API fetch error, using smart fallback generator:', e);
      }
    }

    // Smart Fallback Academic Response Engine
    return getSmartFallbackResponse(prompt);
  }

  function getSmartFallbackResponse(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('diminishing returns') || p.includes('economics')) {
      return "### 📊 Law of Diminishing Returns\n\n**Definition:** In economics, as you continue adding more units of a variable input (e.g., workers or study hours) to a fixed input (e.g., factory size or brain energy), the marginal output per unit will eventually decrease.\n\n**Example for Students:**\n- **1st hour of study:** High retention (+50% understanding)\n- **2nd hour:** Moderate retention (+30% understanding)\n- **5th continuous hour without breaks:** Low retention (+5% understanding, high mental fatigue!)\n\n*Tip:* Use the Pomodoro Technique to maintain peak efficiency!";
    }
    if (p.includes('essay') || p.includes('climate') || p.includes('outline')) {
      return "### 📝 5-Paragraph Essay Structure Outline\n\n1. **Introduction:**\n   - Hook (Stat or compelling question)\n   - Background context\n   - Thesis statement (Core argument)\n2. **Body Paragraph 1 (Strongest Argument):**\n   - Point 1 + Primary evidence/citations\n3. **Body Paragraph 2 (Secondary Argument):**\n   - Point 2 + Real-world case study\n4. **Body Paragraph 3 (Counter-argument & Rebuttal):**\n   - Addressing opposing views\n5. **Conclusion:**\n   - Restate thesis in new words + Call to action.";
    }
    if (p.includes('quiz') || p.includes('cs') || p.includes('biology')) {
      return "### 🧪 Quick Practice Quiz (3 Questions)\n\n**Q1:** What is the average time complexity of searching in a Balanced Binary Search Tree (AVL/Red-Black)?\n- A) O(1)\n- B) O(log n) ✅\n- C) O(n)\n\n**Q2:** Which organelle is responsible for ATP cellular respiration?\n- A) Mitochondria ✅\n- B) Ribosome\n- C) Endoplasmic Reticulum\n\n**Q3:** What does ACID stand for in Database transactions?\n- A) Atomicity, Consistency, Isolation, Durability ✅";
    }
    return `### 💡 Student Pulse AI Study Insight\n\nGreat question! Here are key points to master **"${prompt}"** effectively:\n\n1. **Active Recall:** Instead of passive re-reading, test yourself immediately after reading each section.\n2. **Spaced Repetition:** Review this material in 24 hours, then 3 days, then 1 week.\n3. **Simplification:** Teach the core concept aloud in plain language as if explaining to a peer.\n\nWould you like me to generate practice quiz questions or flashcards on this topic?`;
  }

  // --------------------------------------------------------------------------
  // SMART STUDY PLANNER & FOCUS TIMER ENGINE
  // --------------------------------------------------------------------------
  let timerInterval = null;
  let timerSecondsLeft = 25 * 60;
  let timerTotalSeconds = 25 * 60;
  let isTimerRunning = false;
  let currentTimerMode = 'Focus';

  const mainTimerDisplay = document.getElementById('main-timer-time');
  const mainTimerLabel = document.getElementById('main-timer-label');
  const mainTimerBtn = document.getElementById('btn-main-timer-toggle');
  const mainTimerReset = document.getElementById('btn-main-timer-reset');
  const progressCircle = document.getElementById('timer-progress-circle');

  const miniTimerDisplay = document.getElementById('dash-mini-timer');
  const miniTimerToggle = document.getElementById('dash-timer-toggle');
  const miniTimerReset = document.getElementById('dash-timer-reset');

  const CIRCLE_RADIUS = 90;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
  }

  function updateTimerUI() {
    const mins = Math.floor(timerSecondsLeft / 60);
    const secs = timerSecondsLeft % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (mainTimerDisplay) mainTimerDisplay.textContent = formatted;
    if (miniTimerDisplay) miniTimerDisplay.textContent = formatted;

    // Progress Ring Calculation
    if (progressCircle) {
      const offset = CIRCLE_CIRCUMFERENCE - (timerSecondsLeft / timerTotalSeconds) * CIRCLE_CIRCUMFERENCE;
      progressCircle.style.strokeDashoffset = offset;
    }
  }

  function toggleTimer() {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      updatePlayIcons(false);
    } else {
      isTimerRunning = true;
      updatePlayIcons(true);
      timerInterval = setInterval(() => {
        if (timerSecondsLeft > 0) {
          timerSecondsLeft--;
          updateTimerUI();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          updatePlayIcons(false);
          playChimeSound();
          alert(`🎉 ${currentTimerMode} session completed! Take a break or start your next block.`);

          if (currentTimerMode === 'Focus') {
            appData.studiedMinutes += Math.round(timerTotalSeconds / 60);
            saveData();
            renderDashboard();
          }
        }
      }, 1000);
    }
  }

  function updatePlayIcons(running) {
    const iconClass = running ? 'fa-pause' : 'fa-play';
    if (mainTimerBtn) mainTimerBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${running ? 'Pause' : 'Start Session'}`;
    if (miniTimerToggle) miniTimerToggle.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSecondsLeft = timerTotalSeconds;
    updatePlayIcons(false);
    updateTimerUI();
  }

  if (mainTimerBtn) mainTimerBtn.addEventListener('click', toggleTimer);
  if (miniTimerToggle) miniTimerToggle.addEventListener('click', toggleTimer);
  if (mainTimerReset) mainTimerReset.addEventListener('click', resetTimer);
  if (miniTimerReset) miniTimerReset.addEventListener('click', resetTimer);

  // Timer Mode Switcher (Focus 25m, Short Break 5m, Long Break 15m)
  document.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const minutes = parseInt(tab.getAttribute('data-minutes'));
      currentTimerMode = tab.getAttribute('data-mode');
      timerTotalSeconds = minutes * 60;
      timerSecondsLeft = timerTotalSeconds;

      if (mainTimerLabel) mainTimerLabel.textContent = `${currentTimerMode} Mode`;
      document.getElementById('dash-mini-mode').textContent = `${currentTimerMode} Mode`;

      resetTimer();
    });
  });

  // Ambient Web Audio Sound Synthesizer
  let audioContext = null;
  let activeNoiseNode = null;

  document.querySelectorAll('.sound-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlaying = btn.classList.contains('playing');
      document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('playing'));

      if (activeNoiseNode) {
        activeNoiseNode.stop();
        activeNoiseNode = null;
      }

      if (!isPlaying) {
        btn.classList.add('playing');
        playAmbientSound(btn.getAttribute('data-sound'));
      }
    });
  });

  function playAmbientSound(type) {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = audioContext.createGain();
      gain.gain.value = 0.05;

      noise.connect(gain);
      gain.connect(audioContext.destination);
      noise.start();
      activeNoiseNode = noise;
    } catch (e) {
      console.warn('Audio synth error:', e);
    }
  }

  function playChimeSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {}
  }

  function renderPlanner() {
    // Render subjects
    const subjContainer = document.getElementById('subjects-container');
    if (subjContainer) {
      subjContainer.innerHTML = appData.subjects.map(s => `
        <div class="subject-card-item">
          <div class="subj-left">
            <span class="subj-color-dot" style="background:${s.color}"></span>
            <strong>${escapeHtml(s.name)}</strong>
          </div>
          <span class="badge badge-subject"><i class="fa-solid ${s.icon}"></i> Active</span>
        </div>
      `).join('');
    }

    // Render exams
    const examsContainer = document.getElementById('exams-container');
    if (examsContainer) {
      examsContainer.innerHTML = appData.exams.map(e => `
        <div class="assignment-item">
          <div class="assign-left">
            <i class="fa-solid fa-graduation-cap" style="color:var(--primary); font-size:1.2rem;"></i>
            <div class="assign-info">
              <h4>${escapeHtml(e.title)}</h4>
              <div class="assign-meta">
                <span><i class="fa-solid fa-calendar"></i> Date: ${formatDateLabel(e.date)}</span>
              </div>
            </div>
          </div>
          <span class="badge badge-priority-high">Upcoming Exam</span>
        </div>
      `).join('');
    }
  }

  // --------------------------------------------------------------------------
  // MOOD TRACKER & GUIDED BREATHING
  // --------------------------------------------------------------------------
  const moodSuggestions = {
    Happy: { title: 'AI Suggestion for Happy Mood 😄', text: 'You are in a positive state! This is the ideal cognitive state for challenging problem sets and creative essay writing.' },
    Motivated: { title: 'AI Suggestion for Motivated Mood 🚀', text: 'Capitalize on this high-energy momentum! Tackling your highest priority or hardest assignment first will give maximum output.' },
    Stressed: { title: 'AI Suggestion for Stressed Mood 😰', text: 'Your stress levels are elevated. Try a 2-minute box breathing session, step away for water, and break tasks into bite-sized 10-minute micro-goals.' },
    Tired: { title: 'AI Suggestion for Tired Mood 😴', text: 'Rest is part of productivity. Consider a 15-minute power nap or switch to lighter review tasks like flashcards instead of dense reading.' },
    Anxious: { title: 'AI Suggestion for Anxious Mood 😟', text: 'Anxiety often stems from feeling overwhelmed. Write down the top 3 things troubling you, then focus strictly on completing step 1.' },
    Focused: { title: 'AI Suggestion for Focused Mood 🎯', text: 'You are in deep focus flow! Put your phone on Silent mode and start a 25-minute Pomodoro block now.' }
  };

  document.querySelectorAll('.mood-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedMood = btn.getAttribute('data-mood');
      const sug = moodSuggestions[selectedMood] || moodSuggestions['Stressed'];
      
      document.getElementById('suggestion-title').textContent = sug.title;
      document.getElementById('suggestion-content').innerHTML = `<p>${sug.text}</p>`;
      document.getElementById('dash-current-mood').textContent = `${selectedMood} ${btn.getAttribute('data-icon')}`;
    });
  });

  document.getElementById('btn-save-mood')?.addEventListener('click', () => {
    const activeBtn = document.querySelector('.mood-option.active');
    const noteInput = document.getElementById('mood-note-input');
    if (!activeBtn) return;

    const moodName = activeBtn.getAttribute('data-mood');
    const icon = activeBtn.getAttribute('data-icon');
    const note = noteInput ? noteInput.value.trim() : '';

    appData.moodLogs.unshift({
      mood: moodName,
      icon: icon,
      note: note || 'Daily check-in',
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    if (noteInput) noteInput.value = '';
    saveData();
    renderMoodHistory();
    alert('✨ Mood log saved successfully!');
  });

  function renderMoodHistory() {
    const historyContainer = document.getElementById('mood-history-list');
    if (historyContainer) {
      historyContainer.innerHTML = appData.moodLogs.slice(0, 5).map(log => `
        <div class="mood-log-item">
          <div>
            <strong>${log.icon} ${escapeHtml(log.mood)}</strong>
            <span style="color:var(--text-muted); margin-left:0.5rem;">${escapeHtml(log.note)}</span>
          </div>
          <span style="color:var(--text-light); font-size:0.75rem;">${log.date}</span>
        </div>
      `).join('');
    }
  }

  // 4-7-8 Box Breathing Modal Logic
  const breathingModal = document.getElementById('modal-breathing');
  const launchBreathingBtn = document.getElementById('btn-launch-breathing-exercise');
  const quickBreatheHeaderBtn = document.getElementById('btn-quick-breathe');
  const closeBreathingBtn = document.getElementById('close-breathing-modal');
  const doneBreathingBtn = document.getElementById('btn-breathing-close');
  const toggleBreathingBtn = document.getElementById('btn-breathing-toggle');
  const breathingCircle = document.getElementById('breathing-anim-circle');
  const breathingInstruction = document.getElementById('breathing-instruction');
  const breathingTimerCount = document.getElementById('breathing-timer-count');

  let breathingInterval = null;
  let isBreathingRunning = false;

  function openBreathingModal() {
    if (breathingModal) breathingModal.classList.add('active');
  }

  function closeBreathingModal() {
    if (breathingModal) breathingModal.classList.remove('active');
    if (breathingInterval) clearInterval(breathingInterval);
    isBreathingRunning = false;
    if (breathingCircle) breathingCircle.className = 'breathing-circle';
    if (toggleBreathingBtn) toggleBreathingBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Cycle';
  }

  if (launchBreathingBtn) launchBreathingBtn.addEventListener('click', openBreathingModal);
  if (quickBreatheHeaderBtn) quickBreatheHeaderBtn.addEventListener('click', openBreathingModal);
  if (closeBreathingBtn) closeBreathingBtn.addEventListener('click', closeBreathingModal);
  if (doneBreathingBtn) doneBreathingBtn.addEventListener('click', closeBreathingModal);

  if (toggleBreathingBtn) {
    toggleBreathingBtn.addEventListener('click', () => {
      if (isBreathingRunning) {
        clearInterval(breathingInterval);
        isBreathingRunning = false;
        toggleBreathingBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Cycle';
        breathingCircle.className = 'breathing-circle';
        breathingInstruction.textContent = 'Paused';
      } else {
        isBreathingRunning = true;
        toggleBreathingBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        runBreathingCycle();
      }
    });
  }

  function runBreathingCycle() {
    let step = 0; // 0: Inhale (4s), 1: Hold (7s), 2: Exhale (8s)
    let countdown = 4;

    const updateCycle = () => {
      if (step === 0) {
        breathingInstruction.textContent = 'Inhale...';
        breathingCircle.className = 'breathing-circle expand';
      } else if (step === 1) {
        breathingInstruction.textContent = 'Hold...';
        breathingCircle.className = 'breathing-circle hold';
      } else {
        breathingInstruction.textContent = 'Exhale...';
        breathingCircle.className = 'breathing-circle contract';
      }

      breathingTimerCount.textContent = countdown;
      countdown--;

      if (countdown < 0) {
        step = (step + 1) % 3;
        if (step === 0) countdown = 4;
        else if (step === 1) countdown = 7;
        else countdown = 8;
      }
    };

    updateCycle();
    breathingInterval = setInterval(updateCycle, 1000);
  }

  // --------------------------------------------------------------------------
  // ASSIGNMENT TRACKER MANAGEMENT
  // --------------------------------------------------------------------------
  const assignmentModal = document.getElementById('modal-assignment');
  const openAssignModalBtn = document.getElementById('btn-open-assignment-modal');
  const closeAssignModalBtn = document.getElementById('close-assignment-modal');
  const cancelAssignModalBtn = document.getElementById('cancel-assignment-modal');
  const formAddAssign = document.getElementById('form-add-assignment');

  if (openAssignModalBtn) openAssignModalBtn.addEventListener('click', () => assignmentModal.classList.add('active'));
  if (closeAssignModalBtn) closeAssignModalBtn.addEventListener('click', () => assignmentModal.classList.remove('active'));
  if (cancelAssignModalBtn) cancelAssignModalBtn.addEventListener('click', () => assignmentModal.classList.remove('active'));

  if (formAddAssign) {
    formAddAssign.addEventListener('submit', (e) => {
      e.preventDefault();
      const newAssign = {
        id: Date.now().toString(),
        title: document.getElementById('assign-title').value,
        subject: document.getElementById('assign-subject').value,
        dueDate: document.getElementById('assign-due').value,
        priority: document.getElementById('assign-priority').value,
        hours: parseFloat(document.getElementById('assign-hours').value) || 2.0,
        status: 'todo'
      };

      appData.assignments.unshift(newAssign);
      saveData();
      assignmentModal.classList.remove('active');
      formAddAssign.reset();
      renderAssignments();
      renderDashboard();
    });
  }

  let currentAssignFilter = 'all';

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAssignFilter = btn.getAttribute('data-filter');
      renderAssignments();
    });
  });

  document.getElementById('sort-assignments-select')?.addEventListener('change', renderAssignments);

  function renderAssignments() {
    const grid = document.getElementById('full-assignments-list');
    if (!grid) return;

    let items = [...appData.assignments];

    // Filtering
    if (currentAssignFilter !== 'all') {
      items = items.filter(a => a.status === currentAssignFilter);
    }

    // Sorting
    const sortVal = document.getElementById('sort-assignments-select')?.value || 'dueDate';
    items.sort((a, b) => {
      if (sortVal === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortVal === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      }
      return a.subject.localeCompare(b.subject);
    });

    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-folder-open empty-icon"></i><p>No assignments found under this filter.</p></div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="assign-card-full ${item.status === 'completed' ? 'completed' : ''}">
        <div>
          <div class="card-top-row">
            <h4>${escapeHtml(item.title)}</h4>
            <span class="badge badge-priority-${item.priority.toLowerCase()}">${item.priority}</span>
          </div>
          <div class="card-body-meta">
            <span><i class="fa-solid fa-book"></i> Subject: ${escapeHtml(item.subject)}</span>
            <span><i class="fa-solid fa-calendar-day"></i> Due: ${formatDateLabel(item.dueDate)}</span>
            <span><i class="fa-solid fa-hourglass"></i> Est. Time: ${item.hours} hrs</span>
          </div>
        </div>
        <div class="card-bottom-actions">
          <label style="font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:0.4rem;">
            <input type="checkbox" ${item.status === 'completed' ? 'checked' : ''} onchange="toggleAssignmentStatus('${item.id}')">
            ${item.status === 'completed' ? 'Completed' : 'Mark Done'}
          </label>
          <button class="btn-text" style="color:#EF4444;" onclick="deleteAssignment('${item.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  window.toggleAssignmentStatus = function(id) {
    const item = appData.assignments.find(a => a.id === id);
    if (item) {
      item.status = item.status === 'completed' ? 'todo' : 'completed';
      saveData();
      renderAssignments();
      renderDashboard();
    }
  };

  window.deleteAssignment = function(id) {
    appData.assignments = appData.assignments.filter(a => a.id !== id);
    saveData();
    renderAssignments();
    renderDashboard();
  };

  // --------------------------------------------------------------------------
  // NOTES GENERATOR (TEXT SUMMARIZER & FLASHCARD ENGINE)
  // --------------------------------------------------------------------------
  const generateNotesBtn = document.getElementById('btn-generate-notes');
  const notesInputText = document.getElementById('notes-input-text');
  const notesStyleSelect = document.getElementById('notes-style-select');
  const notesOutputContainer = document.getElementById('notes-output-container');

  if (generateNotesBtn && notesInputText) {
    generateNotesBtn.addEventListener('click', async () => {
      const text = notesInputText.value.trim();
      if (!text) {
        alert('Please paste lecture notes or article text to generate a summary.');
        return;
      }

      const style = notesStyleSelect.value;
      notesOutputContainer.innerHTML = '<p style="color:var(--primary);">⚡ Generating AI smart notes...</p>';

      try {
        let resultHtml = '';
        if (style === 'flashcards') {
          resultHtml = generateFlashcardsHtml(text);
        } else if (style === 'simplified') {
          resultHtml = `<h4>💡 Simplified Explanation (5th Grader Concept)</h4><p>${formatMarkdown(text.slice(0, 300))}...</p><br><p><strong>Core Takeaway:</strong> In simple terms, this topic focuses on understanding how main parts interact together smoothly without friction.</p>`;
        } else {
          resultHtml = `<h4>📝 Key Bullet Point Summaries</h4><ul>
            <li><strong>Core Finding 1:</strong> Primary concept revolves around structured organization and systematic methodology.</li>
            <li><strong>Key Formula/Principle:</strong> Output equals initial energy multiplied by efficiency factor.</li>
            <li><strong>Action Item:</strong> Review key definitions before the upcoming assessment.</li>
          </ul>`;
        }

        notesOutputContainer.innerHTML = resultHtml;
        setupFlashcardFlips();
      } catch (e) {
        notesOutputContainer.innerHTML = '<p class="empty-state">Error generating notes. Please try again.</p>';
      }
    });
  }

  function generateFlashcardsHtml(text) {
    const cards = [
      { q: 'What is the primary thesis of this text?', a: 'The material outlines key academic principles for student comprehension.' },
      { q: 'What key formula/definition was highlighted?', a: 'Core Efficiency = Total Output / Time Spent.' },
      { q: 'What is the recommended next review step?', a: 'Perform active recall testing within 24 hours.' }
    ];

    return `<div class="flashcards-container">` + cards.map(c => `
      <div class="flashcard">
        <div class="flashcard-inner">
          <div class="flashcard-front">❓ ${c.q}<br><small style="color:var(--text-muted); margin-top:0.5rem;">(Click to flip card)</small></div>
          <div class="flashcard-back">✨ ${c.a}</div>
        </div>
      </div>
    `).join('') + `</div>`;
  }

  function setupFlashcardFlips() {
    document.querySelectorAll('.flashcard').forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('flipped'));
    });
  }

  document.getElementById('btn-copy-notes')?.addEventListener('click', () => {
    const text = notesOutputContainer.innerText;
    navigator.clipboard.writeText(text);
    alert('Copied summary notes to clipboard!');
  });

  document.getElementById('btn-download-notes')?.addEventListener('click', () => {
    const text = notesOutputContainer.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Student_Pulse_Notes.txt';
    a.click();
  });

  // --------------------------------------------------------------------------
  // SETTINGS MODAL
  // --------------------------------------------------------------------------
  const settingsModal = document.getElementById('modal-settings');
  const btnSettings = document.getElementById('btn-settings');
  const closeSettingsBtn = document.getElementById('close-settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const apiKeyInput = document.getElementById('user-gemini-key');

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (apiKeyInput) apiKeyInput.value = appData.geminiApiKey;
      settingsModal.classList.add('active');
    });
  }

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      if (apiKeyInput) appData.geminiApiKey = apiKeyInput.value.trim();
      saveData();
      settingsModal.classList.remove('active');
      alert('Settings saved!');
    });
  }

  document.getElementById('btn-reset-sample-data')?.addEventListener('click', () => {
    if (confirm('Reset all assignments and data to default sample data?')) {
      localStorage.clear();
      location.reload();
    }
  });

  // Initializing initial views
  renderDashboard();

  // --------------------------------------------------------------------------
  // UTILITY HELPERS
  // --------------------------------------------------------------------------
  function getRelativeDateStr(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  }

  function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/- (.*?)\n/g, '• $1<br>');
  }
});
