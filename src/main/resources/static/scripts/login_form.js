// Анимированные частицы
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.opacity = Math.random() * 0.4;
        container.appendChild(particle);
    }
}

createParticles();

// Загрузка сохраненных данных (только username, не пароль!)
if (localStorage.getItem('rememberedUser')) {
    const remembered = JSON.parse(localStorage.getItem('rememberedUser'));
    document.getElementById('username').value = remembered.username;
    document.getElementById('rememberMe').checked = true;
}

// Обработка формы
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');

    // Валидация
    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    // Показываем загрузчик
    const originalBtnContent = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="loader"></span><span> Вход...</span>';
    loginBtn.disabled = true;

    try {
        // РЕАЛЬНЫЙ ЗАПРОС К БЭКЕНДУ SPRING BOOT
        const response = await fetch('/perform_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                username: username,
                password: password
            })
        });

        // Spring Security при успехе редиректит, при ошибке возвращает страницу с error параметром
        if (response.redirected) {
            // Успешный вход - Spring Security сам перенаправит на /hub
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({ username }));
            } else {
                localStorage.removeItem('rememberedUser');
            }

            // Анимация успеха
            loginBtn.style.background = 'linear-gradient(95deg, #22c55e, #16a34a)';
            loginBtn.innerHTML = '<i class="fas fa-check"></i><span> Успешно!</span>';

            setTimeout(() => {
                window.location.href = response.url;
            }, 500);
        } else {
            // Проверяем, есть ли ошибка
            const text = await response.text();
            if (text.includes('error=true') || response.url.includes('error=true')) {
                showError('Неверное имя пользователя или пароль');
            } else {
                showError('Ошибка входа');
            }
            loginBtn.innerHTML = originalBtnContent;
            loginBtn.disabled = false;
        }

    } catch (error) {
        console.error('Ошибка:', error);
        showError('Ошибка соединения с сервером');
        loginBtn.innerHTML = originalBtnContent;
        loginBtn.disabled = false;
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 4000);
}

// Обработка Enter
document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// Стили для автокомплита
const style = document.createElement('style');
style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px #0d1122 inset !important;
        -webkit-text-fill-color: #eef2ff !important;
        caret-color: #eef2ff;
    }
`;
document.head.appendChild(style);