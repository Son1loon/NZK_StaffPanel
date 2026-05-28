// ========== CSRF ТОКЕН ==========
function getCsrfToken() {
    const token = document.querySelector('meta[name="_csrf"]');
    const header = document.querySelector('meta[name="_csrf_header"]');
    if (token && header) {
        return { header: header.content, token: token.content };
    }
    return null;
}

// ========== ТАБ-НАВИГАЦИЯ ==========
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-content');
    const footerNavLinks = document.querySelectorAll('[data-nav-footer]');

    function switchTab(tabId) {
        tabs.forEach(btn => {
            const btnTab = btn.getAttribute('data-tab');
            if (btnTab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        panes.forEach(pane => {
            if (pane.id === `${tabId}-tab`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        loadTabData(tabId);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            if (tabId) switchTab(tabId);
        });
    });

    footerNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = link.getAttribute('data-nav-footer');
            if (targetTab) switchTab(targetTab);
        });
    });

    if (window.location.pathname === '/hub') {
        const activeTab = document.querySelector('.nav-tab.active')?.getAttribute('data-tab') || 'dashboard';
        loadTabData(activeTab);
    }
}

async function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            await loadStats();
            await loadTeamMembers();
            break;
        case 'builders':
            await loadBuildersList();
            await loadTasks();
            break;
        case 'voice-actors':
            await loadVoiceActors();
            await loadCharacters();
            break;
        case 'ideas':
            await loadIdeas();  // <-- ЭТО ВЫЗЫВАЕТ ЗАГРУЗКУ ИДЕЙ
            break;
        case 'scripts':
            await loadScreenwriters();
            await loadScripts();
            break;
        case 'users-management':
            await loadUsersManagement();
            break;
        case 'registration-requests':
            await loadRegistrationRequests();
            break;
    }
}

// ========== ОБРАБОТКА ЯКОРЕЙ ==========
function handleHashOnLoad() {
    const hash = window.location.hash;
    if (hash) {
        const tabId = hash.substring(1);
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (tabButton) {
            setTimeout(() => tabButton.click(), 100);
        }
    }
}

// ========== СТАТИСТИКА ==========
async function loadStats() {
    try {
        const tasksResponse = await fetch('/api/tasks');
        let activeTasks = 0;
        if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            activeTasks = tasks.inProgress?.length || 0;
        }

        // Получаем статистику идей
        const ideasResponse = await fetch('/api/ideas/stats');
        let buildIdeas = 0, siteIdeas = 0;
        if (ideasResponse.ok) {
            const stats = await ideasResponse.json();
            buildIdeas = stats.buildIdeas || 0;
            siteIdeas = stats.siteIdeas || 0;
        }

        const usersResponse = await fetch('/api/stats');
        let activeUsers = 0;
        if (usersResponse.ok) {
            const stats = await usersResponse.json();
            activeUsers = stats.activeUsers || 0;
        }

        const statValues = document.querySelectorAll('.stat-value');
        if (statValues[0]) statValues[0].textContent = activeTasks;
        if (statValues[1]) statValues[1].textContent = buildIdeas;
        if (statValues[2]) statValues[2].textContent = siteIdeas;
        if (statValues[3]) statValues[3].textContent = activeUsers;

    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Обновление счётчика всех персонажей
async function updateAllCharactersCount() {
    try {
        const response = await fetch('/api/characters');
        if (response.ok) {
            const characters = await response.json();
            const countSpan = document.getElementById('allCharactersCount');
            if (countSpan) {
                countSpan.textContent = `${characters.length} персонажей`;
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}
// Показать всех персонажей (очищает фильтр)
function showAllCharacters() {
    currentSelectedActor = null;

    // Убираем активный класс у всех актёров
    document.querySelectorAll('.voice-actor-card').forEach(card => {
        card.classList.remove('active');
    });

    // Загружаем всех персонажей
    loadCharacters(null);
}


// Забрать персонажа у актёра
async function unassignCharacter(characterId, characterName) {
    if (!confirm(`Забрать персонажа "${characterName}" у актёра?`)) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/characters/${characterId}/unassign`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            showNotification('✅ Персонаж отобран', 'success');
            await loadCharacters(currentSelectedActor);
            await loadVoiceActors();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Загрузка аудиофайла на Cloudinary
async function uploadAudioFile(file, characterId) {
    const formData = new FormData();
    formData.append('audio', file);

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/characters/${characterId}/upload-audio`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            return data.audioUrl;
        } else {
            const error = await response.json();
            showNotification(`❌ ${error.error || 'Ошибка загрузки'}`, 'error');
            return null;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
        return null;
    }
}

// Инициализация загрузки аудио
function initAudioUpload() {
    const uploadBtn = document.getElementById('uploadAudioBtn');
    const audioFile = document.getElementById('voiceAudioFile');
    const audioFileName = document.getElementById('audioFileName');

    if (uploadBtn && audioFile) {
        uploadBtn.addEventListener('click', () => audioFile.click());

        audioFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && currentCharacterId) {
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
                uploadBtn.disabled = true;

                const audioUrl = await uploadAudioFile(file, currentCharacterId);

                if (audioUrl) {
                    document.getElementById('voiceAudioUrl').value = audioUrl;
                    audioFileName.textContent = `✅ ${file.name}`;
                    audioFileName.style.display = 'block';
                    showNotification('✅ Аудиофайл загружен', 'success');
                }

                uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Выбрать аудиофайл';
                uploadBtn.disabled = false;
                audioFile.value = '';
            }
        });
    }
}

// Обновленный saveVoiceRecord
async function saveVoiceRecord() {
    const title = document.getElementById('voiceTitle').value.trim();
    const description = document.getElementById('voiceDescription').value.trim();
    const audioUrl = document.getElementById('voiceAudioUrl').value.trim();

    if (!title) {
        showNotification('❌ Введите название озвучки', 'error');
        return;
    }

    if (!audioUrl) {
        showNotification('❌ Загрузите аудиофайл', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/characters/${currentCharacterId}/voice-record`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ title, description, audioUrl })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Озвучка добавлена', 'success');
            document.getElementById('voiceTitle').value = '';
            document.getElementById('voiceDescription').value = '';
            document.getElementById('voiceAudioUrl').value = '';
            document.getElementById('audioFileName').style.display = 'none';
            await loadCharacterVoiceRecords(currentCharacterId);
            await loadCharacters(currentSelectedActor);
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== ЗАГРУЗКА СПИСКА СТРОИТЕЛЕЙ ==========
async function loadBuildersList() {
    const container = document.getElementById('buildersListContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/builders');
        if (response.ok) {
            const builders = await response.json();
            if (builders.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет строителей</div>';
                return;
            }
            container.innerHTML = builders.map(builder => `
                <div class="builder-card" data-builder="${builder.username}">
                    <div class="builder-avatar">
                        ${builder.avatar ? `<img src="${builder.avatar}?t=${Date.now()}" alt="Avatar">` : `<i class="fas fa-hard-hat"></i>`}
                    </div>
                    <div class="builder-info">
                        <div class="builder-name">${escapeHtml(builder.username)}</div>
                        <div class="builder-stats">
                            <span><i class="fas fa-tasks"></i> активных тасков ${builder.activeTasksCount || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="error-message">Ошибка загрузки строителей</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки строителей:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки строителей</div>';
    }
}

// ========== ЗАГРУЗКА ЗАДАЧ С АККОРДЕОНОМ (КОМПАКТНАЯ ВЕРСИЯ) ==========
let currentFilter = 'all';

async function loadTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;

    try {
        let url = '/api/tasks';
        if (currentFilter && currentFilter !== 'all') {
            url += `?filter=${encodeURIComponent(currentFilter)}`;
        }

        const response = await fetch(url);
        if (response.ok) {
            const tasks = await response.json();
            const isAdmin = window.userData.isAdmin;

            await loadAssigneesForFilter();

            const filterSelect = document.getElementById('taskFilterSelect');
            if (filterSelect && currentFilter !== 'all') {
                filterSelect.value = currentFilter;
            }

            // Подсчитываем количество задач
            const inProgressCount = tasks.inProgress?.length || 0;
            const completedCount = tasks.completed?.length || 0;

            // Восстанавливаем сохраненные состояния
            const inProgressExpanded = loadAccordionState('inProgress');
            const completedExpanded = loadAccordionState('completed');

            container.innerHTML = `
                <div class="tasks-accordion compact-accordion">
                    <!-- Аккордеон: В работе -->
                    <div class="accordion-item ${inProgressExpanded ? 'expanded' : ''}">
                        <div class="accordion-header" onclick="toggleAccordion(this)">
                            <div class="accordion-title">
                                <i class="fas fa-tasks"></i>
                                <span>📋 В работе</span>
                                <span class="accordion-count ${inProgressCount > 0 ? 'has-items' : ''}">${inProgressCount}</span>
                            </div>
                            <i class="fas fa-chevron-down accordion-icon ${inProgressExpanded ? 'rotated' : ''}"></i>
                        </div>
                        <div class="accordion-body" style="${inProgressExpanded ? 'display: block;' : 'display: none;'}">
                            <div class="task-column">
                                ${inProgressCount > 0 ? tasks.inProgress.map(task => `
                                    <div class="task-card compact">
                                        <div class="task-title">📌 ${escapeHtml(task.title)}</div>
                                        <div class="task-details">
                                            <span class="task-assignee"><i class="fas fa-user-check"></i> ${escapeHtml(task.assignee)}</span>
                                            <span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span>
                                        </div>
                                        <div class="task-footer">
                                            <span class="task-creator"><i class="fas fa-user-plus"></i> ${escapeHtml(task.createdBy || 'Админ')}</span>
                                            <span class="task-deadline">📅 ${task.deadline || '—'}</span>
                                            <div class="task-actions">
                                                ${!isAdmin && task.assignee === window.userData.username ? `<button class="complete-task-btn" data-id="${task.id}" title="Завершить">✅</button>` : ''}
                                                ${isAdmin ? `<button class="complete-task-btn" data-id="${task.id}" title="Завершить">✅</button>` : ''}
                                                ${isAdmin ? `<button class="delete-task-btn" data-id="${task.id}" title="Удалить">🗑️</button>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : '<div class="empty-task">✨ Нет активных задач</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- Аккордеон: Выполнено -->
                    <div class="accordion-item ${completedExpanded ? 'expanded' : ''}">
                        <div class="accordion-header" onclick="toggleAccordion(this)">
                            <div class="accordion-title">
                                <i class="fas fa-check-circle"></i>
                                <span>✅ Выполнено</span>
                                <span class="accordion-count ${completedCount > 0 ? 'has-items' : ''}">${completedCount}</span>
                            </div>
                            <i class="fas fa-chevron-down accordion-icon ${completedExpanded ? 'rotated' : ''}"></i>
                        </div>
                        <div class="accordion-body" style="${completedExpanded ? 'display: block;' : 'display: none;'}">
                            <div class="task-column">
                                ${completedCount > 0 ? tasks.completed.map(task => `
                                    <div class="task-card compact completed">
                                        <div class="task-title">📌 ${escapeHtml(task.title)}</div>
                                        <div class="task-details">
                                            <span class="task-assignee"><i class="fas fa-user-check"></i> ${escapeHtml(task.assignee)}</span>
                                            <span class="completion-badge">✅ Выполнено</span>
                                        </div>
                                        <div class="task-footer">
                                            <span class="task-creator"><i class="fas fa-user-plus"></i> ${escapeHtml(task.createdBy || 'Админ')}</span>
                                            ${isAdmin ? `<button class="delete-task-btn" data-id="${task.id}" title="Удалить">🗑️</button>` : ''}
                                        </div>
                                    </div>
                                `).join('') : '<div class="empty-task">📭 Нет выполненных задач</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Обработчики для кнопок
            document.querySelectorAll('.complete-task-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const taskId = btn.getAttribute('data-id');
                    await completeTask(taskId);
                });
            });

            if (isAdmin) {
                document.querySelectorAll('.delete-task-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const taskId = btn.getAttribute('data-id');
                        await deleteTask(taskId);
                    });
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки задач</div>';
    }
}

// Функция для сворачивания/разворачивания аккордеона с сохранением состояния
function toggleAccordion(header) {
    const accordionItem = header.closest('.accordion-item');
    const body = accordionItem.querySelector('.accordion-body');
    const icon = header.querySelector('.accordion-icon');
    const titleText = accordionItem.querySelector('.accordion-title span')?.innerText || '';
    const isInProgress = titleText.includes('В работе');
    const isCompleted = titleText.includes('Выполнено');

    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        accordionItem.classList.add('expanded');
        if (isInProgress) saveAccordionState('inProgress', true);
        if (isCompleted) saveAccordionState('completed', true);
    } else {
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        accordionItem.classList.remove('expanded');
        if (isInProgress) saveAccordionState('inProgress', false);
        if (isCompleted) saveAccordionState('completed', false);
    }
}

async function loadAssigneesForFilter() {
    try {
        const response = await fetch('/api/tasks/assignees');
        if (response.ok) {
            const assignees = await response.json();
            const filterContainer = document.getElementById('filterContainer');
            if (filterContainer) {
                filterContainer.innerHTML = `
                    <div class="task-filters">
                        <label><i class="fas fa-filter"></i> Фильтр по исполнителю:</label>
                        <select id="taskFilterSelect" class="filter-select">
                            <option value="all">📋 Все исполнители</option>
                            ${assignees.map(assignee => `<option value="${assignee}">👤 ${assignee}</option>`).join('')}
                        </select>
                        <button id="clearFilterBtn" class="clear-filter-btn">Очистить фильтр</button>
                    </div>
                `;
                const filterSelect = document.getElementById('taskFilterSelect');
                if (filterSelect && currentFilter !== 'all') filterSelect.value = currentFilter;
                filterSelect?.addEventListener('change', async (e) => {
                    currentFilter = e.target.value;
                    await loadTasks();
                    await loadBuildersList();
                });
                document.getElementById('clearFilterBtn')?.addEventListener('click', async () => {
                    currentFilter = 'all';
                    await loadTasks();
                    await loadBuildersList();
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки исполнителей:', error);
    }
}

async function completeTask(taskId) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('✅ Таск отмечен как выполненный!');
            await loadTasks();
            await loadBuildersList();
        } else {
            showNotification('❌ Ошибка при завершении задачи', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Вы уверены, что хотите удалить эту задачу? Это действие необратимо!')) return;
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE', headers });
        if (response.ok) {
            showNotification('🗑️ Задача удалена', 'success');
            await loadTasks();
            await loadBuildersList();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка при удалении'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

function getPriorityText(priority) {
    switch(priority) {
        case 'HIGH': return '🔥 Высокий';
        case 'MEDIUM': return '⭐ Средний';
        case 'LOW': return '❄️ Низкий';
        default: return 'Средний';
    }
}

// ========== АУДИО ФАЙЛЫ ==========
async function loadAudioFiles() {
    const container = document.querySelector('#voice-actors-tab .audio-collector');
    if (!container) return;
    try {
        const response = await fetch('/api/audio');
        if (response.ok) {
            const audio = await response.json();
            container.innerHTML = `
                <div class="audio-player-list">
                    <h3><i class="fas fa-headphones"></i> Последние записи</h3>
                    ${Array.isArray(audio) && audio.length ? audio.map(a => `
                        <div class="audio-item">
                            <div class="audio-info">
                                <strong>${escapeHtml(a.name)}</strong>
                                <span>🎙️ ${escapeHtml(a.author || 'Неизвестен')}</span>
                            </div>
                            <audio controls src="${a.url}"></audio>
                        </div>
                    `).join('') : '<p>Нет аудиофайлов</p>'}
                </div>
                <div class="voice-actors-list">
                    <h4>🎭 Состав актёров</h4>
                    <ul><li>Список актёров появится позже</li></ul>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки аудио:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки аудиофайлов</div>';
    }
}

// ========== АУДИО БИБЛИОТЕКА ==========
async function loadAudioLibrary() {
    const container = document.querySelector('#audio-tab .audio-library');
    if (!container) return;
    try {
        const response = await fetch('/api/audio');
        if (response.ok) {
            const audio = await response.json();
            container.innerHTML = `
                <table class="audio-table">
                    <thead><tr><th>Название</th><th>Тип</th><th>Автор/актёр</th><th>Прослушать</th></tr></thead>
                    <tbody>
                        ${Array.isArray(audio) && audio.length ? audio.map(a => `
                            <tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.type || 'Аудио')}</td><td>${escapeHtml(a.author || 'Неизвестен')}</td><td><audio controls src="${a.url}"></audio></td></tr>
                        `).join('') : '<tr><td colspan="4">Нет аудиофайлов</td></tr>'}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки библиотеки:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки библиотеки</div>';
    }
}

// ========== РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ ==========
function initRegistrationForm() {
    const registerForm = document.getElementById('registerUserForm');
    if (!registerForm) return;
    const clearBtn = document.getElementById('clearFormBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            registerForm.reset();
            hideMessage();
        });
    }
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('newUsername')?.value.trim();
        const password = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const roles = [];
        document.querySelectorAll('.role-check:checked').forEach(cb => roles.push(cb.value));
        if (!username || !password) {
            showMessage('Заполните все поля!', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('Пароли не совпадают!', 'error');
            return;
        }
        if (password.length < 3) {
            showMessage('Пароль должен быть минимум 3 символа!', 'error');
            return;
        }
        showMessage('⏳ Регистрация...', 'loading');
        try {
            const csrf = getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrf) headers[csrf.header] = csrf.token;
            const response = await fetch('/api/admin/register-user', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ username, password, confirmPassword, roles })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showMessage('✅ ' + data.success, 'success');
                registerForm.reset();
                loadStats();
                setTimeout(() => hideMessage(), 3000);
            } else {
                showMessage('❌ ' + (data.error || 'Ошибка при регистрации'), 'error');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showMessage('❌ Ошибка соединения с сервером', 'error');
        }
    });
}

function showMessage(message, type) {
    const msgDiv = document.getElementById('registerMessage');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = 'message-container ' + type;
    msgDiv.style.display = 'block';
}

function hideMessage() {
    const msgDiv = document.getElementById('registerMessage');
    if (!msgDiv) return;
    msgDiv.style.display = 'none';
    msgDiv.textContent = '';
}

// ========== УВЕДОМЛЕНИЯ ==========
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white; padding: 12px 20px; border-radius: 10px;
        z-index: 9999; animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== УЧАСТНИКИ ==========
async function loadTeamMembers() {
    const container = document.getElementById('teamMembersContainer');
    if (!container) return;
    try {
        const usersResponse = await fetch('/api/public-users');
        const onlineResponse = await fetch('/api/online-users');
        if (usersResponse.ok && onlineResponse.ok) {
            let users = await usersResponse.json();
            const onlineData = await onlineResponse.json();
            const onlineUserIds = new Set(onlineData.onlineUserIds || []);
            const currentUser = window.userData.username;
            const isAdmin = window.userData.isAdmin;
            const uniqueUsers = [];
            const userIds = new Set();
            for (const user of users) {
                if (!userIds.has(user.id)) {
                    userIds.add(user.id);
                    user.isOnline = onlineUserIds.has(user.id);
                    uniqueUsers.push(user);
                }
            }
            users = uniqueUsers;
            const groupedUsers = { 'ADMIN': [], 'BUILDER': [], 'SCREENWRITER': [], 'VOICE_ACTOR': [], 'USER': [] };
            const roleIcons = { 'ADMIN': '<i class="fas fa-crown"></i>', 'BUILDER': '<i class="fas fa-hard-hat"></i>', 'SCREENWRITER': '<i class="fas fa-feather-alt"></i>', 'VOICE_ACTOR': '<i class="fas fa-microphone-alt"></i>', 'USER': '<i class="fas fa-user"></i>' };
            const roleColors = { 'ADMIN': 'admin', 'BUILDER': 'builder', 'SCREENWRITER': 'screenwriter', 'VOICE_ACTOR': 'voice-actor', 'USER': 'user' };
            const roleNames = { 'ADMIN': '👑 Администраторы', 'BUILDER': '🏗️ Строители', 'SCREENWRITER': '✍️ Сценаристы', 'VOICE_ACTOR': '🎙️ Актёры озвучки', 'USER': '👤 Участники' };
            users.forEach(user => {
                if (user.roles && user.roles.length > 0) {
                    if (user.roles.includes('ADMIN')) {
                        if (!groupedUsers['ADMIN'].some(u => u.id === user.id)) groupedUsers['ADMIN'].push(user);
                    } else {
                        user.roles.forEach(role => {
                            if (groupedUsers[role] && role !== 'ADMIN' && !groupedUsers[role].some(u => u.id === user.id)) groupedUsers[role].push(user);
                        });
                        if (!user.roles.some(r => r !== 'ADMIN' && r !== 'USER') && !groupedUsers['USER'].some(u => u.id === user.id)) groupedUsers['USER'].push(user);
                    }
                } else {
                    if (!groupedUsers['USER'].some(u => u.id === user.id)) groupedUsers['USER'].push(user);
                }
            });
            for (const role in groupedUsers) {
                groupedUsers[role].sort((a, b) => {
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;
                    return a.username.localeCompare(b.username);
                });
            }
            let html = '';
            for (const [role, members] of Object.entries(groupedUsers)) {
                if (members.length === 0) continue;
                html += `<div class="role-category"><div class="role-header"><span class="role-icon ${roleColors[role]}">${roleIcons[role]}</span><h3>${roleNames[role]} <span class="role-count">${members.length}</span></h3></div><div class="members-list">`;
                members.forEach(member => {
                    const isCurrentUser = member.username === currentUser;
                    const isOnline = member.isOnline;
                    const avatarUrl = member.avatar;
                    html += `<div class="member-card"><div class="member-avatar">${avatarUrl ? `<img src="${avatarUrl}?t=${Date.now()}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : `<i class="fas ${getUserIcon(member.roles)}"></i>`}</div><div class="member-name">${escapeHtml(member.username)}${isCurrentUser ? '<span class="current-user-badge">(Вы)</span>' : ''}</div><div class="member-status ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Онлайн' : 'Оффлайн'}"></div>`;
                    if (isAdmin && !isCurrentUser) {
                        html += `<div class="member-actions"><button class="delete-user-btn" onclick="deleteUser(${member.id}, '${escapeHtml(member.username)}')"><i class="fas fa-trash"></i></button></div>`;
                    }
                    html += `</div>`;
                });
                html += `</div></div>`;
            }
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="error-message">Ошибка загрузки команды</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки команды</div>';
    }
}

function getUserIcon(roles) {
    if (roles.includes('ADMIN')) return 'fa-crown';
    if (roles.includes('BUILDER')) return 'fa-hard-hat';
    if (roles.includes('SCREENWRITER')) return 'fa-feather-alt';
    if (roles.includes('VOICE_ACTOR')) return 'fa-microphone-alt';
    return 'fa-user';
}

// ========== HEARTBEAT ==========
let heartbeatInterval = null;
let currentUserId = null;

async function getCurrentUserId() {
    try {
        const response = await fetch('/api/public-users');
        if (response.ok) {
            const users = await response.json();
            const currentUser = window.userData.username;
            const user = users.find(u => u.username === currentUser);
            if (user) {
                currentUserId = user.id;
                return currentUserId;
            }
        }
    } catch (error) {
        console.error('Ошибка получения ID пользователя:', error);
    }
    return null;
}

async function sendHeartbeat() {
    if (!currentUserId) currentUserId = await getCurrentUserId();
    if (currentUserId) {
        try {
            const csrf = getCsrfToken();
            const headers = { 'Content-Type': 'application/json' };
            if (csrf) headers[csrf.header] = csrf.token;
            await fetch('/api/heartbeat', { method: 'POST', headers: headers, body: JSON.stringify({ userId: currentUserId }) });
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    }
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// ========== ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА ==========
async function checkAdminRights() {
    try {
        const response = await fetch('/api/public-users');
        if (response.ok) {
            const users = await response.json();
            const currentUsername = window.userData.username;
            const currentUser = users.find(u => u.username === currentUsername);
            if (currentUser) {
                const isAdmin = currentUser.roles.includes('ADMIN');
                window.userData.isAdmin = isAdmin;

                const userRoleSpan = document.getElementById('userRoleSpan');
                if (userRoleSpan) userRoleSpan.textContent = isAdmin ? 'Админ' : 'Сотрудник';

                const adminButtons = document.querySelectorAll('.admin-only');
                adminButtons.forEach(btn => btn.style.display = isAdmin ? 'inline-flex' : 'none');

                const adminWelcomeDiv = document.getElementById('adminWelcomeMessage');
                if (adminWelcomeDiv) adminWelcomeDiv.style.display = isAdmin ? 'block' : 'none';

                // ========== ДОБАВЬ ЭТО ==========
                // Скрываем/показываем кнопку "Выдать таск"
                const addTaskBtn = document.querySelector('.add-task-btn');
                if (addTaskBtn) {
                    addTaskBtn.style.display = isAdmin ? 'inline-flex' : 'none';
                }
                // ========== КОНЕЦ ДОБАВЛЕНИЯ ==========

                return isAdmin;
            }
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
    return window.userData.isAdmin;
}

// ========== АВАТАРКИ ==========
async function loadHeaderAvatar() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            const user = await response.json();
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                if (user && user.avatar && user.avatar !== "") {
                    const avatarUrl = user.avatar.includes('?') ? `${user.avatar}&t=${Date.now()}` : `${user.avatar}?t=${Date.now()}`;
                    headerAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    headerAvatar.innerHTML = `<i class="fas fa-user-astronaut"></i>`;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аватарки в хедер:', error);
    }
}

async function saveAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch('/api/user/avatar', { method: 'POST', headers: headers, body: formData });
        if (response.ok) {
            const data = await response.json();
            const preview = document.getElementById('avatarPreview');
            if (preview) preview.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar">`;
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) headerAvatar.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            await loadHeaderAvatar();
            showNotification('✅ Аватар обновлён', 'success');
        } else {
            const error = await response.json();
            showNotification(`❌ Ошибка: ${error.error || 'Не удалось загрузить аватар'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========
async function loadUsersManagement() {
    const container = document.getElementById('usersManagementContainer');
    if (!container) return;
    const isAdmin = await checkAdminRights();
    if (!isAdmin) {
        container.innerHTML = '<div class="error-message">⛔ Доступ запрещён. Требуются права администратора.</div>';
        return;
    }
    try {
        const response = await fetch('/api/admin/all-users');
        if (response.ok) {
            let users = await response.json();
            const currentUser = window.userData.username;
            const uniqueUsers = [];
            const userIds = new Set();
            for (const user of users) {
                if (!userIds.has(user.id)) {
                    userIds.add(user.id);
                    uniqueUsers.push(user);
                }
            }
            users = uniqueUsers;
            let html = `<div class="users-table-container"><table class="users-management-table"><thead><tr><th>Пользователь</th><th>Текущие роли</th><th>Добавить роль</th><th>Удалить роль</th><th>Действия</th></tr></thead><tbody>`;
            users.forEach(user => {
                const isCurrentUser = user.username === currentUser;
                const currentRoles = user.roles || [];
                html += `<tr><td><div class="user-cell"><div class="user-avatar-small"><i class="fas ${getUserIcon(currentRoles)}"></i></div><span>${escapeHtml(user.username)}</span>${isCurrentUser ? '<span class="current-user-badge">(Вы)</span>' : ''}</div></td><td><div class="roles-badges">${currentRoles.map(role => `<span class="role-badge role-${role.toLowerCase()}">${getRoleName(role)}<button class="remove-role-btn" onclick="removeRoleFromUser(${user.id}, '${role}')">✖</button></span>`).join('')}${currentRoles.length === 0 ? '<span class="no-roles">Нет ролей</span>' : ''}</div></td><td><div class="role-selector"><select class="role-select" id="select-${user.id}"><option value="">-- Выбрать роль --</option><option value="ADMIN">👑 Администратор</option><option value="BUILDER">🏗️ Строитель</option><option value="SCREENWRITER">✍️ Сценарист</option><option value="VOICE_ACTOR">🎙️ Актёр озвучки</option></select><button class="add-role-btn" data-user-id="${user.id}"><i class="fas fa-plus"></i></button></div></td><td><div class="role-selector"><select class="role-select-remove" id="remove-select-${user.id}"><option value="">-- Выбрать роль --</option>${currentRoles.map(role => `<option value="${role}">${getRoleName(role)}</option>`).join('')}</select><button class="remove-role-btn-table" data-user-id="${user.id}"><i class="fas fa-minus"></i></button></div></td><td>${!isCurrentUser ? `<button class="delete-user-table-btn" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')"><i class="fas fa-trash"></i> Удалить</button>` : '<span class="self-hint">Вы не можете удалить себя</span>'}</td></tr>`;
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            document.querySelectorAll('.add-role-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const select = document.getElementById(`select-${userId}`);
                    const role = select.value;
                    if (role) {
                        await addRoleToUser(userId, role);
                        select.value = '';
                    }
                });
            });
            document.querySelectorAll('.remove-role-btn-table').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const select = document.getElementById(`remove-select-${userId}`);
                    const role = select.value;
                    if (role) {
                        await removeRoleFromUser(userId, role);
                        select.value = '';
                    }
                });
            });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки пользователей</div>';
    }
}

function getRoleName(role) {
    const roles = { 'ADMIN': 'Администратор', 'BUILDER': 'Строитель', 'SCREENWRITER': 'Сценарист', 'VOICE_ACTOR': 'Актёр озвучки', 'USER': 'Участник' };
    return roles[role] || role;
}

// ========== ДОБАВЛЕНИЕ РОЛИ ==========
async function addRoleToUser(userId, role) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch('/api/admin/all-users');
        if (response.ok) {
            const users = await response.json();
            const user = users.find(u => u.id == userId);
            if (user) {
                const currentRoles = user.roles || [];
                if (!currentRoles.includes(role)) {
                    const newRoles = [...currentRoles, role];
                    const updateResponse = await fetch(`/api/admin/users/${userId}/roles`, {
                        method: 'PUT',
                        headers: headers,
                        body: JSON.stringify({ roles: newRoles })
                    });
                    if (updateResponse.ok) {
                        showNotification(`✅ Роль ${getRoleName(role)} добавлена пользователю ${user.username}`, 'success');
                        await loadUsersManagement();
                        await loadTeamMembers();
                        await loadStats();
                        if (user.username === window.userData.username) await checkAdminRights();
                    }
                } else {
                    showNotification('⚠️ У пользователя уже есть эта роль', 'error');
                }
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== УДАЛЕНИЕ РОЛИ ==========
async function removeRoleFromUser(userId, role) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch('/api/admin/all-users');
        if (response.ok) {
            const users = await response.json();
            const user = users.find(u => u.id == userId);
            if (user) {
                const currentRoles = user.roles || [];
                if (role === 'USER' && currentRoles.length === 1) {
                    showNotification('⚠️ Нельзя удалить последнюю роль пользователя', 'error');
                    return;
                }
                const currentUser = window.userData.username;
                if (role === 'ADMIN' && user.username === currentUser) {
                    showNotification('⚠️ Нельзя удалить роль ADMIN у самого себя', 'error');
                    return;
                }
                const newRoles = currentRoles.filter(r => r !== role);
                const updateResponse = await fetch(`/api/admin/users/${userId}/roles`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify({ roles: newRoles })
                });
                if (updateResponse.ok) {
                    showNotification(`✅ Роль ${getRoleName(role)} удалена у пользователя ${user.username}`, 'success');
                    await loadUsersManagement();
                    await loadTeamMembers();
                    await loadStats();
                    if (user.username === currentUser) await checkAdminRights();
                }
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function deleteUser(userId, username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${username}"? Это действие необратимо!`)) return;
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
        if (response.ok) {
            showNotification(`✅ Пользователь "${username}" удалён`, 'success');
            await loadTeamMembers();
            await loadUsersManagement();
            await loadStats();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения с сервером', 'error');
    }
}

// ========== ЗАЯВКИ НА РЕГИСТРАЦИЮ ==========
async function loadRegistrationRequests() {
    const container = document.getElementById('requestsContainer');
    if (!container) return;
    const isAdmin = await checkAdminRights();
    if (!isAdmin) {
        container.innerHTML = '<div class="error-message">⛔ Доступ запрещён. Требуются права администратора.</div>';
        return;
    }
    try {
        const response = await fetch('/api/admin/registration-requests');
        if (response.ok) {
            const requests = await response.json();
            const badge = document.getElementById('requestsBadge');
            if (badge) {
                badge.style.display = requests.length > 0 ? 'inline-flex' : 'none';
                if (requests.length > 0) badge.textContent = requests.length;
            }
            let html = '';
            requests.forEach(req => {
                const date = new Date(req.requestedAt).toLocaleString('ru-RU');
                html += `<div class="request-card"><div class="request-info"><div class="request-username"><i class="fas fa-user-plus"></i> ${escapeHtml(req.username)}</div><div class="request-date"><i class="fas fa-calendar-alt"></i> ${date}</div></div><div class="request-actions"><button class="approve-btn" onclick="approveRequest(${req.id})"><i class="fas fa-check-circle"></i> Принять</button><button class="reject-btn" onclick="rejectRequest(${req.id})"><i class="fas fa-times-circle"></i> Отклонить</button></div></div>`;
            });
            container.innerHTML = html || '<div class="empty-state">Нет активных заявок</div>';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="error-message">❌ Ошибка загрузки заявок</div>';
    }
}

async function approveRequest(requestId) {
    if (!confirm('✅ Принять заявку? Пользователь будет создан с ролью USER.')) return;
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/admin/approve-request/${requestId}`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('✅ Заявка принята! Пользователь создан.', 'success');
            await loadRegistrationRequests();
            await loadStats();
            await loadTeamMembers();
            await loadUsersManagement();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function rejectRequest(requestId) {
    if (!confirm('❌ Отклонить заявку? Пользователь не будет создан.')) return;
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/admin/reject-request/${requestId}`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('❌ Заявка отклонена', 'success');
            await loadRegistrationRequests();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Сохранение состояния аккордеона
function saveAccordionState(accordionId, isExpanded) {
    localStorage.setItem(`accordion_${accordionId}`, isExpanded);
}

function loadAccordionState(accordionId) {
    const saved = localStorage.getItem(`accordion_${accordionId}`);
    return saved === 'true';
}

// Обнови функцию toggleAccordion
function toggleAccordion(header) {
    const accordionItem = header.closest('.accordion-item');
    const body = accordionItem.querySelector('.accordion-body');
    const icon = header.querySelector('.accordion-icon');
    const isInProgress = accordionItem.querySelector('.accordion-title span')?.innerText.includes('В работе');

    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        accordionItem.classList.add('expanded');
        if (isInProgress) saveAccordionState('inProgress', true);
        else saveAccordionState('completed', true);
    } else {
        body.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
        accordionItem.classList.remove('expanded');
        if (isInProgress) saveAccordionState('inProgress', false);
        else saveAccordionState('completed', false);
    }
}

// При загрузке задач восстанавливаем состояние
function restoreAccordionState() {
    const inProgressExpanded = loadAccordionState('inProgress');
    const completedExpanded = loadAccordionState('completed');

    const inProgressBody = document.querySelector('.accordion-item:first-child .accordion-body');
    const completedBody = document.querySelector('.accordion-item:last-child .accordion-body');
    const inProgressIcon = document.querySelector('.accordion-item:first-child .accordion-icon');
    const completedIcon = document.querySelector('.accordion-item:last-child .accordion-icon');
    const inProgressItem = document.querySelector('.accordion-item:first-child');
    const completedItem = document.querySelector('.accordion-item:last-child');

    if (inProgressBody && inProgressExpanded) {
        inProgressBody.style.display = 'block';
        if (inProgressIcon) inProgressIcon.style.transform = 'rotate(180deg)';
        if (inProgressItem) inProgressItem.classList.add('expanded');
    }

    if (completedBody && completedExpanded) {
        completedBody.style.display = 'block';
        if (completedIcon) completedIcon.style.transform = 'rotate(180deg)';
        if (completedItem) completedItem.classList.add('expanded');
    }
}

// ========== АКТЁРЫ ОЗВУЧКИ ==========
let currentSelectedActor = null;
let currentSelectedCharacter = null;
let currentCharacterId = null;

// Загрузка списка актёров
async function loadVoiceActors() {
    const container = document.getElementById('voiceActorsList');
    if (!container) return;

    try {
        const response = await fetch('/api/voice-actors');
        if (response.ok) {
            const actors = await response.json();
            if (actors.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет актёров озвучки</div>';
                return;
            }

            container.innerHTML = actors.map(actor => `
                <div class="voice-actor-card" data-actor="${actor.username}" onclick="selectVoiceActor('${escapeHtml(actor.username)}')">
                    <div class="voice-actor-avatar">
                        ${actor.avatar ? `<img src="${actor.avatar}?t=${Date.now()}" alt="Avatar">` : `<i class="fas fa-microphone-alt"></i>`}
                    </div>
                    <div class="voice-actor-info">
                        <div class="voice-actor-name">${escapeHtml(actor.username)}</div>
                        <div class="voice-actor-stats">
                            <i class="fas fa-mask"></i> ${actor.charactersCount || 0} персонажей
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="error-message">Ошибка загрузки актёров</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки актёров:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки актёров</div>';
    }
}

// Выбор актёра для фильтрации персонажей
function selectVoiceActor(username) {
    currentSelectedActor = username;

    // Обновляем активный класс
    document.querySelectorAll('.voice-actor-card').forEach(card => {
        if (card.getAttribute('data-actor') === username) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    loadCharacters(username);
}

// Загрузка персонажей (с фильтром по актёру)
async function loadCharacters(filterActor = null) {
    const container = document.getElementById('charactersList');
    if (!container) return;

    try {
        const response = await fetch('/api/characters');
        if (response.ok) {
            let characters = await response.json();

            // Обновляем счётчик всех персонажей
            await updateAllCharactersCount();

            if (filterActor) {
                characters = characters.filter(c => c.assignedTo === filterActor);
            }

            if (characters.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет персонажей</div>';
                return;
            }

            container.innerHTML = characters.map(character => `
                <div class="character-card" onclick="openCharacterModal(${character.id})">
                    <div class="character-avatar">
                        ${character.imageUrl ? `<img src="${character.imageUrl}" alt="Avatar">` : `<i class="fas fa-mask"></i>`}
                    </div>
                    <div class="character-name">${escapeHtml(character.name)}</div>
                    <div class="character-actor">
                        <i class="fas fa-user"></i> ${character.assignedTo ? escapeHtml(character.assignedTo) : 'Не назначен'}
                    </div>
                    <div class="character-stats">
                        <span><i class="fas fa-headphones"></i> ${character.voiceRecordsCount || 0} озвучек</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="error-message">Ошибка загрузки персонажей</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки персонажей:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки персонажей</div>';
    }
}

// Открытие модального окна с персонажем
async function openCharacterModal(characterId) {
    currentCharacterId = characterId;
    const modal = document.getElementById('characterModal');
    const characterNameSpan = document.getElementById('modalCharacterName');
    const characterDescSpan = document.getElementById('modalCharacterDescription');
    const characterActorSpan = document.getElementById('modalCharacterActor');
    const voiceRecordsContainer = document.getElementById('modalVoiceRecords');
    const addVoiceForm = document.getElementById('addVoiceRecordForm');

    // Показываем модальное окно
    modal.style.display = 'flex';

    // Загружаем информацию о персонаже
    try {
        const response = await fetch('/api/characters');
        if (response.ok) {
            const characters = await response.json();
            const character = characters.find(c => c.id === characterId);
            if (character) {
                characterNameSpan.textContent = character.name;
                characterDescSpan.textContent = character.description || 'Нет описания';
                characterActorSpan.textContent = character.assignedTo || 'Не назначен';

                // Показываем форму добавления озвучки только если текущий пользователь - актёр этого персонажа
                const isAssignedToMe = character.assignedTo === window.userData.username;
                const isAdmin = window.userData.isAdmin;
                addVoiceForm.style.display = (isAssignedToMe || isAdmin) ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки персонажа:', error);
    }

    // Загружаем озвучки персонажа
    await loadCharacterVoiceRecords(characterId);
}

// Загрузка озвучек персонажа
async function loadCharacterVoiceRecords(characterId) {
    const container = document.getElementById('modalVoiceRecords');
    if (!container) return;

    try {
        const response = await fetch(`/api/characters/${characterId}/voice-records`);

        if (response.status === 403) {
            const error = await response.json();
            container.innerHTML = `<div class="error-message">${error.error || 'У вас нет доступа к этому персонажу'}</div>`;
            return;
        }

        if (response.ok) {
            const records = await response.json();
            if (records.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет озвучек для этого персонажа</div>';
                return;
            }

            container.innerHTML = records.map(record => `
                <div class="voice-record-item">
                    <div class="voice-record-info">
                        <div class="voice-record-title">${escapeHtml(record.title)}</div>
                        <div class="voice-record-description">${escapeHtml(record.description || '')}</div>
                        <div class="voice-record-audio">
                            <audio controls src="${record.audioUrl}"></audio>
                        </div>
                        <div class="voice-record-meta">
                            🎙️ ${escapeHtml(record.voiceActor)} | 📅 ${new Date(record.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                    ${(record.voiceActor === window.userData.username || window.userData.isAdmin) ?
                        `<button class="delete-voice-btn" onclick="deleteVoiceRecord(${record.id})"><i class="fas fa-trash"></i> Удалить</button>` : ''}
                </div>
            `).join('');
        } else {
            const error = await response.json();
            container.innerHTML = `<div class="error-message">${error.error || 'Ошибка загрузки озвучек'}</div>`;
        }
    } catch (error) {
        console.error('Ошибка загрузки озвучек:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки озвучек</div>';
    }
}

// Добавление озвучки
async function saveVoiceRecord() {
    const title = document.getElementById('voiceTitle').value.trim();
    const description = document.getElementById('voiceDescription').value.trim();
    const audioUrl = document.getElementById('voiceAudioUrl').value.trim();

    if (!title) {
        showNotification('❌ Введите название озвучки', 'error');
        return;
    }

    if (!audioUrl) {
        showNotification('❌ Укажите ссылку на аудиофайл', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/characters/${currentCharacterId}/voice-record`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ title, description, audioUrl })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Озвучка добавлена', 'success');
            document.getElementById('voiceTitle').value = '';
            document.getElementById('voiceDescription').value = '';
            document.getElementById('voiceAudioUrl').value = '';
            await loadCharacterVoiceRecords(currentCharacterId);
            await loadCharacters(currentSelectedActor);
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Удаление озвучки
async function deleteVoiceRecord(recordId) {
    if (!confirm('Удалить эту озвучку?')) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/voice-records/${recordId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            showNotification('✅ Озвучка удалена', 'success');
            await loadCharacterVoiceRecords(currentCharacterId);
            await loadCharacters(currentSelectedActor);
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('characterModal');
    modal.style.display = 'none';
    currentCharacterId = null;
}

// ========== АДМИНСКИЕ ФУНКЦИИ ДЛЯ ПЕРСОНАЖЕЙ ==========

// Открытие формы создания персонажа
function openCreateCharacterModal() {
    // Загружаем список актёров для выбора
    fetch('/api/voice-actors')
        .then(res => res.json())
        .then(actors => {
            const actorOptions = actors.map(actor =>
                `<option value="${escapeHtml(actor.username)}">${escapeHtml(actor.username)}</option>`
            ).join('');

            const modalHtml = `
                <div id="createCharacterModal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-plus"></i> Создать персонажа</h3>
                            <button class="modal-close-btn" onclick="closeCreateCharacterModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="modal-form">
                                <input type="text" id="newCharacterName" placeholder="Имя персонажа *" class="form-input">
                                <textarea id="newCharacterDescription" placeholder="Описание персонажа" class="form-textarea"></textarea>

                                <!-- Вместо ссылки - загрузка изображения -->
                                <div class="avatar-upload-area">
                                    <label for="characterImageFile" class="avatar-upload-label">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <span>Загрузить изображение персонажа</span>
                                    </label>
                                    <input type="file" id="characterImageFile" accept="image/*" style="display: none;">
                                    <div id="characterImagePreview" class="character-image-preview" style="display: none;">
                                        <img id="characterPreviewImg" src="" alt="Preview">
                                        <button type="button" class="remove-image-btn" onclick="removeCharacterImage()">✖</button>
                                    </div>
                                    <input type="hidden" id="newCharacterImage" value="">
                                    <p style="font-size: 0.7rem; color: #7c8bd6; margin-top: 5px;">Максимальный размер: 2 МБ</p>
                                </div>

                                <select id="newCharacterActor">
                                    <option value="">-- Выбрать актёра (необязательно) --</option>
                                    ${actorOptions}
                                </select>
                                <div class="modal-buttons">
                                    <button class="btn-primary" onclick="createCharacter()">Создать</button>
                                    <button class="btn-secondary" onclick="closeCreateCharacterModal()">Отмена</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const oldModal = document.getElementById('createCharacterModal');
            if (oldModal) oldModal.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Добавляем обработчик загрузки изображения
            const imageInput = document.getElementById('characterImageFile');
            if (imageInput) {
                imageInput.addEventListener('change', handleCharacterImageUpload);
            }
        })
        .catch(error => console.error('Ошибка загрузки актёров:', error));
}

// Удалить выбранное изображение
function removeCharacterImage() {
    document.getElementById('characterImagePreview').style.display = 'none';
    document.getElementById('newCharacterImage').value = '';
    document.getElementById('characterImageFile').value = '';
}

// Обработчик загрузки изображения персонажа
async function handleCharacterImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера (2 МБ)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('❌ Файл太大了! Максимальный размер 2 МБ', 'error');
        return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
        showNotification('❌ Пожалуйста, выберите изображение', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/upload/character-image', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('newCharacterImage').value = data.imageUrl;

            // Показываем превью
            const preview = document.getElementById('characterImagePreview');
            const previewImg = document.getElementById('characterPreviewImg');
            previewImg.src = data.imageUrl;
            preview.style.display = 'block';

            showNotification('✅ Изображение загружено', 'success');
        } else {
            const error = await response.json();
            showNotification(`❌ ${error.error || 'Ошибка загрузки'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

function closeCreateCharacterModal() {
    const modal = document.getElementById('createCharacterModal');
    if (modal) modal.remove();
}

async function createCharacter() {
    const name = document.getElementById('newCharacterName')?.value.trim();
    const description = document.getElementById('newCharacterDescription')?.value.trim();
    const imageUrl = document.getElementById('newCharacterImage')?.value.trim();
    const assignedTo = document.getElementById('newCharacterActor')?.value;

    if (!name) {
        showNotification('❌ Введите имя персонажа', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/admin/characters', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ name, description, assignedTo, imageUrl })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Персонаж создан', 'success');
            closeCreateCharacterModal();
            await loadCharacters(currentSelectedActor);
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Открытие формы выдачи персонажа
async function openAssignCharacterModal() {
    // Загружаем список невыданных персонажей и актёров
    const [charactersRes, actorsRes] = await Promise.all([
        fetch('/api/characters'),
        fetch('/api/voice-actors')
    ]);

    const characters = await charactersRes.json();
    const actors = await actorsRes.json();

    const unassignedCharacters = characters.filter(c => !c.assignedTo);

    if (unassignedCharacters.length === 0) {
        showNotification('❌ Нет свободных персонажей', 'error');
        return;
    }

    const modalHtml = `
        <div id="assignCharacterModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-plus"></i> Выдать персонажа актёру</h3>
                    <span class="modal-close" onclick="closeAssignCharacterModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="modal-form">
                        <select id="assignCharacterSelect">
                            <option value="">-- Выберите персонажа --</option>
                            ${unassignedCharacters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <select id="assignActorSelect">
                            <option value="">-- Выберите актёра --</option>
                            ${actors.map(a => `<option value="${escapeHtml(a.username)}">${escapeHtml(a.username)}</option>`).join('')}
                        </select>
                        <div class="modal-buttons">
                            <button class="btn-primary" onclick="assignCharacter()">Выдать</button>
                            <button class="btn-secondary" onclick="closeAssignCharacterModal()">Отмена</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('assignCharacterModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeAssignCharacterModal() {
    const modal = document.getElementById('assignCharacterModal');
    if (modal) modal.remove();
}

async function assignCharacter() {
    const characterId = document.getElementById('assignCharacterSelect')?.value;
    const assignedTo = document.getElementById('assignActorSelect')?.value;

    if (!characterId || !assignedTo) {
        showNotification('❌ Выберите персонажа и актёра', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/characters/${characterId}/assign`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ assignedTo })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Персонаж выдан', 'success');
            closeAssignCharacterModal();
            await loadCharacters(currentSelectedActor);
            await loadVoiceActors();
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== АДМИНСКИЕ ФУНКЦИИ ДЛЯ ПЕРСОНАЖЕЙ ==========

// Открытие формы смены актёра
async function openReassignModal() {
    if (!currentCharacterId) return;

    // Загружаем список актёров
    const response = await fetch('/api/voice-actors');
    const actors = await response.json();

    const select = document.getElementById('reassignActorSelect');
    select.innerHTML = '<option value="">-- Выберите актёра --</option>' +
        actors.map(a => `<option value="${escapeHtml(a.username)}">${escapeHtml(a.username)}</option>`).join('');

    document.getElementById('reassignCharacterModal').style.display = 'flex';
}

function closeReassignModal() {
    document.getElementById('reassignCharacterModal').style.display = 'none';
}

async function confirmReassign() {
    const assignedTo = document.getElementById('reassignActorSelect').value;
    if (!assignedTo) {
        showNotification('❌ Выберите актёра', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/characters/${currentCharacterId}/reassign`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ assignedTo })
        });

        if (response.ok) {
            showNotification('✅ Актёр персонажа изменён', 'success');
            closeReassignModal();
            await loadCharacters(currentSelectedActor);
            await loadVoiceActors();
            // Обновляем текущее модальное окно
            await openCharacterModal(currentCharacterId);
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Удаление персонажа
async function deleteCharacter() {
    if (!confirm('Удалить этого персонажа? Все озвучки также будут удалены!')) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/characters/${currentCharacterId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            showNotification('✅ Персонаж удалён', 'success');
            closeModal();
            await loadCharacters(currentSelectedActor);
            await loadVoiceActors();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Обновлённая openCharacterModal с админскими кнопками
async function openCharacterModal(characterId) {
    currentCharacterId = characterId;
    const modal = document.getElementById('characterModal');
    const characterNameSpan = document.getElementById('modalCharacterName');
    const characterDescSpan = document.getElementById('modalCharacterDescription');
    const characterActorSpan = document.getElementById('modalCharacterActor');
    const voiceRecordsContainer = document.getElementById('modalVoiceRecords');
    const addVoiceForm = document.getElementById('addVoiceRecordForm');
    const adminActions = document.getElementById('adminCharacterActions');

    modal.style.display = 'flex';

    try {
        const response = await fetch('/api/characters');
        if (response.ok) {
            const characters = await response.json();
            const character = characters.find(c => c.id === characterId);
            if (character) {
                characterNameSpan.textContent = character.name;
                characterDescSpan.textContent = character.description || 'Нет описания';
                characterActorSpan.textContent = character.assignedTo || 'Не назначен';

                const isAssignedToMe = character.assignedTo === window.userData.username;
                const isAdmin = window.userData.isAdmin;

                addVoiceForm.style.display = (isAssignedToMe || isAdmin) ? 'block' : 'none';
                adminActions.style.display = isAdmin ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки персонажа:', error);
    }

    await loadCharacterVoiceRecords(characterId);
}

// Обновлённая инициализация загрузки аудио с красивой кнопкой
function initAudioUpload() {
    const audioFile = document.getElementById('voiceAudioFile');
    const audioFileName = document.getElementById('audioFileName');

    if (audioFile) {
        audioFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && currentCharacterId) {
                const uploadLabel = document.querySelector('.audio-upload-label');
                const originalText = uploadLabel.innerHTML;
                uploadLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
                uploadLabel.style.opacity = '0.7';

                const audioUrl = await uploadAudioFile(file, currentCharacterId);

                if (audioUrl) {
                    document.getElementById('voiceAudioUrl').value = audioUrl;
                    audioFileName.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(file.name)}`;
                    audioFileName.style.display = 'block';
                    showNotification('✅ Аудиофайл загружен', 'success');
                }

                uploadLabel.innerHTML = originalText;
                uploadLabel.style.opacity = '1';
                audioFile.value = '';
            }
        });
    }
}

// Добавляем обработчики для админских кнопок в DOMContentLoaded
document.getElementById('unassignCharacterBtn')?.addEventListener('click', () => {
    if (currentCharacterId) {
        const characterName = document.getElementById('modalCharacterName')?.textContent;
        unassignCharacter(currentCharacterId, characterName);
    }
});

document.getElementById('reassignCharacterBtn')?.addEventListener('click', openReassignModal);
document.getElementById('deleteCharacterBtn')?.addEventListener('click', deleteCharacter);

// ========== СЦЕНАРИИ ==========
let currentSelectedScreenwriter = null;

// Загрузка сценаристов
async function loadScreenwriters() {
    const container = document.getElementById('screenwritersList');
    if (!container) return;

    try {
        const response = await fetch('/api/screenwriters');
        if (response.ok) {
            const writers = await response.json();
            if (writers.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет сценаристов</div>';
                return;
            }

            container.innerHTML = writers.map(writer => `
                <div class="screenwriter-card" data-writer="${writer.username}" onclick="selectScreenwriter('${escapeHtml(writer.username)}')">
                    <div class="screenwriter-avatar">
                        ${writer.avatar ? `<img src="${writer.avatar}?t=${Date.now()}" alt="Avatar">` : `<i class="fas fa-feather-alt"></i>`}
                    </div>
                    <div class="screenwriter-info">
                        <div class="screenwriter-name">${escapeHtml(writer.username)}</div>
                        <div class="screenwriter-stats">
                            <i class="fas fa-scroll"></i> ${writer.activeScriptsCount || 0} активных сценариев
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки сценаристов:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки</div>';
    }
}

function selectScreenwriter(username) {
    currentSelectedScreenwriter = username;

    document.querySelectorAll('.screenwriter-card').forEach(card => {
        if (card.getAttribute('data-writer') === username) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    loadScripts(username);
}

function openScript(url) {
    window.open(url, '_blank');
}

// Открытие модального окна создания сценария
async function openCreateScriptModal() {
    const response = await fetch('/api/screenwriters');
    const writers = await response.json();

    const container = document.getElementById('scriptAssigneeCheckboxes');
    container.innerHTML = writers.map(writer => `
        <div class="checkbox-item" onclick="toggleCheckbox(this, '${escapeHtml(writer.username)}')">
            <input type="checkbox" id="writer_${escapeHtml(writer.username)}" value="${escapeHtml(writer.username)}">
            <label for="writer_${escapeHtml(writer.username)}">${escapeHtml(writer.username)}</label>
            <span class="checkbox-badge">${writer.activeScriptsCount || 0} сценариев</span>
        </div>
    `).join('');

    document.getElementById('scriptModalTitle').innerHTML = '<i class="fas fa-plus"></i> Добавить сценарий';
    document.getElementById('scriptTitle').value = '';
    document.getElementById('scriptDescription').value = '';
    document.getElementById('scriptGoogleDocUrl').value = '';
    document.getElementById('scriptModal').style.display = 'flex';
}

function toggleCheckbox(div, username) {
    const checkbox = div.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

// Получение выбранных сценаристов
function getSelectedScreenwriters() {
    const checkboxes = document.querySelectorAll('#scriptAssigneeCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function closeScriptModal() {
    const modal = document.getElementById('scriptModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveScript() {
    const title = document.getElementById('scriptTitle').value.trim();
    const description = document.getElementById('scriptDescription').value.trim();
    const googleDocUrl = document.getElementById('scriptGoogleDocUrl').value.trim();
    const assignees = getSelectedScreenwriters();

    if (!title) {
        showNotification('❌ Введите название сценария', 'error');
        return;
    }
    if (!googleDocUrl) {
        showNotification('❌ Укажите ссылку на Google документ', 'error');
        return;
    }
    if (assignees.length === 0) {
        showNotification('❌ Выберите хотя бы одного сценариста', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/admin/scripts', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ title, description, googleDocUrl, assignees })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Сценарий создан', 'success');
            closeScriptModal();
            await loadScripts(currentSelectedScreenwriter);
            await loadScreenwriters();
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Обновлённая загрузка сценариев с отображением нескольких авторов
async function loadScripts(filterWriter = null) {
    const container = document.getElementById('scriptsList');
    if (!container) return;

    try {
        const response = await fetch('/api/scripts');
        if (response.ok) {
            let scripts = await response.json();
            const currentUser = window.userData.username;
            const isAdmin = window.userData.isAdmin;

            // Фильтруем сценарии: админ видит все, сценарист только свои
            if (!isAdmin) {
                scripts = scripts.filter(s => s.assignees?.includes(currentUser));
            }

            if (filterWriter && !isAdmin) {
                scripts = scripts.filter(s => s.assignees?.includes(filterWriter));
            }

            if (scripts.length === 0) {
                container.innerHTML = '<div class="empty-state">Нет сценариев</div>';
                return;
            }

            container.innerHTML = scripts.map(script => `
                <div class="script-card">
                    <div class="script-title">
                        <span>📄 ${escapeHtml(script.title)}</span>
                        <div class="script-actions">
                            <button class="open-script-btn" onclick="window.open('${escapeHtml(script.googleDocUrl)}', '_blank')">
                                <i class="fas fa-external-link-alt"></i> Открыть
                            </button>
                            ${isAdmin ? `
                                <button class="edit-script-btn" onclick="openEditScriptModal(${script.id})" title="Редактировать сценаристов">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="delete-script-btn" onclick="deleteScript(${script.id})" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="script-description">${escapeHtml(script.description?.substring(0, 100) || '')}</div>
                    <div class="script-meta">
                        <span><i class="fas fa-users"></i> ${script.assignees?.join(', ') || 'Не назначен'}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(script.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки сценариев:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки</div>';
    }
}

// Удаление сценария
async function deleteScript(scriptId) {
    if (!confirm('Удалить этот сценарий? Это действие необратимо!')) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/scripts/${scriptId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            showNotification('✅ Сценарий удалён', 'success');
            await loadScripts(currentSelectedScreenwriter);
            await loadScreenwriters();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Открытие модального окна редактирования сценаристов
async function openEditScriptModal(scriptId) {
    // Загружаем информацию о сценарии
    const scriptResponse = await fetch(`/api/admin/scripts/${scriptId}`);
    const script = await scriptResponse.json();

    // Загружаем всех сценаристов
    const writersResponse = await fetch('/api/screenwriters');
    const writers = await writersResponse.json();

    const container = document.getElementById('editScriptAssigneeCheckboxes');
    const currentAssignees = script.assignees || [];

    container.innerHTML = writers.map(writer => `
        <div class="checkbox-item" onclick="toggleEditCheckbox(this, '${escapeHtml(writer.username)}')">
            <input type="checkbox" id="edit_writer_${escapeHtml(writer.username)}"
                   value="${escapeHtml(writer.username)}"
                   ${currentAssignees.includes(writer.username) ? 'checked' : ''}>
            <label for="edit_writer_${escapeHtml(writer.username)}">${escapeHtml(writer.username)}</label>
            <span class="checkbox-badge">${writer.activeScriptsCount || 0} сценариев</span>
        </div>
    `).join('');

    document.getElementById('editScriptId').value = scriptId;
    document.getElementById('editScriptModalTitle').innerHTML = `<i class="fas fa-edit"></i> Редактировать сценарий: ${escapeHtml(script.title)}`;
    document.getElementById('editScriptModal').style.display = 'flex';
}

function toggleEditCheckbox(div, username) {
    const checkbox = div.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

function closeEditScriptModal() {
    const modal = document.getElementById('editScriptModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function getSelectedEditScreenwriters() {
    const checkboxes = document.querySelectorAll('#editScriptAssigneeCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function saveScriptAssignees() {
    const scriptId = document.getElementById('editScriptId').value;
    const assignees = getSelectedEditScreenwriters();

    if (assignees.length === 0) {
        showNotification('❌ Выберите хотя бы одного сценариста', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/scripts/${scriptId}/assignees`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ assignees })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Сценаристы обновлены', 'success');
            closeEditScriptModal();
            await loadScripts(currentSelectedScreenwriter);
            await loadScreenwriters();
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== ИДЕИ ==========
let currentIdeaType = 'BUILD';

async function loadIdeas(page = 0) {
    const container = document.getElementById('ideasContainer');
    if (!container) return;

    try {
        const response = await fetch(`/api/ideas?page=${page}&size=20`);
        if (!response.ok) {
            console.error('Ошибка загрузки идей, статус:', response.status);
            container.innerHTML = '<div class="error-message">❌ Ошибка загрузки идей</div>';
            return;
        }

        const data = await response.json();
        let ideas = data.content || [];
        const totalPages = data.totalPages;
        const currentPage = data.currentPage;

        console.log('Загружено идей:', ideas.length, 'Страница:', currentPage + 1, 'из', totalPages);

        const isAdmin = window.userData.isAdmin;

        // Фильтруем по типу
        if (currentIdeaType === 'PENDING') {
            ideas = ideas.filter(i => i.status === 'PENDING');
        } else {
            ideas = ideas.filter(i => i.type === currentIdeaType && i.status === 'APPROVED');
        }

        // Обновляем бейдж с количеством pending идей
        if (isAdmin) {
            try {
                const allIdeasResponse = await fetch('/api/ideas?size=1000');
                if (allIdeasResponse.ok) {
                    const allIdeasData = await allIdeasResponse.json();
                    // Убедимся, что content существует и это массив
                    const allIdeas = allIdeasData.content || [];
                    const pendingCount = allIdeas.filter(i => i.status === 'PENDING').length;
                    const pendingBadge = document.getElementById('pendingBadge');
                    if (pendingBadge) {
                        pendingBadge.textContent = pendingCount;
                        pendingBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
                    }
                }
            } catch (e) {
                console.warn('Ошибка загрузки pending бейджа:', e);
            }
        }

        if (!ideas || ideas.length === 0) {
            container.innerHTML = '<div class="empty-state">✨ Нет идей в этой категории</div>';
            return;
        }

        container.innerHTML = ideas.map(idea => {
            const typeIcon = idea.type === 'BUILD' ? '<i class="fas fa-hard-hat"></i>' : '<i class="fas fa-globe"></i>';
            const typeText = idea.type === 'BUILD' ? 'Идея для постройки' : 'Идея для улучшения сайта';
            const typeClass = idea.type === 'BUILD' ? 'type-build' : 'type-site';

            return `
            <div class="idea-card ${idea.status.toLowerCase()}">
                <div class="idea-type-plate ${typeClass}" title="${typeText}">
                    ${typeIcon} ${typeText}
                </div>
                <div class="idea-title idea-title-ellipsis" title="${escapeHtml(idea.title)}">${escapeHtml(idea.title)}</div>
                <div class="idea-description idea-description-ellipsis" title="${escapeHtml(idea.description)}">${escapeHtml(idea.description)}</div>
                <div class="idea-meta">
                    <span class="idea-author"><i class="fas fa-user"></i> ${escapeHtml(idea.author)}</span>
                    <span class="idea-date"><i class="fas fa-calendar"></i> ${new Date(idea.createdAt).toLocaleDateString('ru-RU')}</span>
                    <span class="idea-likes ${idea.liked ? 'liked' : ''}" onclick="likeIdea(${idea.id}, this)" title="${idea.liked ? 'Убрать лайк' : 'Поставить лайк'}">
                        <i class="fas fa-heart"></i>
                        <span class="likes-count">${idea.likes || 0}</span>
                    </span>
                    ${idea.status !== 'APPROVED' ? `<span class="idea-status ${idea.status.toLowerCase()}">${idea.status === 'PENDING' ? 'На модерации' : 'Отклонено'}</span>` : ''}
                </div>
                ${isAdmin && idea.status === 'PENDING' ? `
                    <div class="idea-actions">
                        <button class="approve-idea-btn" onclick="approveIdea(${idea.id})" title="Одобрить">✅</button>
                        <button class="reject-idea-btn" onclick="rejectIdea(${idea.id})" title="Отклонить">❌</button>
                        <button class="delete-idea-btn" onclick="deleteIdea(${idea.id})" title="Удалить">🗑️</button>
                    </div>
                ` : (isAdmin ? `
                    <div class="idea-actions">
                        <button class="delete-idea-btn" onclick="deleteIdea(${idea.id})" title="Удалить">🗑️</button>
                    </div>
                ` : '')}
            </div>
            `;
        }).join('');

        // Удаляем старую пагинацию
        const existingPagination = document.querySelector('.pagination');
        if (existingPagination) existingPagination.remove();

        // Добавляем пагинацию
        if (totalPages > 1) {
            const paginationHtml = `
                <div class="pagination" style="display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem;">
                    <button ${currentPage === 0 ? 'disabled' : ''} onclick="loadIdeas(${currentPage - 1})" style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: #1a1f35; border: 1px solid #2a2f48; color: white; cursor: pointer;">← Назад</button>
                    <span style="padding: 0.5rem 1rem;">Страница ${currentPage + 1} из ${totalPages}</span>
                    <button ${currentPage + 1 >= totalPages ? 'disabled' : ''} onclick="loadIdeas(${currentPage + 1})" style="padding: 0.5rem 1rem; border-radius: 0.5rem; background: #1a1f35; border: 1px solid #2a2f48; color: white; cursor: pointer;">Вперед →</button>
                </div>
            `;
            container.insertAdjacentHTML('afterend', paginationHtml);
        }

    } catch (error) {
        console.error('Ошибка загрузки идей:', error);
        container.innerHTML = '<div class="error-message">❌ Ошибка загрузки идей</div>';
    }
}

function switchIdeaType(type) {
    currentIdeaType = type;

    document.querySelectorAll('.idea-tab').forEach(tab => {
        const tabType = tab.getAttribute('data-idea-type');
        if (tabType === type) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    loadIdeas(0);  // ← сбрасывай на первую страницу при смене типа
}

// Лайк идеи (toggle)
async function likeIdea(ideaId, element) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/ideas/${ideaId}/like`, {
            method: 'POST',
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();

            // Обновляем счётчик лайков
            const likesSpan = element.querySelector('.likes-count');
            if (likesSpan) likesSpan.textContent = data.likes;

            // Обновляем сердечко
            const heartIcon = element.querySelector('i');
            if (data.liked) {
                element.classList.add('liked');
                if (heartIcon) heartIcon.style.color = '#ef4444';
            } else {
                element.classList.remove('liked');
                if (heartIcon) heartIcon.style.color = '';
            }

            // Анимация
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        } else {
            const error = await response.json();
            showNotification(`❌ ${error.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Открытие модального окна создания идеи
let currentIdeaTypeForModal = 'BUILD';

function openCreateIdeaModal(type) {
    currentIdeaTypeForModal = type;
    const modal = document.getElementById('createIdeaModal');
    const title = document.getElementById('createIdeaModalTitle');

    if (type === 'BUILD') {
        title.innerHTML = '<i class="fas fa-hard-hat"></i> Добавить идею для постройки';
    } else {
        title.innerHTML = '<i class="fas fa-globe"></i> Добавить идею для улучшения сайта';
    }

    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaDescription').value = '';
    modal.style.display = 'flex';
}

function closeCreateIdeaModal() {
    const modal = document.getElementById('createIdeaModal');
    modal.style.display = 'none';
}

async function createIdea() {
    const title = document.getElementById('ideaTitle').value.trim();
    const description = document.getElementById('ideaDescription').value.trim();

    if (!title) {
        showNotification('❌ Введите название идеи', 'error');
        return;
    }
    if (!description) {
        showNotification('❌ Введите описание идеи', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/ideas', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ title, description, type: currentIdeaTypeForModal })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Идея отправлена на модерацию!', 'success');
            closeCreateIdeaModal();
            await loadIdeas();
            await loadStats();
        } else {
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// Админские функции для идей
async function approveIdea(ideaId) {
    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/ideas/${ideaId}/approve`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('✅ Идея одобрена', 'success');
            await loadIdeas();
            await loadStats();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function rejectIdea(ideaId) {
    if (!confirm('Отклонить эту идею?')) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/ideas/${ideaId}/reject`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('❌ Идея отклонена', 'success');
            await loadIdeas();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

async function deleteIdea(ideaId) {
    if (!confirm('Удалить эту идею? Это действие необратимо!')) return;

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/admin/ideas/${ideaId}`, { method: 'DELETE', headers });
        if (response.ok) {
            showNotification('🗑️ Идея удалена', 'success');
            await loadIdeas();
            await loadStats();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initAudioUpload();
    initRegistrationForm();
    await getCurrentUserId();
    startHeartbeat();
    await checkAdminRights();
    await loadHeaderAvatar();
    handleHashOnLoad();
    window.addEventListener('beforeunload', () => stopHeartbeat());
    document.querySelector('.add-task-btn')?.addEventListener('click', () => window.location.href = '/give_tusk_form');
    document.querySelector('.upload-audio-btn')?.addEventListener('click', () => alert('🎙️ Загрузка аудио будет доступна позже'));
    document.getElementById('refreshRequestsBtn')?.addEventListener('click', () => loadRegistrationRequests());
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadUsersManagement());
    setInterval(async () => {
        if (document.querySelector('#dashboard-tab.active')) await loadTeamMembers();
        await checkAdminRights();
    }, 30000);

    // Загрузка актёров и персонажей
    await loadVoiceActors();
    await loadCharacters();

    // Обработчики для админских кнопок
    document.getElementById('addCharacterBtn')?.addEventListener('click', openCreateCharacterModal);
    document.getElementById('assignCharacterBtn')?.addEventListener('click', openAssignCharacterModal);
    document.getElementById('addScriptBtn')?.addEventListener('click', openCreateScriptModal);

    // Закрытие модального окна при клике на крестик или вне окна
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('characterModal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // Обработчик кнопки сохранения озвучки
    document.getElementById('saveVoiceRecordBtn')?.addEventListener('click', saveVoiceRecord);
});