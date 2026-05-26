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
            await loadAudioFiles();
            break;
        case 'ideas':
            await loadIdeas();
            break;
        case 'audio':
            await loadAudioLibrary();
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
        const response = await fetch('/api/stats');
        if (response.ok) {
            const stats = await response.json();
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues[0]) statValues[0].textContent = stats.activeTasks || 0;
            if (statValues[1]) statValues[1].textContent = stats.buildIdeas || 0;
            if (statValues[2]) statValues[2].textContent = stats.audioFiles || 0;
            if (statValues[3]) statValues[3].textContent = stats.activeUsers || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
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
                            <span><i class="fas fa-tasks"></i> ${builder.activeTasksCount || 0} активных тасков</span>
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

// ========== ИДЕИ ==========
async function loadIdeas() {
    const container = document.querySelector('#ideas-tab .ideas-feed');
    if (!container) return;
    try {
        const response = await fetch('/api/ideas');
        if (response.ok) {
            const ideas = await response.json();
            container.innerHTML = Array.isArray(ideas) && ideas.length ? ideas.map(idea => `
                <div class="idea-card">
                    <h4>💡 ${escapeHtml(idea.title)}</h4>
                    <p>${escapeHtml(idea.description)}</p>
                    <div class="idea-meta">
                        <span>✍️ ${escapeHtml(idea.author)}</span>
                        <span class="like-btn" data-id="${idea.id}">❤️ ${idea.likes || 0} лайков</span>
                    </div>
                </div>
            `).join('') : '<div class="empty-state">Нет идей построек</div>';
            document.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const ideaId = btn.getAttribute('data-id');
                    await likeIdea(ideaId);
                });
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки идей:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки идей</div>';
    }
}

async function likeIdea(ideaId) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;
    try {
        const response = await fetch(`/api/ideas/${ideaId}/like`, { method: 'POST', headers });
        if (response.ok) await loadIdeas();
    } catch (error) {
        console.error('Ошибка:', error);
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
            const groupedUsers = { 'ADMIN': [], 'BUILDER': [], 'SCREENWRITER': [], 'VOICE_ACTOR': [], 'ANIMATOR': [], 'USER': [] };
            const roleIcons = { 'ADMIN': '<i class="fas fa-crown"></i>', 'BUILDER': '<i class="fas fa-hard-hat"></i>', 'SCREENWRITER': '<i class="fas fa-feather-alt"></i>', 'VOICE_ACTOR': '<i class="fas fa-microphone-alt"></i>', 'ANIMATOR': '<i class="fas fa-film"></i>', 'USER': '<i class="fas fa-user"></i>' };
            const roleColors = { 'ADMIN': 'admin', 'BUILDER': 'builder', 'SCREENWRITER': 'screenwriter', 'VOICE_ACTOR': 'voice-actor', 'ANIMATOR': 'animator', 'USER': 'user' };
            const roleNames = { 'ADMIN': '👑 Администраторы', 'BUILDER': '🏗️ Строители', 'SCREENWRITER': '✍️ Сценаристы', 'VOICE_ACTOR': '🎙️ Актёры озвучки', 'ANIMATOR': '🎬 Аниматоры', 'USER': '👤 Участники' };
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
    if (roles.includes('ANIMATOR')) return 'fa-film';
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
                html += `<tr><td><div class="user-cell"><div class="user-avatar-small"><i class="fas ${getUserIcon(currentRoles)}"></i></div><span>${escapeHtml(user.username)}</span>${isCurrentUser ? '<span class="current-user-badge">(Вы)</span>' : ''}</div></td><td><div class="roles-badges">${currentRoles.map(role => `<span class="role-badge role-${role.toLowerCase()}">${getRoleName(role)}<button class="remove-role-btn" onclick="removeRoleFromUser(${user.id}, '${role}')">✖</button></span>`).join('')}${currentRoles.length === 0 ? '<span class="no-roles">Нет ролей</span>' : ''}</div></td><td><div class="role-selector"><select class="role-select" id="select-${user.id}"><option value="">-- Выбрать роль --</option><option value="ADMIN">👑 Администратор</option><option value="BUILDER">🏗️ Строитель</option><option value="SCREENWRITER">✍️ Сценарист</option><option value="VOICE_ACTOR">🎙️ Актёр озвучки</option><option value="ANIMATOR">🎬 Аниматор</option></select><button class="add-role-btn" data-user-id="${user.id}"><i class="fas fa-plus"></i></button></div></td><td><div class="role-selector"><select class="role-select-remove" id="remove-select-${user.id}"><option value="">-- Выбрать роль --</option>${currentRoles.map(role => `<option value="${role}">${getRoleName(role)}</option>`).join('')}</select><button class="remove-role-btn-table" data-user-id="${user.id}"><i class="fas fa-minus"></i></button></div></td><td>${!isCurrentUser ? `<button class="delete-user-table-btn" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')"><i class="fas fa-trash"></i> Удалить</button>` : '<span class="self-hint">Вы не можете удалить себя</span>'}</td></tr>`;
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
    const roles = { 'ADMIN': 'Администратор', 'BUILDER': 'Строитель', 'SCREENWRITER': 'Сценарист', 'VOICE_ACTOR': 'Актёр озвучки', 'ANIMATOR': 'Аниматор', 'USER': 'Участник' };
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initRegistrationForm();
    await getCurrentUserId();
    startHeartbeat();
    await checkAdminRights();
    await loadHeaderAvatar();
    handleHashOnLoad();
    window.addEventListener('beforeunload', () => stopHeartbeat());
    document.querySelector('.add-task-btn')?.addEventListener('click', () => window.location.href = '/give_tusk_form');
    document.querySelector('.upload-audio-btn')?.addEventListener('click', () => alert('🎙️ Загрузка аудио будет доступна позже'));
    document.querySelector('.new-idea-btn')?.addEventListener('click', () => window.location.href = '/add_idea');
    document.getElementById('refreshRequestsBtn')?.addEventListener('click', () => loadRegistrationRequests());
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadUsersManagement());
    setInterval(async () => {
        if (document.querySelector('#dashboard-tab.active')) await loadTeamMembers();
        await checkAdminRights();
    }, 30000);
});