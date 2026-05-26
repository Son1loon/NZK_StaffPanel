// ========== CSRF ТОКЕН ==========
function getCsrfToken() {
    const token = document.querySelector('meta[name="_csrf"]');
    const header = document.querySelector('meta[name="_csrf_header"]');
    if (token && header) {
        return { header: header.content, token: token.content };
    }
    return null;
}

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

// Загрузка списка строителей
async function loadBuilders() {
    const select = document.getElementById('builderName');
    if (!select) return;

    try {
        const response = await fetch('/api/builders');
        if (response.ok) {
            const builders = await response.json();

            if (builders.length === 0) {
                select.innerHTML = '<option value="" disabled>— Нет строителей —</option>';
                return;
            }

            select.innerHTML = '<option value="" disabled selected>— Выберите строителя —</option>';
            builders.forEach(builder => {
                const option = document.createElement('option');
                option.value = builder.username;
                option.textContent = `${builder.username} (📋 ${builder.activeTasksCount} активных тасков)`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="" disabled>— Ошибка загрузки —</option>';
        }
    } catch (error) {
        console.error('Ошибка загрузки строителей:', error);
        select.innerHTML = '<option value="" disabled>— Ошибка загрузки —</option>';
    }
}

// Отправка формы
async function submitTask(e) {
    e.preventDefault();

    const assignee = document.getElementById('builderName').value;
    const title = document.getElementById('taskName').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('priority').value;
    const deadline = document.getElementById('deadline').value;
    const reference = document.getElementById('reference').value.trim();
    const messageDiv = document.getElementById('formMessage');

    if (!assignee) {
        showNotification('❌ Выберите строителя', 'error');
        return;
    }

    if (!title) {
        showNotification('❌ Введите название задачи', 'error');
        return;
    }

    if (!deadline) {
        showNotification('❌ Укажите срок выполнения', 'error');
        return;
    }

    const csrf = getCsrfToken();
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers[csrf.header] = csrf.token;

    try {
        const response = await fetch('/api/admin/create-task', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                assignee: assignee,
                title: title,
                description: description,
                priority: priority,
                deadline: deadline,
                reference: reference
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('✅ Таск успешно выдан!', 'success');
            document.getElementById('builderTaskForm').reset();
            document.getElementById('deadline').value = '';
        } else {
            showNotification(`❌ ${data.error || 'Ошибка при создании таска'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения с сервером', 'error');
    }
}

// Очистка формы
function clearForm() {
    document.getElementById('builderTaskForm').reset();
    document.getElementById('deadline').value = '';
    document.getElementById('builderName').value = '';
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadBuilders();

    const form = document.getElementById('builderTaskForm');
    if (form) {
        form.addEventListener('submit', submitTask);
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }
});

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

    // ========== ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА ДЛЯ РОЛИ В ХЕДЕРЕ ==========
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
                    return isAdmin;
                }
            }
        } catch (error) {
            console.error('Ошибка проверки прав:', error);
        }
        return window.userData.isAdmin;
    }

    // Запускаем загрузку аватарки при загрузке страницы
    document.addEventListener('DOMContentLoaded', async () => {
        await loadHeaderAvatar();
        await checkAdminRights();
    });