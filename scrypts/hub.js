// Таб-навигация (header + footer ссылки)
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

// Имитация кнопок и демо-действий (фронт оповещения)
const addTaskBtn = document.querySelector('.add-task-btn');
if (addTaskBtn) {
	addTaskBtn.addEventListener('click', () => alert('✨ [ДЕМО] Форма выдачи нового таска (Бэкенд в разработке)'));
}
const uploadAudioBtn = document.querySelector('.upload-audio-btn');
if (uploadAudioBtn) {
	uploadAudioBtn.addEventListener('click', () => alert('🎙️ Функция загрузки аудио материала появится с бэкендом. Сейчас можно тестировать интерфейс.'));
}
const newIdeaBtn = document.querySelector('.new-idea-btn');
if (newIdeaBtn) {
	newIdeaBtn.addEventListener('click', () => alert('💡 Добавление идей построек — форма откроется в будущем обновлении. Ваша креативность важна!'));
}
const completeBtns = document.querySelectorAll('.complete-task');
completeBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		alert('✅ Таск отмечен как выполненный. Работа сохранена в архив построек!');
		const taskCard = btn.closest('.task-card');
		if (taskCard) {
			taskCard.style.opacity = '0.6';
			btn.disabled = true;
			btn.textContent = 'Готово';
		}
	});
});
document.getElementById('logoutHubBtn')?.addEventListener('click', () => {
	alert('Вы вышли из NZK Hub. Для повторного входа потребуется авторизация.');
	window.location.href = 'index.html';
});