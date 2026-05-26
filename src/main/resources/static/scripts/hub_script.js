// ========== CSRF ТОКЕН ==========
function getCsrfToken() {
    const token = document.querySelector('meta[name="_csrf"]');
    const header = document.querySelector('meta[name="_csrf_header"]');
    if (token && header) {
        return { header: header.content, token: token.content };
    }
    return null;
}

// ========== ТАБ-НАВИГАЦИЯ (упрощённая) ==========
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

    // Загружаем данные только если мы на странице хаба
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

// ========== ОБРАБОТКА ЯКОРЕЙ ПРИ ЗАГРУЗКЕ ==========
function handleHashOnLoad() {
    const hash = window.location.hash;
    if (hash) {
        const tabId = hash.substring(1);
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (tabButton) {
            setTimeout(() => {
                tabButton.click();
            }, 100);
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

// ========== ЗАДАЧИ ==========
async function loadTasks() {
    const container = document.querySelector('#builders-tab .tasks-board');
    if (!container) return;

    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            const tasks = await response.json();
            container.innerHTML = `
                <div class="task-column">
                    <div class="column-title">В работе (${tasks.inProgress?.length || 0})</div>
                    ${tasks.inProgress?.map(task => `
                        <div class="task-card">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            <div class="task-assignee">👤 ${escapeHtml(task.assignee)}</div>
                            <button class="complete-task" data-id="${task.id}">✅ Завершить</button>
                        </div>
                    `).join('') || '<div class="empty-task">Нет активных задач</div>'}
                </div>
                <div class="task-column">
                    <div class="column-title">✅ Выполнено (${tasks.completed?.length || 0})</div>
                    ${tasks.completed?.map(task => `
                        <div class="task-card completed">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            <div class="task-assignee">👤 ${escapeHtml(task.assignee)}</div>
                            <div class="completion-date">📅 ${task.completedAt || 'Недавно'}</div>
                        </div>
                    `).join('') || '<div class="empty-task">Нет выполненных задач</div>'}
                </div>
            `;
            document.querySelectorAll('.complete-task').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const taskId = btn.getAttribute('data-id');
                    await completeTask(taskId);
                });
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки задач</div>';
    }
}

async function completeTask(taskId) {
    try {
        const csrf = getCsrfToken();
        const headers = { 'Content-Type': 'application/json' };
        if (csrf) headers[csrf.header] = csrf.token;

        const response = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST', headers });
        if (response.ok) {
            showNotification('✅ Таск отмечен как выполненный!');
            await loadTasks();
        } else {
            showNotification('❌ Ошибка при завершении задачи', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
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
                    <ul>
                        <li>Список актёров появится позже</li>
                    </ul>
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
    try {
        const csrf = getCsrfToken();
        const headers = { 'Content-Type': 'application/json' };
        if (csrf) headers[csrf.header] = csrf.token;

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
                    <thead>
                        <tr><th>Название</th><th>Тип</th><th>Автор/актёр</th><th>Прослушать</th></tr>
                    </thead>
                    <tbody>
                        ${Array.isArray(audio) && audio.length ? audio.map(a => `
                            <tr>
                                <td>${escapeHtml(a.name)}</td>
                                <td>${escapeHtml(a.type || 'Аудио')}</td>
                                <td>${escapeHtml(a.author || 'Неизвестен')}</td>
                                <td><audio controls src="${a.url}"></audio></td>
                            </tr>
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

// ========== CSS ДЛЯ УВЕДОМЛЕНИЙ ==========
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .empty-task, .empty-state {
        text-align: center; padding: 40px; color: #888;
        background: rgba(255,255,255,0.05); border-radius: 10px;
    }
    .task-card {
        background: rgba(255,255,255,0.1); padding: 15px;
        border-radius: 10px; margin-bottom: 10px;
    }
    .task-card.completed { opacity: 0.7; background: rgba(34,197,94,0.1); }
    .complete-task {
        margin-top: 10px; padding: 5px 10px;
        background: #22c55e; border: none; border-radius: 5px; cursor: pointer;
    }
    .audio-item {
        background: rgba(255,255,255,0.1); padding: 15px;
        border-radius: 10px; margin-bottom: 10px;
    }
    .audio-info { margin-bottom: 10px; }
    audio { width: 100%; }
    .like-btn { cursor: pointer; transition: transform 0.2s; }
    .like-btn:hover { transform: scale(1.1); }
    .message-container.loading { color: #667eea; text-align: center; padding: 10px; }
`;
document.head.appendChild(notificationStyle);

// ========== ЗАГРУЗКА УЧАСТНИКОВ ПО РОЛЯМ ==========
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

            const groupedUsers = {
                'ADMIN': [], 'BUILDER': [], 'SCREENWRITER': [], 'VOICE_ACTOR': [], 'ANIMATOR': [], 'USER': []
            };

            const roleIcons = {
                'ADMIN': '<i class="fas fa-crown"></i>',
                'BUILDER': '<i class="fas fa-hard-hat"></i>',
                'SCREENWRITER': '<i class="fas fa-feather-alt"></i>',
                'VOICE_ACTOR': '<i class="fas fa-microphone-alt"></i>',
                'ANIMATOR': '<i class="fas fa-film"></i>',
                'USER': '<i class="fas fa-user"></i>'
            };

            const roleColors = {
                'ADMIN': 'admin', 'BUILDER': 'builder', 'SCREENWRITER': 'screenwriter',
                'VOICE_ACTOR': 'voice-actor', 'ANIMATOR': 'animator', 'USER': 'user'
            };

            const roleNames = {
                'ADMIN': '👑 Администраторы', 'BUILDER': '🏗️ Строители',
                'SCREENWRITER': '✍️ Сценаристы', 'VOICE_ACTOR': '🎙️ Актёры озвучки',
                'ANIMATOR': '🎬 Аниматоры', 'USER': '👤 Участники'
            };

            users.forEach(user => {
                if (user.roles && user.roles.length > 0) {
                    if (user.roles.includes('ADMIN')) {
                        if (!groupedUsers['ADMIN'].some(u => u.id === user.id)) groupedUsers['ADMIN'].push(user);
                    } else {
                        user.roles.forEach(role => {
                            if (groupedUsers[role] && role !== 'ADMIN' && !groupedUsers[role].some(u => u.id === user.id)) {
                                groupedUsers[role].push(user);
                            }
                        });
                        if (!user.roles.some(r => r !== 'ADMIN' && r !== 'USER') && !groupedUsers['USER'].some(u => u.id === user.id)) {
                            groupedUsers['USER'].push(user);
                        }
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
                html += `
                    <div class="role-category">
                        <div class="role-header">
                            <span class="role-icon ${roleColors[role]}">${roleIcons[role]}</span>
                            <h3>${roleNames[role]} <span class="role-count">${members.length}</span></h3>
                        </div>
                        <div class="members-list">
                `;
                members.forEach(member => {
                    const isCurrentUser = member.username === currentUser;
                    const isOnline = member.isOnline;
                    html += `
                        <div class="member-card" data-user-id="${member.id}">
                            <div class="member-avatar">
                                <i class="fas ${getUserIcon(member.roles)}"></i>
                            </div>
                            <div class="member-name">
                                ${escapeHtml(member.username)}
                                ${isCurrentUser ? '<span class="current-user-badge">(Вы)</span>' : ''}
                            </div>
                            <div class="member-status ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Онлайн' : 'Оффлайн'}"></div>
                    `;
                    if (isAdmin && !isCurrentUser) {
                        html += `
                            <div class="member-actions">
                                <button class="delete-user-btn" onclick="deleteUser(${member.id}, '${escapeHtml(member.username)}')" title="Удалить пользователя">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
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
    if (!currentUserId) {
        currentUserId = await getCurrentUserId();
    }
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
                if (userRoleSpan) {
                    userRoleSpan.textContent = isAdmin ? 'Админ' : 'Сотрудник';
                }

                const adminButtons = document.querySelectorAll('.admin-only');
                if (isAdmin) {
                    adminButtons.forEach(btn => btn.style.display = 'inline-flex');
                } else {
                    adminButtons.forEach(btn => btn.style.display = 'none');
                }

                const adminWelcomeDiv = document.getElementById('adminWelcomeMessage');
                if (adminWelcomeDiv) {
                    adminWelcomeDiv.style.display = isAdmin ? 'block' : 'none';
                }

                return isAdmin;
            }
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
    return window.userData.isAdmin;
}

// ========== ЗАГРУЗКА АВАТАРКИ В ХЕДЕР ==========
async function loadHeaderAvatar() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            const user = await response.json();
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                if (user && user.avatar && user.avatar !== "") {
                    // Добавляем timestamp для обхода кэша
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

// ========== СОХРАНЕНИЕ АВАТАРКИ ==========
async function saveAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    const csrf = getCsrfToken();
    const headers = {};
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.ok) {
            const data = await response.json();

            // Обновляем аватарку в профиле с timestamp
            const preview = document.getElementById('avatarPreview');
            if (preview) {
                preview.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar">`;
            }

            // Обновляем аватарку в хедере с timestamp
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                headerAvatar.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            }

            // Принудительно перезагружаем данные пользователя
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

            let html = `<div class="users-table-container"><table class="users-management-table">
                <thead><tr><th>Пользователь</th><th>Текущие роли</th><th>Добавить роль</th><th>Удалить роль</th><th>Действия</th></tr></thead><tbody>`;

            users.forEach(user => {
                const isCurrentUser = user.username === currentUser;
                const currentRoles = user.roles || [];

                html += `<tr>
                    <td><div class="user-cell"><div class="user-avatar-small"><i class="fas ${getUserIcon(currentRoles)}"></i></div><span>${escapeHtml(user.username)}</span>${isCurrentUser ? '<span class="current-user-badge">(Вы)</span>' : ''}</div></td>
                    <td><div class="roles-badges">${currentRoles.map(role => `<span class="role-badge role-${role.toLowerCase()}">${getRoleName(role)}<button class="remove-role-btn" onclick="removeRoleFromUser(${user.id}, '${role}')">✖</button></span>`).join('')}${currentRoles.length === 0 ? '<span class="no-roles">Нет ролей</span>' : ''}</div></td>
                    <td><div class="role-selector"><select class="role-select" id="select-${user.id}"><option value="">-- Выбрать роль --</option><option value="ADMIN">👑 Администратор</option><option value="BUILDER">🏗️ Строитель</option><option value="SCREENWRITER">✍️ Сценарист</option><option value="VOICE_ACTOR">🎙️ Актёр озвучки</option><option value="ANIMATOR">🎬 Аниматор</option></select><button class="add-role-btn" data-user-id="${user.id}"><i class="fas fa-plus"></i></button></div></td>
                    <td><div class="role-selector"><select class="role-select-remove" id="remove-select-${user.id}"><option value="">-- Выбрать роль --</option>${currentRoles.map(role => `<option value="${role}">${getRoleName(role)}</option>`).join('')}</select><button class="remove-role-btn-table" data-user-id="${user.id}"><i class="fas fa-minus"></i></button></div></td>
                    <td>${!isCurrentUser ? `<button class="delete-user-table-btn" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')"><i class="fas fa-trash"></i> Удалить</button>` : '<span class="self-hint">Вы не можете удалить себя</span>'}</td>
                </tr>`;
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
    try {
        const csrf = getCsrfToken();
        const headers = { 'Content-Type': 'application/json' };
        if (csrf) headers[csrf.header] = csrf.token;

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
    try {
        const csrf = getCsrfToken();
        const headers = { 'Content-Type': 'application/json' };
        if (csrf) headers[csrf.header] = csrf.token;

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

function getUserIcon(roles) {
    if (roles.includes('ADMIN')) return 'fa-crown';
    if (roles.includes('BUILDER')) return 'fa-hard-hat';
    if (roles.includes('SCREENWRITER')) return 'fa-feather-alt';
    if (roles.includes('VOICE_ACTOR')) return 'fa-microphone-alt';
    if (roles.includes('ANIMATOR')) return 'fa-film';
    return 'fa-user';
}

// ========== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function deleteUser(userId, username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${username}"? Это действие необратимо!`)) return;

    try {
        const csrf = getCsrfToken();
        const headers = {};
        if (csrf) headers[csrf.header] = csrf.token;

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


// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initRegistrationForm();

    // Запускаем heartbeat
    await getCurrentUserId();
    startHeartbeat();

    // Проверяем права администратора при загрузке
    await checkAdminRights();

    // Загружаем аватарку в хедер
    await loadHeaderAvatar();

    // Обрабатываем якорь для перехода на нужную вкладку
    handleHashOnLoad();

    // Останавливаем heartbeat при закрытии/уходе со страницы
    window.addEventListener('beforeunload', () => {
        stopHeartbeat();
    });

    document.querySelector('.add-task-btn')?.addEventListener('click', () => window.location.href = '/give_tusk_form');
    document.querySelector('.upload-audio-btn')?.addEventListener('click', () => alert('🎙️ Загрузка аудио будет доступна позже'));
    document.querySelector('.new-idea-btn')?.addEventListener('click', () => window.location.href = '/add_idea');
    document.getElementById('refreshRequestsBtn')?.addEventListener('click', () => loadRegistrationRequests());
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadUsersManagement());

    // Обновляем статусы и проверяем права каждые 30 секунд
    setInterval(async () => {
        if (document.querySelector('#dashboard-tab.active')) {
            await loadTeamMembers();
        }
        await checkAdminRights();
    }, 30000);
});