// ========== CSRF ТОКЕН ==========
function getCsrfToken() {
    const token = document.querySelector('meta[name="_csrf"]');
    const header = document.querySelector('meta[name="_csrf_header"]');
    if (token && header) {
        return { header: header.content, token: token.content };
    }
    return null;
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
        z-index: 10000;
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

                const adminNavLinks = document.querySelectorAll('.nav-tab.admin-only');
                adminNavLinks.forEach(link => {
                    if (isAdmin) {
                        link.style.display = 'flex';
                    } else {
                        link.style.display = 'none';
                    }
                });

                return isAdmin;
            }
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
    return window.userData.isAdmin;
}

// ========== ЗАГРУЗКА АВАТАРКИ ==========
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

async function loadProfileAvatar() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            const user = await response.json();
            const preview = document.getElementById('avatarPreview');
            if (preview) {
                if (user && user.avatar && user.avatar !== "") {
                    preview.innerHTML = `<img src="${user.avatar}?t=${Date.now()}" alt="Avatar">`;
                } else {
                    preview.innerHTML = `<i class="fas fa-user-astronaut"></i>`;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аватарки в профиль:', error);
    }
}

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
            const preview = document.getElementById('avatarPreview');
            if (preview) preview.innerHTML = `<img src="${data.avatarUrl}?t=${Date.now()}" alt="Avatar">`;
            await loadHeaderAvatar();
            showNotification('✅ Аватар обновлён', 'success');
        } else {
            const error = await response.json();
            showNotification(`❌ ${error.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка загрузки аватара', 'error');
    }
}

function initAvatarUpload() {
    const changeBtn = document.getElementById('changeAvatarBtn');
    const uploadInput = document.getElementById('avatarUpload');

    if (changeBtn && uploadInput) {
        changeBtn.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                saveAvatar(e.target.files[0]);
            }
        });
    }
}

// ========== ЗАГРУЗКА СЦЕНАРИЕВ ПОЛЬЗОВАТЕЛЯ ==========
async function loadUserScripts() {
    const container = document.getElementById('userScriptsContainer');
    if (!container) {
        console.error('Контейнер userScriptsContainer не найден!');
        return;
    }

    try {
        const response = await fetch('/api/scripts');
        if (response.ok) {
            let scripts = await response.json();
            const currentUser = window.userData.username;
            scripts = scripts.filter(s => s.assignees && s.assignees.includes(currentUser));

            console.log('Загружено сценариев:', scripts.length);

            if (scripts.length === 0) {
                container.innerHTML = '<div class="empty-state">📭 У вас нет активных сценариев</div>';
                return;
            }

            container.innerHTML = scripts.map(script => `
                <div class="work-card script-work-card">
                    <div class="work-thumbnail">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="work-title">📄 ${escapeHtml(script.title)}</div>
                    <div class="work-description">${escapeHtml(script.description?.substring(0, 80) || '')}</div>
                    <div class="work-date">📅 ${new Date(script.createdAt).toLocaleDateString('ru-RU')}</div>
                    <button class="open-script-btn" onclick="window.open('${escapeHtml(script.googleDocUrl)}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> Открыть
                    </button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки сценариев:', error);
        container.innerHTML = '<div class="error-message">❌ Ошибка загрузки</div>';
    }
}

// ========== ЗАГРУЗКА ЗАДАЧ ПОЛЬЗОВАТЕЛЯ ==========
async function loadUserTasks() {
    const container = document.getElementById('userTasksContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/user/tasks');
        if (response.ok) {
            const tasks = await response.json();

            const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');
            const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

            const activeTasksHtml = activeTasks.length > 0 ? activeTasks.map(task => `
                <div class="task-item">
                    <div class="task-status in_progress"></div>
                    <div class="task-info">
                        <div class="task-title">📌 ${escapeHtml(task.title)}</div>
                        <div class="task-description">${escapeHtml(task.description?.substring(0, 100) || '')}</div>
                        <div class="task-deadline">⏰ Срок: ${task.deadline || 'Не указан'}</div>
                        <div class="task-priority priority-${task.priority?.toLowerCase()}">${getPriorityName(task.priority)}</div>
                    </div>
                    <button class="complete-task-btn" data-id="${task.id}">✅ Завершить</button>
                </div>
            `).join('') : '<div class="empty-state">✨ Нет активных задач</div>';

            const completedTasksHtml = completedTasks.length > 0 ? completedTasks.map(task => `
                <div class="task-item completed-task">
                    <div class="task-status completed"></div>
                    <div class="task-info">
                        <div class="task-title">✅ ${escapeHtml(task.title)}</div>
                        <div class="task-description">${escapeHtml(task.description?.substring(0, 100) || '')}</div>
                        <div class="task-completed-date">✅ Выполнено: ${task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU') : 'Недавно'}</div>
                    </div>
                    <span class="completed-badge">✅ Выполнено</span>
                </div>
            `).join('') : '<div class="empty-state">📭 Нет выполненных задач</div>';

            container.innerHTML = `
                <div class="tasks-accordion">
                    <div class="accordion-item expanded">
                        <div class="accordion-header" onclick="toggleTasksAccordion(this)">
                            <div class="accordion-title">
                                <i class="fas fa-tasks"></i>
                                <span>📋 В работе</span>
                                <span class="accordion-count">${activeTasks.length}</span>
                            </div>
                            <i class="fas fa-chevron-down accordion-icon rotated"></i>
                        </div>
                        <div class="accordion-body" style="display: block;">
                            ${activeTasksHtml}
                        </div>
                    </div>
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="toggleTasksAccordion(this)">
                            <div class="accordion-title">
                                <i class="fas fa-check-circle"></i>
                                <span>✅ Выполнено</span>
                                <span class="accordion-count">${completedTasks.length}</span>
                            </div>
                            <i class="fas fa-chevron-down accordion-icon"></i>
                        </div>
                        <div class="accordion-body" style="display: none;">
                            ${completedTasksHtml}
                        </div>
                    </div>
                </div>
            `;

            document.querySelectorAll('.complete-task-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const taskId = btn.getAttribute('data-id');
                    await completeUserTask(taskId);
                });
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки задач</div>';
    }
}

function toggleTasksAccordion(header) {
    const accordionItem = header.closest('.accordion-item');
    const body = accordionItem.querySelector('.accordion-body');
    const icon = header.querySelector('.accordion-icon');

    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        accordionItem.classList.add('expanded');
    } else {
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        accordionItem.classList.remove('expanded');
    }
}

function getPriorityName(priority) {
    switch(priority) {
        case 'HIGH': return '🔥 Высокий';
        case 'MEDIUM': return '⭐ Средний';
        case 'LOW': return '❄️ Низкий';
        default: return 'Средний';
    }
}

async function completeUserTask(taskId) {
    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch(`/api/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: headers
        });

        if (response.ok) {
            showNotification('✅ Задача выполнена!', 'success');
            await loadUserTasks();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== ЗАГРУЗКА РОЛЕЙ ==========
async function loadUserRoles() {
    try {
        const response = await fetch('/api/public-users');
        if (response.ok) {
            const users = await response.json();
            const currentUser = window.userData.username;
            const user = users.find(u => u.username === currentUser);
            if (user && user.roles) {
                const rolesList = document.getElementById('userRolesList');
                const roleNames = {
                    'ADMIN': '👑 Администратор',
                    'BUILDER': '🏗️ Строитель',
                    'SCREENWRITER': '✍️ Сценарист',
                    'VOICE_ACTOR': '🎙️ Актёр озвучки',
                    'USER': '👤 Участник'
                };
                const roleHtml = user.roles.map(role =>
                    `<span class="role-tag role-${role.toLowerCase()}">${roleNames[role] || role}</span>`
                ).join('');
                rolesList.innerHTML = roleHtml;
                showRoleSections(user.roles);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки ролей:', error);
    }
}

function showRoleSections(roles) {
    const sections = {
        'SCREENWRITER': 'screenwriterWorksContainer',
        'VOICE_ACTOR': 'voiceActorWorksContainer',
    };

    for (const sectionId of Object.values(sections)) {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    }

    for (const role of roles) {
        if (sections[role]) {
            const section = document.getElementById(sections[role]);
            if (section) {
                section.style.display = 'block';
            }
        }
    }
}

// ========== ЗАГРУЗКА ОСТАЛЬНЫХ РАБОТ ==========
async function loadVoiceActorWorks() {
    const container = document.querySelector('#voiceActorWorksContainer .works-grid');
    if (!container) return;
    try {
        const response = await fetch('/api/user/audios');
        if (response.ok) {
            const works = await response.json();
            if (works.length > 0) {
                container.innerHTML = works.map(work => `
                    <div class="work-card">
                        <div class="work-thumbnail"><i class="fas fa-headphones"></i></div>
                        <div class="work-title">${escapeHtml(work.title)}</div>
                        <div class="work-date">📅 ${work.createdAt || 'Недавно'}</div>
                        <audio controls src="${work.url}"></audio>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Нет аудиозаписей</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аудио:', error);
    }
}

async function loadVoiceActorCharacters() {
    const container = document.querySelector('#voiceActorWorksContainer .works-grid');
    if (!container) return;

    try {
        const response = await fetch('/api/characters');
        if (response.ok) {
            let characters = await response.json();
            characters = characters.filter(c => c.assignedTo === window.userData.username);

            if (characters.length === 0) {
                return;
            }

            const existingContent = container.innerHTML;
            const charactersHtml = characters.map(character => `
                <div class="work-card character-work-card" onclick="openCharacterFromProfile(${character.id})">
                    <div class="work-thumbnail">
                        ${character.imageUrl ? `<img src="${character.imageUrl}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : `<i class="fas fa-mask"></i>`}
                    </div>
                    <div class="work-title">${escapeHtml(character.name)}</div>
                    <div class="work-date">🎙️ ${character.voiceRecordsCount || 0} озвучек</div>
                </div>
            `).join('');

            if (existingContent.includes('Нет аудиозаписей')) {
                container.innerHTML = charactersHtml;
            } else {
                container.innerHTML = existingContent + charactersHtml;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки персонажей:', error);
    }
}

async function loadAnimatorWorks() {
    const container = document.querySelector('#animatorWorksContainer .works-grid');
    if (!container) return;
    try {
        const response = await fetch('/api/user/animations');
        if (response.ok) {
            const works = await response.json();
            if (works.length > 0) {
                container.innerHTML = works.map(work => `
                    <div class="work-card">
                        <div class="work-thumbnail"><i class="fas fa-video"></i></div>
                        <div class="work-title">${escapeHtml(work.title)}</div>
                        <div class="work-date">📅 ${work.createdAt || 'Недавно'}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Нет анимаций</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки анимаций:', error);
    }
}

function openCharacterFromProfile(characterId) {
    window.location.href = `/hub#voice-actors`;
    sessionStorage.setItem('openCharacterId', characterId);
}

// ========== ЗАГРУЗКА ВСЕХ ДАННЫХ ПРОФИЛЯ ==========
async function loadUserWorks() {
    await loadUserScripts();
    // НЕ вызываем loadScreenwriterWorks() - она дублирует loadUserScripts()
    await loadVoiceActorWorks();
    await loadVoiceActorCharacters();
    await loadAnimatorWorks();
}

async function loadProfileData() {
    await loadUserRoles();
    await loadUserTasks();
    await loadUserWorks();
}

// ========== ВКЛАДКИ ПРОФИЛЯ ==========
function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const contents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            contents.forEach(content => content.classList.remove('active'));

            const activeContent = document.getElementById(`${tabId}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });
}

// ========== АДМИНСКИЕ ФУНКЦИИ-ЗАГЛУШКИ ==========
async function loadRegistrationRequests() {
    window.location.href = '/hub#registration-requests';
}

async function loadUsersManagement() {
    window.location.href = '/hub#users-management';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminRights();
    await loadHeaderAvatar();
    await loadProfileAvatar();

    initProfileTabs();
    initAvatarUpload();
    await loadProfileData();

    const openCharacterId = sessionStorage.getItem('openCharacterId');
    if (openCharacterId && window.location.pathname === '/hub') {
        sessionStorage.removeItem('openCharacterId');
        setTimeout(() => {
            if (typeof openCharacterModal === 'function') {
                openCharacterModal(parseInt(openCharacterId));
            }
        }, 500);
    }
});