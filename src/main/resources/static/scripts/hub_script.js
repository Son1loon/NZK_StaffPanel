// Таб-навигация (header + footer ссылки)
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-content');
    const footerNavLinks = document.querySelectorAll('[data-nav-footer]');

    function switchTab(tabId) {
        // обновить активные классы у кнопок
        tabs.forEach(btn => {
            const btnTab = btn.getAttribute('data-tab');
            if (btnTab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        // показать нужную панель
        panes.forEach(pane => {
            if (pane.id === `${tabId}-tab`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // Загружаем данные для активной вкладки
        loadTabData(tabId);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
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

    // Загружаем данные для текущей активной вкладки
    const activeTab = document.querySelector('.nav-tab.active')?.getAttribute('data-tab') || 'dashboard';
    loadTabData(activeTab);
}

async function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            await loadStats();
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
    }
}

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

            // Добавляем обработчики для кнопок завершения задач
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
        const response = await fetch(`/api/tasks/${taskId}/complete`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('✅ Таск отмечен как выполненный!');
            await loadTasks(); // Перезагружаем список
        } else {
            showNotification('❌ Ошибка при завершении задачи', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка соединения', 'error');
    }
}

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
                    ${audio.map(a => `
                        <div class="audio-item">
                            <div class="audio-info">
                                <strong>${escapeHtml(a.name)}</strong>
                                <span>🎙️ ${escapeHtml(a.author || 'Неизвестен')}</span>
                            </div>
                            <audio controls src="${a.url}"></audio>
                        </div>
                    `).join('') || '<p>Нет аудиофайлов</p>'}
                </div>
                <div class="voice-actors-list">
                    <h4>🎭 Состав актёров</h4>
                    <ul>
                        ${audio.actors?.map(actor => `<li>${escapeHtml(actor)}</li>`).join('') || '<li>Нет данных</li>'}
                    </ul>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки аудио:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки аудиофайлов</div>';
    }
}

async function loadIdeas() {
    const container = document.querySelector('#ideas-tab .ideas-feed');
    if (!container) return;

    try {
        const response = await fetch('/api/ideas');
        if (response.ok) {
            const ideas = await response.json();

            container.innerHTML = ideas.map(idea => `
                <div class="idea-card">
                    <h4>💡 ${escapeHtml(idea.title)}</h4>
                    <p>${escapeHtml(idea.description)}</p>
                    <div class="idea-meta">
                        <span>✍️ ${escapeHtml(idea.author)}</span>
                        <span class="like-btn" data-id="${idea.id}">❤️ ${idea.likes || 0} лайков</span>
                    </div>
                </div>
            `).join('') || '<div class="empty-state">Нет идей построек</div>';

            // Добавляем обработчики лайков
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
        const response = await fetch(`/api/ideas/${ideaId}/like`, {
            method: 'POST'
        });

        if (response.ok) {
            await loadIdeas(); // Перезагружаем
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

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
                        <tr>
                            <th>Название</th>
                            <th>Тип</th>
                            <th>Автор/актёр</th>
                            <th>Прослушать</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${audio.map(a => `
                            <tr>
                                <td>${escapeHtml(a.name)}</td>
                                <td>${escapeHtml(a.type || 'Аудио')}</td>
                                <td>${escapeHtml(a.author || 'Неизвестен')}</td>
                                <td><audio controls src="${a.url}"></audio></td>
                            </tr>
                        `).join('') || '<tr><td colspan="4">Нет аудиофайлов</td></tr>'}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки библиотеки:', error);
        container.innerHTML = '<div class="error-message">Ошибка загрузки библиотеки</div>';
    }
}

function showNotification(message, type = 'success') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initTabs();

    // Кнопки действий
    const addTaskBtn = document.querySelector('.add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            window.location.href = '/give_tusk_form';
        });
    }

    const uploadAudioBtn = document.querySelector('.upload-audio-btn');
    if (uploadAudioBtn) {
        uploadAudioBtn.addEventListener('click', () => {
            alert('🎙️ Загрузка аудио будет доступна в следующем обновлении');
        });
    }

    const newIdeaBtn = document.querySelector('.new-idea-btn');
    if (newIdeaBtn) {
        newIdeaBtn.addEventListener('click', () => {
            window.location.href = '/add_idea';
        });
    }
});

// Добавляем CSS для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .empty-task, .empty-state {
        text-align: center;
        padding: 40px;
        color: #888;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
    }

    .task-card {
        background: rgba(255,255,255,0.1);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 10px;
    }

    .task-card.completed {
        opacity: 0.7;
        background: rgba(34,197,94,0.1);
    }

    .complete-task {
        margin-top: 10px;
        padding: 5px 10px;
        background: #22c55e;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    .audio-item {
        background: rgba(255,255,255,0.1);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 10px;
    }

    .audio-info {
        margin-bottom: 10px;
    }

    audio {
        width: 100%;
    }

    .like-btn {
        cursor: pointer;
        transition: transform 0.2s;
    }

    .like-btn:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);