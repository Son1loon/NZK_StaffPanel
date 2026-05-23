// add_idea.js — механика добавления идей построек с полной навигацией

// ========== УСТАНОВКА ДАТЫ ==========
const today = new Date().toISOString().split('T')[0];

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
// ========== МЕХАНИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ==========
const tabs = document.querySelectorAll('.nav-tab');
const footerNavLinks = document.querySelectorAll('[data-nav-footer]');

function switchTab(tabId) {
	sessionStorage.setItem('activeTab', tabId);
	window.location.href = `hub.html?tab=${tabId}`;
}

tabs.forEach(tab => {
	tab.addEventListener('click', (e) => {
		const tabId = tab.getAttribute('data-tab');
		if (tabId) {
			tabs.forEach(t => t.classList.remove('active'));
			tab.classList.add('active');
			switchTab(tabId);
		}
	});
});

footerNavLinks.forEach(link => {
	link.addEventListener('click', (e) => {
		e.preventDefault();
		const targetTab = link.getAttribute('data-nav-footer');
		if (targetTab) {
			tabs.forEach(tab => {
				if (tab.getAttribute('data-tab') === targetTab) {
					tabs.forEach(t => t.classList.remove('active'));
					tab.classList.add('active');
				}
			});
			switchTab(targetTab);
		}
	});
});

// ========== МЕХАНИКА ВЫХОДА ==========
const logoutBtn = document.getElementById('logoutHubBtn');
if (logoutBtn) {
	logoutBtn.addEventListener('click', () => {
		sessionStorage.removeItem('activeTab');
		sessionStorage.removeItem('isAuthenticated');
		showMessage('👋 Выход из системы...');
		setTimeout(() => {
			window.location.href = 'index.html';
		}, 800);
	});
}

// ========== ОБРАБОТКА ОТПРАВКИ ФОРМЫ ==========
const form = document.getElementById('addIdeaForm');

form.addEventListener('submit', (e) => {
	e.preventDefault();

	const author = document.getElementById('authorName').value;
	const title = document.getElementById('ideaTitle').value.trim();
	const category = document.getElementById('ideaCategory').value;
	const description = document.getElementById('ideaDescription').value.trim();
	const difficulty = document.getElementById('difficulty').value;
	const priority = document.getElementById('priority').value;
	const size = document.getElementById('size').value.trim();
	const materials = document.getElementById('materials').value.trim();
	const references = document.getElementById('references').value.trim();

	// Валидация
	if (!author) {
		showMessage('❌ Выберите автора идеи', true);
		return;
	}
	if (!title) {
		showMessage('❌ Укажите название идеи', true);
		return;
	}
	if (!description) {
		showMessage('❌ Напишите описание идеи', true);
		return;
	}

	// Формируем объект для будущего бэкенда
	const ideaData = {
		type: "build_idea",
		author: author,
		title: title,
		category: category,
		description: description,
		difficulty: difficulty,
		priority: priority,
		size: size || "не указано",
		materials: materials || "не указаны",
		references: references || null,
		status: "pending",
		likes: 0,
		createdAt: new Date().toISOString(),
		comments: []
	};

	console.log("💡 Новая идея постройки (JSON для Spring Boot):", ideaData);
	showMessage(`✨ Идея "${title}" успешно добавлена!`);

	// Сброс формы
	document.getElementById('ideaTitle').value = '';
	document.getElementById('ideaDescription').value = '';
	document.getElementById('size').value = '';
	document.getElementById('materials').value = '';
	document.getElementById('references').value = '';
	document.getElementById('difficulty').value = 'medium';
	document.getElementById('priority').value = 'medium';

	// Фокус на название
	document.getElementById('ideaTitle').focus();
});

// ========== КНОПКА ОЧИСТКИ ==========
const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
	document.getElementById('authorName').value = '';
	document.getElementById('ideaTitle').value = '';
	document.getElementById('ideaCategory').value = 'castle';
	document.getElementById('ideaDescription').value = '';
	document.getElementById('difficulty').value = 'medium';
	document.getElementById('priority').value = 'medium';
	document.getElementById('size').value = '';
	document.getElementById('materials').value = '';
	document.getElementById('references').value = '';
	showMessage('🧹 Форма очищена', false);
});

// ========== АКТИВНАЯ ВКЛАДКА ПРИ ЗАГРУЗКЕ ==========
function setActiveTabFromUrl() {
	const urlParams = new URLSearchParams(window.location.search);
	const tabParam = urlParams.get('tab');

	if (tabParam) {
		tabs.forEach(tab => {
			if (tab.getAttribute('data-tab') === tabParam) {
				tabs.forEach(t => t.classList.remove('active'));
				tab.classList.add('active');
			}
		});
	} else {
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

setActiveTabFromUrl();

// ========== ПОДСЧЁТ СИМВОЛОВ В ОПИСАНИИ ==========
const descTextarea = document.getElementById('ideaDescription');
const charCounter = document.createElement('div');
charCounter.className = 'char-counter';
charCounter.style.fontSize = '0.7rem';
charCounter.style.color = '#7a86b5';
charCounter.style.textAlign = 'right';
charCounter.style.marginTop = '0.3rem';
descTextarea.parentNode.appendChild(charCounter);

function updateCharCount() {
	const length = descTextarea.value.length;
	charCounter.innerHTML = `${length} / 1000 символов`;
	if (length > 900) {
		charCounter.style.color = '#ffaa88';
	} else {
		charCounter.style.color = '#7a86b5';
	}
}

descTextarea.addEventListener('input', updateCharCount);
updateCharCount();

// ========== АНИМАЦИЯ ДЛЯ КАРТОЧКИ ==========
const ideaCard = document.querySelector('.idea-card');
if (ideaCard) {
	ideaCard.style.animation = 'fadeSlide 0.4s ease-out';
}

// Добавляем стиль анимации
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes fadeSlide {
        from {
            opacity: 0;
            transform: translateY(15px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(animationStyle);

console.log('✅ add_idea.js загружен, все механики активны');