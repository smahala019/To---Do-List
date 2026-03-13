// =====================
    // STATE
    // =====================
    let state = {
      currentWeek: 'custom',
      theme: 'dark',
      completedDays: {},
      completedTasks: {},
      deletedTasks: {},
      taskNotes: {},
      customDays: [],
      dayNotes: {},
      openDayId: null
    };

    // For delete modal
    let pendingDeleteDayId = null;

    // =====================
    // DOM REFS
    // =====================
    const daysContainer = document.getElementById('daysContainer');
    const dayTitleInput = document.getElementById('dayTitleInput');
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const themeBtn = document.getElementById('themeBtn');
    const progressBar = document.getElementById('progressBar');
    const completedDaysEl = document.getElementById('completedDays');
    const totalXpEl = document.getElementById('totalXP');
    const levelBadgeEl = document.getElementById('levelBadge');
    const streakEl = document.getElementById('streakCount');
    const weekTabsContainer = document.getElementById('weekTabsContainer');
    const customInputSection = document.getElementById('customInputSection');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const fileImport = document.getElementById('fileImport');
    const heatmapGrid = document.getElementById('heatmapGrid');
    const deleteModal = document.getElementById('deleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');

    // =====================
    // AUDIO ENGINE
    // =====================
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type) {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'check') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'celebration') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      }
    }

    // =====================
    // CONFETTI ENGINE
    // =====================
    function triggerConfetti() {
      const colors = ['#06d6a0', '#0891b2', '#fbbf24', '#ffffff'];
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
          position: fixed; width: 10px; height: 10px; background: ${colors[Math.floor(Math.random() * colors.length)]};
          left: ${Math.random() * 100}vw; top: -10px; opacity: 1; border-radius: 2px; pointer-events: none; z-index: 9999;
        `;
        document.body.appendChild(confetti);
        
        const animation = confetti.animate([
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
          duration: Math.random() * 2000 + 1000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => confetti.remove();
      }
    }

    // =====================
    // STORAGE
    // =====================
    function saveState() {
      localStorage.setItem('todoProState', JSON.stringify(state));
    }

    function loadState() {
      const saved = localStorage.getItem('todoProState');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDark ? 'dark' : 'light';
      }
    }

    // =====================
    // THEME
    // =====================
    function applyTheme() {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
    function toggleTheme() {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      saveState();
    }

    // =====================
    // CALCULATIONS
    // =====================
    const LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 8000, 10000];
    
    function getLevel(xp) {
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i]) return i + 1;
      }
      return 1;
    }

    function calculateStats() {
      let totalXP = 0;
      let completedDaysCount = 0;
      
      state.customDays.forEach(day => {
        let dayAllDone = true;
        const dayKey = day.id;
        const tasks = day.tasks || [];
        const deletedIndices = state.deletedTasks[dayKey] || [];
        
        tasks.forEach((taskText, i) => {
          if (deletedIndices.includes(i)) return;
          if (state.completedTasks[dayKey]?.[i]) totalXP += 10;
          else dayAllDone = false;
        });

        if (state.completedDays[dayKey]) {
          completedDaysCount++;
          totalXP += 50; 
        }
      });

      let streak = completedDaysCount; 

      return { totalXP, completedDaysCount, streak, level: getLevel(totalXP) };
    }

    function updateProgressUI(stats) {
      const totalDaysCount = state.customDays.length || 1;
      progressBar.style.width = `${(stats.completedDaysCount / totalDaysCount) * 100}%`;
      completedDaysEl.textContent = stats.completedDaysCount;
      totalXpEl.textContent = stats.totalXP;
      levelBadgeEl.textContent = `Lv. ${stats.level}`;
      streakEl.textContent = stats.streak;
    }

    function updateHeatmap() {
      heatmapGrid.innerHTML = '';
      for (let i = 1; i <= 30; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        let level = 0;
        
        if (state.customDays[i-1]) {
             const did = state.customDays[i-1].id;
             if(state.completedDays[did]) level = 3;
        }
        
        cell.dataset.level = level;
        
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = `Day ${i}`;
        cell.appendChild(tooltip);
        
        heatmapGrid.appendChild(cell);
      }
    }

    // =====================
    // RENDER TABS
    // =====================
    function renderTabs() {
      weekTabsContainer.innerHTML = '';
      
      const customBtn = document.createElement('button');
      customBtn.className = `week-tab active`;
      customBtn.dataset.week = 'custom';
      customBtn.setAttribute('role', 'tab');
      customBtn.textContent = 'My Tasks';
      customBtn.onclick = () => switchTab('custom');
      weekTabsContainer.appendChild(customBtn);
    }

    function switchTab(week) {
      state.currentWeek = 'custom';
      renderTabs();
      renderDays();
    }

    // =====================
    // RENDER DAYS
    // =====================
    function renderDays() {
      daysContainer.innerHTML = '';
      customInputSection.style.display = 'flex';
      renderCustomDays();
      updateProgressUI(calculateStats());
      updateHeatmap();
    }

    // =====================
    // CREATE DAY CARD (Unified)
    // =====================
    function createDayCard(day, index, idKey) {
      const card = document.createElement('div');
      card.className = 'day-card';
      card.dataset.dayId = idKey;
      card.style.animationDelay = `${index * 0.05}s`;
      
      if (state.openDayId === idKey) card.classList.add('expanded');

      const isDayCompleted = state.completedDays[idKey] || false;
      const deletedIndices = state.deletedTasks[idKey] || [];
      const currentNotes = state.dayNotes[idKey] || "";
      
      let visibleCount = 0;
      let doneCount = 0;
      (day.tasks || []).forEach((taskText, i) => {
        if (!deletedIndices.includes(i)) {
            visibleCount++;
            if (state.completedTasks[idKey]?.[i]) doneCount++;
        }
      });

      if (isDayCompleted) card.classList.add('completed');
      
      card.innerHTML = `
        <div class="day-header" role="button" tabindex="0" aria-expanded="${state.openDayId === idKey}">
          <div class="day-checkbox ${isDayCompleted ? 'checked' : ''}" data-day="${idKey}" role="checkbox" aria-checked="${isDayCompleted}" tabindex="0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="day-info">
            <div class="day-title">${day.title}</div>
            <div class="day-subtitle">${day.subtitle}</div>
          </div>
          <div class="day-meta">
            <span class="task-count">${doneCount}/${visibleCount}</span>
            <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="day-actions">
            <button class="day-action-btn delete-day-btn" data-day-id="${idKey}" title="Delete Day">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="sub-tasks">
          <div class="sub-tasks-inner">
            
            <!-- Internal Tabs -->
            <div class="day-tabs">
              <button class="day-tab-btn active" data-tab="tasks">Tasks</button>
              <button class="day-tab-btn" data-tab="notes">Day Notes</button>
            </div>

            <!-- Tasks Tab Content -->
            <div class="tab-content active" id="tasks-content-${idKey}">
              <div class="tasks-list">
                ${generateTaskListHTML(day.tasks || [], idKey, deletedIndices)}
              </div>

              <div class="add-subtask-area">
                <label class="add-subtask-label">Add New Sub-Task</label>
                <div class="add-subtask-input-wrapper">
                  <textarea class="subtask-textarea" placeholder="Type a task... (one line per task)" data-day="${idKey}"></textarea>
                  <div class="subtask-actions">
                    <button class="btn-small btn-add-subtask" data-day="${idKey}">Add Task</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes Tab Content -->
            <div class="tab-content" id="notes-content-${idKey}">
              <textarea class="notes-area" placeholder="General notes for this day..." data-note-day="${idKey}">${currentNotes}</textarea>
            </div>

          </div>
        </div>
      `;

      // --- Event Listeners ---

      // Header
      const header = card.querySelector('.day-header');
      header.addEventListener('click', (e) => {
        if (!e.target.closest('.day-checkbox') && !e.target.closest('.day-actions')) toggleAccordion(idKey);
      });

      // Tab Switching
      card.querySelectorAll('.day-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tab = btn.dataset.tab;
          card.querySelectorAll('.day-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          card.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          card.querySelector(`#${tab}-content-${idKey}`).classList.add('active');
        });
      });

      // Day Checkbox
      const dayCheckbox = card.querySelector('.day-checkbox');
      dayCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDayComplete(idKey, dayCheckbox);
      });

      // Delete Day Button
      const deleteDayBtn = card.querySelector('.delete-day-btn');
      deleteDayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteModal(idKey);
      });

      // Subtask Checkboxes
      card.querySelectorAll('.sub-checkbox[data-task]').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSubTask(idKey, parseInt(checkbox.dataset.task), checkbox);
        });
      });

      // Task Notes Toggle & Input
      card.querySelectorAll('.toggle-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = btn.closest('.task-list-item');
            parent.classList.toggle('has-notes');
            const noteId = btn.dataset.noteId;
            if (!state.taskNotes[noteId]) state.taskNotes[noteId] = "";
            saveState();
        });
      });

      card.querySelectorAll('.task-note-area').forEach(area => {
        area.addEventListener('input', (e) => {
            const noteId = area.dataset.noteId;
            state.taskNotes[noteId] = e.target.value;
            saveState();
        });
      });

      // Delete Task
      card.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(idKey, parseInt(btn.dataset.delTask));
        });
      });

      // Add Subtask
      const addSubBtn = card.querySelector('.btn-add-subtask');
      const textarea = card.querySelector('.subtask-textarea');
      addSubBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addBulkSubtasks(idKey, textarea.value);
        textarea.value = '';
      });

      // Day Notes
      const notesArea = card.querySelector('.notes-area');
      notesArea.addEventListener('input', (e) => {
        state.dayNotes[idKey] = e.target.value;
        saveState();
      });

      return card;
    }

    function generateTaskListHTML(tasks, dayId, deletedIndices) {
      return tasks.map((task, i) => {
        if (deletedIndices.includes(i)) return '';
        
        const noteId = `${dayId}-${i}`;
        const noteContent = state.taskNotes[noteId] || "";
        const isCompleted = state.completedTasks[dayId]?.[i];
        
        return `
          <div class="task-list-item ${isCompleted ? 'completed' : ''} ${noteContent ? 'has-notes' : ''}">
            <div class="task-row-main">
              <div class="sub-checkbox ${isCompleted ? 'checked' : ''}" 
                   data-day="${dayId}" data-task="${i}" 
                   role="checkbox" tabindex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="task-text">${task}</span>
              <div class="task-actions">
                <button class="action-btn toggle-note-btn" data-note-id="${noteId}" title="Add Note">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                     <polyline points="14 2 14 8 20 8"></polyline>
                     <line x1="16" y1="13" x2="8" y2="13"></line>
                     <line x1="16" y1="17" x2="8" y2="17"></line>
                   </svg>
                </button>
                <button class="action-btn delete delete-task-btn" data-day="${dayId}" data-del-task="${i}" title="Remove">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <line x1="18" y1="6" x2="6" y2="18"></line>
                     <line x1="6" y1="6" x2="18" y2="18"></line>
                   </svg>
                </button>
              </div>
            </div>
            <textarea class="task-note-area" data-note-id="${noteId}" placeholder="Notes for: ${task}...">${noteContent}</textarea>
          </div>
        `;
      }).join('');
    }

    // =====================
    // ACTIONS
    // =====================
    function toggleAccordion(dayId) {
      state.openDayId = state.openDayId === dayId ? null : dayId;
      saveState();
      renderDays();
    }

    function showXpPopup(element, amount) {
      const popup = document.createElement('div');
      popup.className = 'xp-popup';
      popup.textContent = `+${amount} XP`;
      element.appendChild(popup);
      setTimeout(() => popup.remove(), 1000);
    }

    // Delete Modal Functions
    function showDeleteModal(dayId) {
      pendingDeleteDayId = dayId;
      deleteModal.classList.add('active');
    }

    function hideDeleteModal() {
      pendingDeleteDayId = null;
      deleteModal.classList.remove('active');
    }

    function deleteEntireDay(dayId) {
      const index = state.customDays.findIndex(d => d.id === dayId);
      if (index > -1) {
        state.customDays.splice(index, 1);
        delete state.completedDays[dayId];
        delete state.completedTasks[dayId];
        delete state.deletedTasks[dayId];
        delete state.dayNotes[dayId];
        if (state.openDayId === dayId) state.openDayId = null;
        saveState();
        renderDays();
        playSound('check');
      }
    }

    function toggleDayComplete(dayNum, checkboxEl) {
      const wasCompleted = state.completedDays[dayNum];
      state.completedDays[dayNum] = !wasCompleted;
      
      if (!wasCompleted) {
        playSound('celebration');
        triggerConfetti();
        showXpPopup(checkboxEl, 50);
        
        const dayData = state.customDays.find(d => d.id === dayNum);
        if (dayData) {
          if (!state.completedTasks[dayNum]) state.completedTasks[dayNum] = {};
          dayData.tasks.forEach((_, i) => { state.completedTasks[dayNum][i] = true; });
        }
      } else {
        playSound('check');
      }
      
      saveState();
      renderDays();
    }

    function toggleSubTask(dayNum, taskIndex, checkboxEl) {
      if (!state.completedTasks[dayNum]) state.completedTasks[dayNum] = {};
      const wasCompleted = state.completedTasks[dayNum][taskIndex];
      state.completedTasks[dayNum][taskIndex] = !wasCompleted;

      if (!wasCompleted) {
        playSound('check');
        showXpPopup(checkboxEl, 10);
      }
      
      checkDayCompletion(dayNum);
      saveState();
      renderDays();
    }

    function deleteTask(dayNum, taskIndex) {
      if (!state.deletedTasks[dayNum]) state.deletedTasks[dayNum] = [];
      state.deletedTasks[dayNum].push(taskIndex);
      saveState();
      renderDays();
    }

    function addBulkSubtasks(dayNum, text) {
      if (!text.trim()) return;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      const customDay = state.customDays.find(d => d.id === dayNum);
      if (customDay) {
        lines.forEach(line => customDay.tasks.push(line.trim()));
        saveState();
        renderDays();
        return;
      }
    }

    function checkDayCompletion(dayNum) {
      const dayData = state.customDays.find(d => d.id === dayNum);
      let allDone = true;
      if (dayData) {
        const deletedIndices = state.deletedTasks[dayNum] || [];
        dayData.tasks.forEach((t, i) => {
          if (!deletedIndices.includes(i)) {
             if (!state.completedTasks[dayNum]?.[i]) allDone = false;
          }
        });
      }
      state.completedDays[dayNum] = allDone;
    }

    // Custom Days Logic
    function renderCustomDays() {
      if (state.customDays.length === 0) {
        daysContainer.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="15"></line>
              <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
            <h3>No Tasks Yet</h3>
            <p>Create a new day using the inputs above to start planning.</p>
          </div>`;
        return;
      }

      daysContainer.innerHTML = '';
      state.customDays.forEach((day, index) => {
        const card = createDayCard(day, index, day.id);
        daysContainer.appendChild(card);
      });
    }

    function addCustomDay(title, firstTask) {
      if (!title.trim()) return;
      const newDay = {
        id: 'c' + Date.now(),
        title: title,
        subtitle: "Custom Task",
        tasks: firstTask ? [firstTask] : []
      };
      state.customDays.push(newDay);
      saveState();
      renderDays();
      dayTitleInput.value = '';
      taskInput.value = '';
    }

    // Import/Export
    function exportData() {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'todo-pro-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    function importData(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.customDays) {
            state = imported;
            saveState();
            renderTabs();
            renderDays();
            playSound('celebration');
            alert('Data imported successfully!');
          } else {
            alert('Invalid backup file.');
          }
        } catch (err) {
          console.error(err);
          alert('Error reading file.');
        }
      };
      reader.readAsText(file);
    }

    // =====================
    // EVENT BINDING
    // =====================
    themeBtn.addEventListener('click', toggleTheme);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => fileImport.click());
    fileImport.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });

    addBtn.addEventListener('click', () => {
      addCustomDay(dayTitleInput.value, taskInput.value);
    });

    // Delete modal events
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    confirmDeleteBtn.addEventListener('click', () => {
      if (pendingDeleteDayId) {
        deleteEntireDay(pendingDeleteDayId);
        hideDeleteModal();
      }
    });

    // Close modal on overlay click
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) hideDeleteModal();
    });

    // Keyboard support for modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
        hideDeleteModal();
      }
    });

    // =====================
    // INIT
    // =====================
    function init() {
      loadState();
      applyTheme();
      renderTabs();
      renderDays();
    }

    init();
