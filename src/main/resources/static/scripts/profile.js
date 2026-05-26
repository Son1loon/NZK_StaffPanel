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

                // Обновляем глобальную переменную
                window.userData.isAdmin = isAdmin;

                // Обновляем текст роли в хедере
                const userRoleSpan = document.getElementById('userRoleSpan');
                if (userRoleSpan) {
                    userRoleSpan.textContent = isAdmin ? 'Админ' : 'Сотрудник';
                }

                // Показываем или скрываем админские кнопки (с классом admin-only)
                const adminButtons = document.querySelectorAll('.admin-only');
                if (isAdmin) {
                    adminButtons.forEach(btn => {
                        btn.style.display = 'inline-flex';
                    });
                } else {
                    adminButtons.forEach(btn => {
                        btn.style.display = 'none';
                    });
                }

                return isAdmin;
            }
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
    return window.userData.isAdmin;
}

// ========== ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ ==========
async function loadProfileData() {
    await loadUserRoles();
    await loadUserTasks();
    await loadUserWorks();
}

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
                    'ANIMATOR': '🎬 Аниматор',
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
        'BUILDER': 'builderWorksContainer',
        'SCREENWRITER': 'screenwriterWorksContainer',
        'VOICE_ACTOR': 'voiceActorWorksContainer',
        'ANIMATOR': 'animatorWorksContainer'
    };

    for (const sectionId of Object.values(sections)) {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    }

    for (const role of roles) {
        if (sections[role]) {
            const section = document.getElementById(sections[role]);
            if (section) section.style.display = 'block';
        }
    }
}

async function loadUserTasks() {
    const container = document.getElementById('userTasksContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/user/tasks');
        if (response.ok) {
            const tasks = await response.json();
            if (tasks.length > 0) {
                container.innerHTML = tasks.map(task => `
                    <div class="task-item">
                        <div class="task-status ${task.status}"></div>
                        <div class="task-info">
                            <div class="task-title">${escapeHtml(task.title)}</div>
                            <div class="task-deadline">⏰ Срок: ${task.deadline || 'Не указан'}</div>
                        </div>
                        <div class="task-priority priority-${task.priority}">${task.priority || 'Средний'}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Нет активных задач</div>';
            }
        } else {
            container.innerHTML = '<div class="empty-state">Нет активных задач</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки задач</div>';
    }
}

async function loadUserWorks() {
    await loadBuilderWorks();
    await loadScreenwriterWorks();
    await loadVoiceActorWorks();
    await loadAnimatorWorks();
}

async function loadBuilderWorks() {
    const container = document.querySelector('#builderWorksContainer .works-grid');
    if (!container) return;

    try {
        const response = await fetch('/api/user/builds');
        if (response.ok) {
            const works = await response.json();
            if (works.length > 0) {
                container.innerHTML = works.map(work => `
                    <div class="work-card">
                        <div class="work-thumbnail"><i class="fas fa-building"></i></div>
                        <div class="work-title">${escapeHtml(work.title)}</div>
                        <div class="work-date">📅 ${work.createdAt || 'Недавно'}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Нет построек</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки построек:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки</div>';
    }
}

async function loadScreenwriterWorks() {
    const container = document.querySelector('#screenwriterWorksContainer .works-grid');
    if (!container) return;

    try {
        const response = await fetch('/api/user/scripts');
        if (response.ok) {
            const works = await response.json();
            if (works.length > 0) {
                container.innerHTML = works.map(work => `
                    <div class="work-card">
                        <div class="work-thumbnail"><i class="fas fa-file-alt"></i></div>
                        <div class="work-title">${escapeHtml(work.title)}</div>
                        <div class="work-date">📅 ${work.createdAt || 'Недавно'}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Нет сценариев</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки сценариев:', error);
    }
}

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

// ========== НАСТРОЙКИ ПРОФИЛЯ ==========
async function saveSettings() {
    const email = document.getElementById('email')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmNewPassword')?.value;

    if (newPassword && newPassword !== confirmPassword) {
        showNotification('❌ Пароли не совпадают', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ email, password: newPassword })
        });

        if (response.ok) {
            showNotification('✅ Настройки сохранены', 'success');
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        } else {
            showNotification('❌ Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

// ========== АВАТАР ==========
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
            preview.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar">`;
            showNotification('✅ Аватар обновлён', 'success');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка загрузки аватара', 'error');
    }
}

// ========== ВКЛАДКИ ПРОФИЛЯ ==========
function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const contents = document.querySelectorAll('.profile-tab-content');

    console.log('Найдено вкладок:', tabs.length);
    console.log('Найдено контентов:', contents.length);

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('Клик по вкладке:', tabId);

            // Убираем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');

            // Убираем активный класс у всего контента
            contents.forEach(content => content.classList.remove('active'));

            // Показываем нужный контент
            const activeContent = document.getElementById(`${tabId}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
                console.log('Показан контент:', `${tabId}-tab`);
            } else {
                console.error('Контент не найден:', `${tabId}-tab`);
            }
        });
    });

    // Для проверки - показываем первую вкладку
    const firstTab = document.querySelector('.profile-tab.active');
    if (firstTab) {
        const tabId = firstTab.getAttribute('data-tab');
        const activeContent = document.getElementById(`${tabId}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }
}

// ========== АВАТАР ОБРАБОТЧИК ==========
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

async function loadUserAvatar() {
    try {
        const response = await fetch('/api/public-users');
        if (response.ok) {
            const users = await response.json();
            const currentUser = window.userData.username;
            const user = users.find(u => u.username === currentUser);
            if (user && user.avatar) {
                const preview = document.getElementById('avatarPreview');
                preview.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
    }
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

            // Обновляем аватарку в профиле
            const preview = document.getElementById('avatarPreview');
            if (preview) {
                preview.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar">`;
            }

            // Обновляем аватарку в хедере
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                headerAvatar.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            }

            // Сохраняем URL в localStorage для сохранения после перезагрузки
            localStorage.setItem('userAvatar', data.avatarUrl);

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

// ========== ЗАГРУЗКА АВАТАРКИ В ПРОФИЛЬ ==========
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

// ========== ОБРАБОТКА ЯКОРЕЙ ПРИ ЗАГРУЗКЕ ==========
function handleHashOnLoad() {
    const hash = window.location.hash;
    if (hash) {
        const tabId = hash.substring(1); // убираем #
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (tabButton) {
            // Ждём немного, пока загрузится страница
            setTimeout(() => {
                tabButton.click();
            }, 100);
        }
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем права администратора
    await checkAdminRights();

    // ЗАГРУЖАЕМ АВАТАРКУ В ХЕДЕР (ВАЖНО!)
    await loadHeaderAvatar();

    // Загружаем аватарку в профиль
    await loadProfileAvatar();

    // Инициализируем профильные вкладки
    initProfileTabs();
    initAvatarUpload();
    await loadProfileData();

    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
});