// give_tusk_form.js — полная механика хедера и футера как в hub.html

// ========== УСТАНОВКА МИНИМАЛЬНОЙ ДАТЫ ==========
const deadlineInput = document.getElementById('deadline');
const today = new Date().toISOString().split('T')[0];
deadlineInput.min = today;
// дефолт +5 дней
const defaultDeadline = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
deadlineInput.value = defaultDeadline;

// ========== ФУНКЦИЯ УВЕДОМЛЕНИЙ ==========
function showMessage(text, isError = false) {
	const toast = document.createElement('div');
	toast.className = 'toast-notify';
	toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${text}`;
	if (isError) toast.style.borderLeftColor = '#f87171';
	document.body.appendChild(toast);
	setTimeout(() => {
		toast.style.opacity = '0';
		setTimeout(() => toast.remove(), 2800);
	}, 2800);
}

// ========== МЕХАНИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК (КАК В HUB) ==========
// Находим все кнопки вкладок и контент (на этой странице нет панелей, но сделаем переходы на hub.html)
const tabs = document.querySelectorAll('.nav-tab');
const footerNavLinks = document.querySelectorAll('[data-nav-footer]');

// Функция переключения вкладок с переходом на hub.html с якорем
function switchTab(tabId) {
	// Сохраняем выбранную вкладку в sessionStorage
	sessionStorage.setItem('activeTab', tabId);
	// Перенаправляем на hub.html с параметром tab
	window.location.href = `hub.html?tab=${tabId}`;
}

// Обработчики для навигационных кнопок хедера
tabs.forEach(tab => {
	tab.addEventListener('click', (e) => {
		const tabId = tab.getAttribute('data-tab');
		if (tabId) {
			// Убираем active класс со всех кнопок и добавляем на текущую (визуально)
			tabs.forEach(t => t.classList.remove('active'));
			tab.classList.add('active');
			// Переходим на hub.html
			switchTab(tabId);
		}
	});
});

// Обработчики для ссылок в футере
footerNavLinks.forEach(link => {
	link.addEventListener('click', (e) => {
		e.preventDefault();
		const targetTab = link.getAttribute('data-nav-footer');
		if (targetTab) {
			// Визуально подсвечиваем соответствующую вкладку в хедере
			tabs.forEach(tab => {
				if (tab.getAttribute('data-tab') === targetTab) {
					tabs.forEach(t => t.classList.remove('active'));
					tab.classList.add('active');
				}
			});
			// Переходим на hub.html
			switchTab(targetTab);
		}
	});
});

// ========== МЕХАНИКА ВЫХОДА (LOGOUT) ==========
const logoutBtn = document.getElementById('logoutHubBtn');
if (logoutBtn) {
	logoutBtn.addEventListener('click', () => {
		// Очищаем данные сессии (если есть)
		sessionStorage.removeItem('activeTab');
		sessionStorage.removeItem('isAuthenticated');
		// Показываем сообщение и перенаправляем на страницу авторизации
		showMessage('👋 Выход из системы...');
		setTimeout(() => {
			window.location.href = 'index.html';
		}, 800);
	});
}

// ========== ОБРАБОТКА ОТПРАВКИ ФОРМЫ ==========
const form = document.getElementById('builderTaskForm');
form.addEventListener('submit', (e) => {
	e.preventDefault();

	const builder = document.getElementById('builderName').value;
	const taskTitle = document.getElementById('taskName').value.trim();
	const desc = document.getElementById('taskDescription').value.trim();
	const priority = document.getElementById('priority').value;
	const deadline = document.getElementById('deadline').value;
	const reference = document.getElementById('reference').value.trim();

	if (!builder) {
		showMessage('❌ Выберите строителя', true);
		return;
	}
	if (!taskTitle) {
		showMessage('❌ Укажите название таска', true);
		return;
	}
	if (!deadline) {
		showMessage('❌ Установите срок выполнения', true);
		return;
	}

	// Формируем объект для будущего бэкенда (Spring Boot)
	const taskData = {
		type: "builder_task",
		assignee: builder,
		title: taskTitle,
		description: desc || "Без описания",
		priority: priority,
		deadline: deadline,
		reference: reference || null,
		status: "active",
		createdAt: new Date().toISOString()
	};

	console.log("📐 Новый таск для билдера (JSON):", taskData);

	// Здесь в будущем будет POST запрос на бэкенд
	// fetch('/api/tasks', { method: 'POST', headers: {...}, body: JSON.stringify(taskData) })

	showMessage(`✅ Таск "${taskTitle}" выдан ${builder}`);

	// Частичный сброс полей
	document.getElementById('taskName').value = '';
	document.getElementById('taskDescription').value = '';
	document.getElementById('reference').value = '';
	document.getElementById('priority').value = 'medium';
	deadlineInput.value = defaultDeadline;
	document.getElementById('taskName').focus();
});

// ========== КНОПКА ОЧИСТКИ ФОРМЫ ==========
const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
	document.getElementById('builderName').value = '';
	document.getElementById('taskName').value = '';
	document.getElementById('taskDescription').value = '';
	document.getElementById('priority').value = 'medium';
	deadlineInput.value = defaultDeadline;
	document.getElementById('reference').value = '';
	showMessage('🧹 Форма очищена', false);
});

// ========== АКТИВНАЯ ВКЛАДКА ПРИ ЗАГРУЗКЕ ==========
// Проверяем, какая вкладка должна быть активна (если пришли с hub.html)
function setActiveTabFromUrl() {
	const urlParams = new URLSearchParams(window.location.search);
	const tabParam = urlParams.get('tab');

	if (tabParam) {
		// Находим кнопку с таким data-tab и делаем её активной
		tabs.forEach(tab => {
			if (tab.getAttribute('data-tab') === tabParam) {
				tabs.forEach(t => t.classList.remove('active'));
				tab.classList.add('active');
			}
		});
	} else {
		// По умолчанию активна первая вкладка (Обзор)
		const activeFromStorage = sessionStorage.getItem('activeTab');
		if (activeFromStorage) {
			tabs.forEach(tab => {
				if (tab.getAttribute('data-tab') === activeFromStorage) {
					tabs.forEach(t => t.classList.remove('active'));
					tab.classList.add('active');
				}
			});
		}
	}
}

// Запускаем установку активной вкладки
setActiveTabFromUrl();

// ========== ПОДСВЕТКА ПРИОРИТЕТА (ВИЗУАЛЬНЫЙ ЭФФЕКТ) ==========
const prioritySelect = document.getElementById('priority');
function updatePriorityBorder() {
	const card = document.querySelector('.task-card');
	if (!card) return;

	// Удаляем старые классы приоритета
	card.classList.remove('priority-high', 'priority-medium', 'priority-low');

	const val = prioritySelect.value;
	if (val === 'high') {
		card.classList.add('priority-high');
	} else if (val === 'medium') {
		card.classList.add('priority-medium');
	} else {
		card.classList.add('priority-low');
	}
}

prioritySelect.addEventListener('change', updatePriorityBorder);
updatePriorityBorder();

// ========== ДОБАВЛЯЕМ СТИЛИ ДЛЯ ПРИОРИТЕТОВ В КАРТОЧКУ ==========
// (динамическое добавление стилей, если их нет в CSS)
const priorityStyles = document.createElement('style');
priorityStyles.textContent = `
    .task-card.priority-high {
        border-top: 3px solid #ff5e6e;
    }
    .task-card.priority-medium {
        border-top: 3px solid #ffb347;
    }
    .task-card.priority-low {
        border-top: 3px solid #5ac8fa;
    }
`;
document.head.appendChild(priorityStyles);

// ========== ПРОВЕРКА АВТОРИЗАЦИИ (ДЛЯ БЕЗОПАСНОСТИ) ==========
function checkAuth() {
	// Проверяем, авторизован ли пользователь
	const isAuthenticated = sessionStorage.getItem('isAuthenticated');
	if (!isAuthenticated && window.location.pathname !== '/index.html') {
		// Если не авторизован и не на странице входа, перенаправляем
		// Раскомментировать при интеграции с реальной авторизацией
		// window.location.href = 'index.html';
	}
}

// Вызываем проверку при загрузке
// checkAuth();

// ========== ПЛАВНАЯ ПРОКРУТКА ПРИ ПЕРЕХОДАХ (ОПЦИОНАЛЬНО) ==========
// Сохраняем позицию прокрутки при уходе со страницы
window.addEventListener('beforeunload', () => {
	sessionStorage.setItem('scrollPosition', window.scrollY);
});

// ========== ДОПОЛНИТЕЛЬНО: ВАЛИДАЦИЯ ДАТЫ ==========
deadlineInput.addEventListener('change', () => {
	const selectedDate = new Date(deadlineInput.value);
	const todayDate = new Date(today);
	if (selectedDate < todayDate) {
		showMessage('⚠️ Срок выполнения не может быть раньше сегодняшнего дня', true);
		deadlineInput.value = defaultDeadline;
	}
});

console.log('✅ give_tusk_form.js загружен, все механики активны');