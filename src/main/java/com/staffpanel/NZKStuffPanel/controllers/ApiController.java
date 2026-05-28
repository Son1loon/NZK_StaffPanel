package com.staffpanel.NZKStuffPanel.controllers;

import com.staffpanel.NZKStuffPanel.models.*;
import com.staffpanel.NZKStuffPanel.models.Character;
import com.staffpanel.NZKStuffPanel.repository.*;
import com.staffpanel.NZKStuffPanel.services.CloudinaryService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import com.staffpanel.NZKStuffPanel.repository.CharacterRepository;
import com.staffpanel.NZKStuffPanel.repository.VoiceRecordRepository;

import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public ApiController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }


    // ========== СТАТИСТИКА ==========
    @GetMapping("/stats")
    public Map<String, Integer> getStats() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("activeTasks", 0);
        stats.put("buildIdeas", 0);
        stats.put("audioFiles", 0);
        stats.put("activeUsers", (int) userRepository.count());
        return stats;
    }

    // Получить задачи текущего пользователя (для профиля)
    @GetMapping("/user/tasks")
    public ResponseEntity<?> getUserTasks(Authentication auth) {
        String username = auth.getName();
        List<Task> tasks = taskRepository.findByAssignee(username);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Task task : tasks) {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("id", task.getId());
            taskMap.put("title", task.getTitle());
            taskMap.put("description", task.getDescription());
            taskMap.put("status", task.getStatus());
            taskMap.put("priority", task.getPriority());
            taskMap.put("deadline", task.getDeadline());
            taskMap.put("createdAt", task.getCreatedAt());
            result.add(taskMap);
        }

        return ResponseEntity.ok(result);
    }

    // ========== АУДИО ==========
    @GetMapping("/audio")
    public List<Map<String, String>> getAudio() {
        return new ArrayList<>();
    }

    // ========== РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО ДЛЯ АДМИНОВ) ==========
    @PostMapping("/admin/register-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> userData) {
        String username = (String) userData.get("username");
        String password = (String) userData.get("password");
        String confirmPassword = (String) userData.get("confirmPassword");

        @SuppressWarnings("unchecked")
        List<String> selectedRoles = (List<String>) userData.get("roles");

        Map<String, String> response = new HashMap<>();

        if (username == null || username.trim().isEmpty()) {
            response.put("error", "Имя пользователя не может быть пустым");
            return ResponseEntity.badRequest().body(response);
        }
        if (password == null || password.length() < 3) {
            response.put("error", "Пароль должен быть минимум 3 символа");
            return ResponseEntity.badRequest().body(response);
        }
        if (!password.equals(confirmPassword)) {
            response.put("error", "Пароли не совпадают");
            return ResponseEntity.badRequest().body(response);
        }
        if (userRepository.findByUsername(username).isPresent()) {
            response.put("error", "Пользователь с таким именем уже существует");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword(passwordEncoder.encode(password));

            Set<Role> roles = new HashSet<>();
            roles.add(Role.ROLE_USER);

            if (selectedRoles != null && !selectedRoles.isEmpty()) {
                for (String roleName : selectedRoles) {
                    switch (roleName) {
                        case "ADMIN":
                            roles.add(Role.ROLE_ADMIN);
                            break;
                        case "BUILDER":
                            roles.add(Role.ROLE_BUILDER);
                            break;
                        case "SCREENWRITER":
                            roles.add(Role.ROLE_SCREENWRITER);
                            break;
                        case "VOICE_ACTOR":
                            roles.add(Role.ROLE_VOICE_ACTOR);
                            break;
                    }
                }
            }

            newUser.setRoles(roles);
            userRepository.save(newUser);

            response.put("success", "Пользователь " + username + " успешно создан!");
            response.put("roles", roles.toString());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Ошибка при создании пользователя: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // ========== ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ДЛЯ АДМИНКИ) ==========
    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());
            userMap.put("roles", user.getRoles());
            response.add(userMap);
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Пользователь не найден");
            return ResponseEntity.badRequest().body(response);
        }

        User user = userOpt.get();

        // Сначала удаляем связи в таблице script_assignees
        List<Script> scripts = scriptRepository.findAll();
        for (Script script : scripts) {
            if (script.getAssignees().remove(user)) {
                scriptRepository.save(script);
            }
        }

        // ИЛИ прямой SQL запрос:
        // scriptAssigneesRepository.deleteByUserId(id);

        // Удаляем аватар из Cloudinary
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            cloudinaryService.deleteFileByUrl(user.getAvatar());
        }

        userRepository.deleteById(id);

        Map<String, String> response = new HashMap<>();
        response.put("success", "Пользователь удалён");
        return ResponseEntity.ok(response);
    }

    // ========== ИЗМЕНИТЬ РОЛИ ПОЛЬЗОВАТЕЛЯ (С ОБНОВЛЕНИЕМ СЕССИИ) ==========
    @PutMapping("/admin/users/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRoles(@PathVariable Long id, @RequestBody Map<String, Object> userData,
                                             HttpServletRequest request, HttpServletResponse response) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            Map<String, String> responseMap = new HashMap<>();
            responseMap.put("error", "Пользователь не найден");
            return ResponseEntity.badRequest().body(responseMap);
        }

        @SuppressWarnings("unchecked")
        List<String> selectedRoles = (List<String>) userData.get("roles");

        User user = userOpt.get();
        Set<Role> roles = new HashSet<>();

        roles.add(Role.ROLE_USER);

        if (selectedRoles != null && !selectedRoles.isEmpty()) {
            for (String roleName : selectedRoles) {
                switch (roleName) {
                    case "ADMIN":
                        roles.add(Role.ROLE_ADMIN);
                        break;
                    case "BUILDER":
                        roles.add(Role.ROLE_BUILDER);
                        break;
                    case "SCREENWRITER":
                        roles.add(Role.ROLE_SCREENWRITER);
                        break;
                    case "VOICE_ACTOR":
                        roles.add(Role.ROLE_VOICE_ACTOR);
                        break;
                }
            }
        }

        user.setRoles(roles);
        userRepository.save(user);

        // ОБНОВЛЯЕМ СЕССИЮ, если пользователь меняет свои роли
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName().equals(user.getUsername())) {
            // Получаем обновлённые роли
            User updatedUser = userRepository.findById(id).get();
            List<GrantedAuthority> authorities = updatedUser.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority(role.name()))
                    .collect(Collectors.toList());

            Authentication newAuth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                    auth.getPrincipal(), auth.getCredentials(), authorities);
            SecurityContextHolder.getContext().setAuthentication(newAuth);

            // Обновляем сессию
            request.getSession().setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    SecurityContextHolder.getContext());
        }

        Map<String, String> responseMap = new HashMap<>();
        responseMap.put("success", "Роли пользователя " + user.getUsername() + " обновлены");
        responseMap.put("roles", roles.toString());
        return ResponseEntity.ok(responseMap);
    }

    // ========== ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С РОЛЯМИ ДЛЯ ОБЗОРА (АДМИН) ==========
    @GetMapping("/admin/all-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsersWithRoles() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());

            List<String> roles = user.getRoles().stream()
                    .map(role -> role.name().replace("ROLE_", ""))
                    .collect(Collectors.toList());
            userMap.put("roles", roles);
            userMap.put("status", "offline");

            response.add(userMap);
        }

        return ResponseEntity.ok(response);
    }

    // ========== РЕГИСТРАЦИОННЫЕ ЗАЯВКИ ==========

    @Autowired
    private RegistrationRequestRepository requestRepository;

    @PostMapping("/register-request")
    public ResponseEntity<?> createRegistrationRequest(@RequestBody Map<String, String> data) {
        String username = data.get("username");
        String password = data.get("password");

        Map<String, String> response = new HashMap<>();

        if (username == null || username.trim().isEmpty()) {
            response.put("error", "Имя пользователя не может быть пустым");
            return ResponseEntity.badRequest().body(response);
        }
        if (password == null || password.length() < 3) {
            response.put("error", "Пароль должен быть минимум 3 символа");
            return ResponseEntity.badRequest().body(response);
        }
        if (userRepository.findByUsername(username).isPresent()) {
            response.put("error", "Пользователь с таким именем уже существует");
            return ResponseEntity.badRequest().body(response);
        }
        if (requestRepository.existsByUsernameAndStatus(username, "PENDING")) {
            response.put("error", "У вас уже есть активная заявка");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            RegistrationRequest request = new RegistrationRequest();
            request.setUsername(username);
            request.setPassword(passwordEncoder.encode(password));
            request.setStatus("PENDING");
            request.setRequestedAt(LocalDateTime.now()); // Явно устанавливаем дату

            requestRepository.save(request);

            response.put("success", "Заявка отправлена на рассмотрение");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("error", "Ошибка сервера: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/admin/registration-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingRequests() {
        List<RegistrationRequest> requests = requestRepository.findByStatus("PENDING");
        List<Map<String, Object>> result = new ArrayList<>();
        for (RegistrationRequest req : requests) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", req.getId());
            map.put("username", req.getUsername());
            map.put("requestedAt", req.getRequestedAt());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/approve-request/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveRequest(@PathVariable Long id) {
        Optional<RegistrationRequest> opt = requestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Заявка не найдена"));
        }
        RegistrationRequest request = opt.get();
        if (!"PENDING".equals(request.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Заявка уже обработана"));
        }

        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(request.getPassword());
        Set<Role> roles = new HashSet<>();
        roles.add(Role.ROLE_USER);
        newUser.setRoles(roles);
        userRepository.save(newUser);

        request.setStatus("APPROVED");
        requestRepository.save(request);

        return ResponseEntity.ok(Map.of("success", "Пользователь создан"));
    }

    @PostMapping("/admin/reject-request/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectRequest(@PathVariable Long id) {
        Optional<RegistrationRequest> opt = requestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Заявка не найдена"));
        }
        RegistrationRequest request = opt.get();
        request.setStatus("REJECTED");
        requestRepository.save(request);
        return ResponseEntity.ok(Map.of("success", "Заявка отклонена"));
    }

    // ========== ОНЛАЙН СТАТУСЫ ПОЛЬЗОВАТЕЛЕЙ ==========
    private final Map<Long, Long> userLastActivity = new ConcurrentHashMap<>();

    @PostMapping("/heartbeat")
    public ResponseEntity<?> updateHeartbeat(@RequestBody Map<String, Long> data) {
        Long userId = data.get("userId");
        if (userId != null) {
            userLastActivity.put(userId, System.currentTimeMillis());
            return ResponseEntity.ok(Map.of("success", true));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "No userId"));
    }

    @GetMapping("/online-users")
    public ResponseEntity<?> getOnlineUsers() {
        long currentTime = System.currentTimeMillis();
        long onlineThreshold = 60000;

        List<Long> onlineUserIds = userLastActivity.entrySet().stream()
                .filter(entry -> (currentTime - entry.getValue()) < onlineThreshold)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("onlineUserIds", onlineUserIds));
    }

    // ========== ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ВСЕХ (ПУБЛИЧНЫЙ) ==========
    @GetMapping("/public-users")
    public ResponseEntity<?> getPublicUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());
            userMap.put("avatar", user.getAvatar());  // <-- ДОБАВЬ ЭТУ СТРОКУ

            List<String> roles = user.getRoles().stream()
                    .map(role -> role.name().replace("ROLE_", ""))
                    .collect(Collectors.toList());
            userMap.put("roles", roles);

            response.add(userMap);
        }

        return ResponseEntity.ok(response);
    }

    // ========== ПРИНУДИТЕЛЬНЫЙ ВЫХОД ПОЛЬЗОВАТЕЛЯ ==========
    @PostMapping("/admin/force-logout/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> forceLogout(@PathVariable Long id, HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пользователь не найден"));
        }

        // Инвалидируем сессию пользователя (если она есть)
        request.getSession().invalidate();

        return ResponseEntity.ok(Map.of("success", "Пользователь принудительно вышел"));
    }

    // ========== ПОЛЬЗОВАТЕЛЬСКИЕ ДАННЫЕ ДЛЯ ПРОФИЛЯ ==========

    @GetMapping("/user/builds")
    public ResponseEntity<?> getUserBuilds(Authentication auth) {
        String username = auth.getName();
        // TODO: Реализовать получение построек пользователя
        return ResponseEntity.ok(new ArrayList<>());
    }

    @GetMapping("/user/scripts")
    public ResponseEntity<?> getUserScripts(Authentication auth) {
        String username = auth.getName();
        // TODO: Реализовать получение сценариев пользователя
        return ResponseEntity.ok(new ArrayList<>());
    }

    @GetMapping("/user/audios")
    public ResponseEntity<?> getUserAudios(Authentication auth) {
        String username = auth.getName();
        // TODO: Реализовать получение аудио пользователя
        return ResponseEntity.ok(new ArrayList<>());
    }

    @GetMapping("/user/animations")
    public ResponseEntity<?> getUserAnimations(Authentication auth) {
        String username = auth.getName();
        // TODO: Реализовать получение анимаций пользователя
        return ResponseEntity.ok(new ArrayList<>());
    }

    @PutMapping("/user/settings")
    public ResponseEntity<?> updateUserSettings(@RequestBody Map<String, String> data, Authentication auth) {
        String username = auth.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пользователь не найден"));
        }

        User user = userOpt.get();
        String email = data.get("email");
        String password = data.get("password");

        // TODO: Обновление email (если добавишь поле в БД)
        // if (email != null && !email.isEmpty()) {
        //     user.setEmail(email);
        // }

        if (password != null && !password.isEmpty()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true));
    }

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping("/user/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile file, Authentication auth, HttpServletResponse response) {
        String username = auth.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пользователь не найден"));
        }

        User user = userOpt.get();

        // Удаляем старый аватар
        if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
            cloudinaryService.deleteFileByUrl(user.getAvatar());
        }

        try {
            String avatarUrl = cloudinaryService.uploadAvatar(file, userOpt.get().getId());
            user.setAvatar(avatarUrl);
            userRepository.save(user);

            response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");

            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl + "?t=" + System.currentTimeMillis()));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ошибка загрузки аватара"));
        }
    }

    // ========== ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (ДЛЯ ХЕДЕРА) ==========
    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(Authentication auth) {
        String username = auth.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пользователь не найден"));
        }

        User user = userOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("avatar", user.getAvatar() != null ? user.getAvatar() : "");
        response.put("roles", user.getRoles().stream()
                .map(role -> role.name().replace("ROLE_", ""))
                .collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    // ========== ЗАДАЧИ ==========
    @Autowired
    private TaskRepository taskRepository;

    @GetMapping("/tasks")
    public ResponseEntity<?> getTasks(@RequestParam(required = false) String filter) {
        List<Task> allTasks = taskRepository.findAll();
        List<Map<String, Object>> inProgress = new ArrayList<>();
        List<Map<String, Object>> completed = new ArrayList<>();

        for (Task task : allTasks) {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("id", task.getId());
            taskMap.put("title", task.getTitle());
            taskMap.put("assignee", task.getAssignee());
            taskMap.put("createdBy", task.getCreatedBy()); // добавляем автора
            taskMap.put("priority", task.getPriority());
            taskMap.put("deadline", task.getDeadline());
            taskMap.put("description", task.getDescription());

            // Фильтрация по исполнителю
            if (filter != null && !filter.isEmpty() && !filter.equals("all")) {
                if (!task.getAssignee().equals(filter)) {
                    continue;
                }
            }

            if ("COMPLETED".equals(task.getStatus())) {
                taskMap.put("completedAt", task.getCompletedAt());
                completed.add(taskMap);
            } else {
                inProgress.add(taskMap);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("inProgress", inProgress);
        response.put("completed", completed);
        return ResponseEntity.ok(response);
    }

    // Создание задачи (админ)
    @PostMapping("/admin/create-task")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createTask(@RequestBody Map<String, String> taskData, Authentication auth) {
        String title = taskData.get("title");
        String description = taskData.get("description");
        String assignee = taskData.get("assignee");
        String priority = taskData.get("priority");
        String deadline = taskData.get("deadline");
        String reference = taskData.get("reference");
        String currentUser = auth.getName();

        Map<String, String> response = new HashMap<>();

        if (title == null || title.trim().isEmpty()) {
            response.put("error", "Название задачи не может быть пустым");
            return ResponseEntity.badRequest().body(response);
        }

        if (assignee == null || assignee.trim().isEmpty()) {
            response.put("error", "Выберите исполнителя");
            return ResponseEntity.badRequest().body(response);
        }

        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description != null ? description : "");
        task.setAssignee(assignee);
        task.setCreatedBy(currentUser); // сохраняем кто выдал
        task.setPriority(priority != null ? priority.toUpperCase() : "MEDIUM");
        task.setDeadline(deadline);
        task.setReference(reference);
        task.setStatus("PENDING");

        taskRepository.save(task);

        response.put("success", "Задача успешно создана!");
        return ResponseEntity.ok(response);
    }

    // Завершение задачи
    @PostMapping("/tasks/{id}/complete")
    public ResponseEntity<?> completeTask(@PathVariable Long id, Authentication auth) {
        Optional<Task> taskOpt = taskRepository.findById(id);

        if (taskOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Задача не найдена"));
        }

        Task task = taskOpt.get();

        if (!task.getAssignee().equals(auth.getName()) && !auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(Map.of("error", "Вы можете завершать только свои задачи"));
        }

        task.setStatus("COMPLETED");
        task.setCompletedAt(LocalDateTime.now());
        taskRepository.save(task);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // Удаление задачи (только для админов)
    @DeleteMapping("/admin/tasks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        Optional<Task> taskOpt = taskRepository.findById(id);

        if (taskOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Задача не найдена"));
        }

        taskRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", "Задача удалена"));
    }

    // Получить список исполнителей для фильтра
    @GetMapping("/tasks/assignees")
    public ResponseEntity<?> getTaskAssignees() {
        List<Task> tasks = taskRepository.findAll();
        Set<String> assignees = new TreeSet<>();

        for (Task task : tasks) {
            assignees.add(task.getAssignee());
        }

        return ResponseEntity.ok(assignees);
    }

    // Получить всех строителей (пользователей с ролью BUILDER)
    @GetMapping("/builders")
    public ResponseEntity<?> getBuilders() {
        List<User> allUsers = userRepository.findAll();
        List<Map<String, Object>> builders = new ArrayList<>();

        for (User user : allUsers) {
            boolean isBuilder = user.getRoles().stream()
                    .anyMatch(role -> role.name().equals("ROLE_BUILDER"));

            if (isBuilder) {
                Map<String, Object> builderInfo = new HashMap<>();
                builderInfo.put("id", user.getId());
                builderInfo.put("username", user.getUsername());
                builderInfo.put("avatar", user.getAvatar());

                // Считаем активные задачи
                long activeTasks = taskRepository.countByAssigneeAndStatus(user.getUsername(), "PENDING");
                builderInfo.put("activeTasksCount", activeTasks);

                builders.add(builderInfo);
            }
        }

        return ResponseEntity.ok(builders);
    }

    // ========== ПЕРСОНАЖИ И ОЗВУЧКА ==========

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private VoiceRecordRepository voiceRecordRepository;

    // Получить всех персонажей (админ видит всех, актёр только своих)
    @GetMapping("/characters")
    @Transactional
    public ResponseEntity<?> getCharacters(Authentication auth) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        List<Character> characters;
        if (isAdmin) {
            characters = characterRepository.findAll();
        } else {
            characters = characterRepository.findByAssignedTo(username);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Character character : characters) {
            Map<String, Object> charMap = new HashMap<>();
            charMap.put("id", character.getId());
            charMap.put("name", character.getName());
            charMap.put("description", character.getDescription());
            charMap.put("assignedTo", character.getAssignedTo());
            charMap.put("createdBy", character.getCreatedBy());
            charMap.put("imageUrl", character.getImageUrl());
            charMap.put("voiceRecordsCount", character.getVoiceRecords().size());
            result.add(charMap);
        }

        return ResponseEntity.ok(result);
    }

    // Получить всех актёров озвучки
    @GetMapping("/voice-actors")
    public ResponseEntity<?> getVoiceActors() {
        List<User> allUsers = userRepository.findAll();
        List<Map<String, Object>> voiceActors = new ArrayList<>();

        for (User user : allUsers) {
            boolean isVoiceActor = user.getRoles().stream()
                    .anyMatch(role -> role.name().equals("ROLE_VOICE_ACTOR"));

            if (isVoiceActor) {
                Map<String, Object> actorMap = new HashMap<>();
                actorMap.put("id", user.getId());
                actorMap.put("username", user.getUsername());
                actorMap.put("avatar", user.getAvatar());

                // Считаем количество персонажей у актёра
                long charactersCount = characterRepository.findByAssignedTo(user.getUsername()).size();
                actorMap.put("charactersCount", charactersCount);

                voiceActors.add(actorMap);
            }
        }

        return ResponseEntity.ok(voiceActors);
    }

    // Создать персонажа (только админ)
    @PostMapping("/admin/characters")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createCharacter(@RequestBody Map<String, String> data, Authentication auth) {
        String name = data.get("name");
        String description = data.get("description");
        String assignedTo = data.get("assignedTo");
        String imageUrl = data.get("imageUrl");
        String currentUser = auth.getName();

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Введите имя персонажа"));
        }

        Character character = new Character();
        character.setName(name);
        character.setDescription(description != null ? description : "");
        character.setAssignedTo(assignedTo);
        character.setCreatedBy(currentUser);
        character.setImageUrl(imageUrl);

        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("success", "Персонаж создан", "characterId", character.getId()));
    }

    // Выдать персонажа актёру (только админ)
    @PutMapping("/admin/characters/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignCharacter(@PathVariable Long id, @RequestBody Map<String, String> data) {
        String assignedTo = data.get("assignedTo");

        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();
        character.setAssignedTo(assignedTo);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("success", "Персонаж выдан актёру " + assignedTo));
    }

    // Забрать персонажа у актёра (только админ)
    @DeleteMapping("/admin/characters/{id}/unassign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unassignCharacter(@PathVariable Long id) {
        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();
        character.setAssignedTo(null);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("success", "Персонаж отобран у актёра"));
    }

    // Удалить персонажа (только админ)
    @DeleteMapping("/admin/characters/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCharacter(@PathVariable Long id) {
        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();

        // Удаляем изображение персонажа
        if (character.getImageUrl() != null && !character.getImageUrl().isEmpty()) {
            cloudinaryService.deleteFileByUrl(character.getImageUrl());
        }

        // Удаляем все озвучки персонажа
        List<VoiceRecord> records = voiceRecordRepository.findByCharacterId(id);
        for (VoiceRecord record : records) {
            if (record.getAudioUrl() != null && !record.getAudioUrl().isEmpty()) {
                cloudinaryService.deleteFileByUrl(record.getAudioUrl());
            }
        }

        characterRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", "Персонаж удалён"));
    }

    // Получить озвучки персонажа
    @GetMapping("/characters/{id}/voice-records")
    public ResponseEntity<?> getCharacterVoiceRecords(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();

        // Если персонаж не закреплён ни за кем - только админ может смотреть
        if (character.getAssignedTo() == null && !isAdmin) {
            return ResponseEntity.status(403).body(Map.of("error", "Этот персонаж ещё не выдан актёру. Доступ только у администратора."));
        }

        // Проверяем доступ: админ или актёр, которому выдан персонаж
        if (!isAdmin && !username.equals(character.getAssignedTo())) {
            return ResponseEntity.status(403).body(Map.of("error", "У вас недостаточно прав просмотреть озвучки этого персонажа"));
        }

        List<VoiceRecord> records = voiceRecordRepository.findByCharacterId(id);
        List<Map<String, Object>> result = new ArrayList<>();

        for (VoiceRecord record : records) {
            Map<String, Object> recordMap = new HashMap<>();
            recordMap.put("id", record.getId());
            recordMap.put("title", record.getTitle());
            recordMap.put("description", record.getDescription());
            recordMap.put("audioUrl", record.getAudioUrl());
            recordMap.put("voiceActor", record.getVoiceActor());
            recordMap.put("createdAt", record.getCreatedAt());
            result.add(recordMap);
        }

        return ResponseEntity.ok(result);
    }

    // Загрузить озвучку для персонажа
    @PostMapping("/characters/{id}/voice-record")
    public ResponseEntity<?> addVoiceRecord(@PathVariable Long id,
                                            @RequestBody Map<String, String> data,
                                            Authentication auth) {
        String username = auth.getName();
        String title = data.get("title");
        String description = data.get("description");
        String audioUrl = data.get("audioUrl");

        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();

        // Проверяем, что актёр имеет право озвучивать этого персонажа
        if (!username.equals(character.getAssignedTo())) {
            return ResponseEntity.status(403).body(Map.of("error", "Вы не можете озвучивать этого персонажа"));
        }

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Введите название озвучки"));
        }

        if (audioUrl == null || audioUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Укажите ссылку на аудиофайл"));
        }

        VoiceRecord record = new VoiceRecord();
        record.setTitle(title);
        record.setDescription(description != null ? description : "");
        record.setAudioUrl(audioUrl);
        record.setCharacter(character);
        record.setVoiceActor(username);

        voiceRecordRepository.save(record);

        return ResponseEntity.ok(Map.of("success", "Озвучка добавлена", "recordId", record.getId()));
    }

    // Удалить озвучку (актёр может удалить свою, админ - любую)
    @DeleteMapping("/voice-records/{id}")
    public ResponseEntity<?> deleteVoiceRecord(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        Optional<VoiceRecord> recordOpt = voiceRecordRepository.findById(id);
        if (recordOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Озвучка не найдена"));
        }

        VoiceRecord record = recordOpt.get();

        if (!isAdmin && !username.equals(record.getVoiceActor())) {
            return ResponseEntity.status(403).body(Map.of("error", "Вы можете удалять только свои озвучки"));
        }

        // Удаляем аудиофайл из Cloudinary
        if (record.getAudioUrl() != null && !record.getAudioUrl().isEmpty()) {
            cloudinaryService.deleteFileByUrl(record.getAudioUrl());
        }

        voiceRecordRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", "Озвучка удалена"));
    }

    // Загрузить аудиофайл на Cloudinary (для озвучки)
    @PostMapping("/characters/{id}/upload-audio")
    @PreAuthorize("hasRole('VOICE_ACTOR') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadCharacterAudio(@PathVariable Long id,
                                                  @RequestParam("audio") MultipartFile file,
                                                  Authentication auth) {
        String username = auth.getName();

        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();

        // Проверяем права
        if (!username.equals(character.getAssignedTo()) && !auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(Map.of("error", "Вы не можете загружать аудио для этого персонажа"));
        }

        try {
            String audioUrl = cloudinaryService.uploadAudio(file, id);
            return ResponseEntity.ok(Map.of("audioUrl", audioUrl));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ошибка загрузки аудио"));
        }
    }

    // Обновить актёра персонажа (админ)
    @PutMapping("/admin/characters/{id}/reassign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reassignCharacter(@PathVariable Long id, @RequestBody Map<String, String> data) {
        String assignedTo = data.get("assignedTo");

        Optional<Character> characterOpt = characterRepository.findById(id);
        if (characterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Персонаж не найден"));
        }

        Character character = characterOpt.get();
        character.setAssignedTo(assignedTo);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("success", "Актёр персонажа изменён на " + assignedTo));
    }

    // Загрузка изображения для персонажа
    @PostMapping("/upload/character-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadCharacterImage(@RequestParam("avatar") MultipartFile file) {
        try {
            String imageUrl = cloudinaryService.uploadCharacterImage(file);
            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ошибка загрузки изображения"));
        }
    }

    // ========== СЦЕНАРИИ ==========
    @Autowired
    private ScriptRepository scriptRepository;

    // Получить всех сценаристов
    @GetMapping("/screenwriters")
    public ResponseEntity<?> getScreenwriters() {
        List<User> allUsers = userRepository.findAll();
        List<Map<String, Object>> screenwriters = new ArrayList<>();

        for (User user : allUsers) {
            boolean isScreenwriter = user.getRoles().stream()
                    .anyMatch(role -> role.name().equals("ROLE_SCREENWRITER"));

            if (isScreenwriter) {
                Map<String, Object> writerMap = new HashMap<>();
                writerMap.put("id", user.getId());
                writerMap.put("username", user.getUsername());
                writerMap.put("avatar", user.getAvatar());

                long activeScripts = scriptRepository.findByAssigneeUsername(user.getUsername()).size();
                writerMap.put("activeScriptsCount", activeScripts);

                screenwriters.add(writerMap);
            }
        }
        return ResponseEntity.ok(screenwriters);
    }

    // Получить сценарии
    @GetMapping("/scripts")
    public ResponseEntity<?> getScripts(Authentication auth) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        List<Script> scripts;
        if (isAdmin) {
            scripts = scriptRepository.findAll();
        } else {
            scripts = scriptRepository.findByAssigneeUsername(username);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Script script : scripts) {
            Map<String, Object> scriptMap = new HashMap<>();
            scriptMap.put("id", script.getId());
            scriptMap.put("title", script.getTitle());
            scriptMap.put("description", script.getDescription());
            scriptMap.put("googleDocUrl", script.getGoogleDocUrl());
            scriptMap.put("assignees", script.getAssignees().stream()
                    .map(User::getUsername).collect(Collectors.toList()));
            scriptMap.put("createdBy", script.getCreatedBy());
            scriptMap.put("createdAt", script.getCreatedAt());
            scriptMap.put("status", script.getStatus());
            result.add(scriptMap);
        }
        return ResponseEntity.ok(result);
    }

    // Создать сценарий (только админ)
    @PostMapping("/admin/scripts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createScript(@RequestBody Map<String, Object> data, Authentication auth) {
        String title = (String) data.get("title");
        String description = (String) data.get("description");
        String googleDocUrl = (String) data.get("googleDocUrl");
        @SuppressWarnings("unchecked")
        List<String> assigneeUsernames = (List<String>) data.get("assignees");
        String currentUser = auth.getName();

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Введите название сценария"));
        }
        if (googleDocUrl == null || googleDocUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Укажите ссылку на Google документ"));
        }

        Script script = new Script();
        script.setTitle(title);
        script.setDescription(description != null ? description : "");
        script.setGoogleDocUrl(googleDocUrl);
        script.setCreatedBy(currentUser);
        script.setStatus("ACTIVE");

        // Добавляем сценаристов
        if (assigneeUsernames != null && !assigneeUsernames.isEmpty()) {
            Set<User> assignees = new HashSet<>();
            for (String username : assigneeUsernames) {
                userRepository.findByUsername(username).ifPresent(assignees::add);
            }
            script.setAssignees(assignees);
        }

        scriptRepository.save(script);
        return ResponseEntity.ok(Map.of("success", "Сценарий создан", "scriptId", script.getId()));
    }

    // Удалить сценарий (только админ)
    @DeleteMapping("/admin/scripts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteScript(@PathVariable Long id) {
        Optional<Script> scriptOpt = scriptRepository.findById(id);
        if (scriptOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Сценарий не найден"));
        }
        scriptRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", "Сценарий удалён"));
    }

    // Получить сценарий по ID (для редактирования)
    @GetMapping("/admin/scripts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getScriptById(@PathVariable Long id) {
        Optional<Script> scriptOpt = scriptRepository.findById(id);
        if (scriptOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Сценарий не найден"));
        }

        Script script = scriptOpt.get();
        Map<String, Object> result = new HashMap<>();
        result.put("id", script.getId());
        result.put("title", script.getTitle());
        result.put("description", script.getDescription());
        result.put("googleDocUrl", script.getGoogleDocUrl());
        result.put("assignees", script.getAssignees().stream()
                .map(User::getUsername).collect(Collectors.toList()));

        return ResponseEntity.ok(result);
    }

    // Обновить сценаристов сценария (админ)
    @PutMapping("/admin/scripts/{id}/assignees")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateScriptAssignees(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        @SuppressWarnings("unchecked")
        List<String> assigneeUsernames = (List<String>) data.get("assignees");

        Optional<Script> scriptOpt = scriptRepository.findById(id);
        if (scriptOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Сценарий не найден"));
        }

        Script script = scriptOpt.get();
        Set<User> assignees = new HashSet<>();

        if (assigneeUsernames != null && !assigneeUsernames.isEmpty()) {
            for (String username : assigneeUsernames) {
                userRepository.findByUsername(username).ifPresent(assignees::add);
            }
        }

        script.setAssignees(assignees);
        scriptRepository.save(script);

        return ResponseEntity.ok(Map.of("success", "Сценаристы обновлены"));
    }

    // ========== ИДЕИ ==========
    @Autowired
    private IdeaRepository ideaRepository;

    @Autowired
    private IdeaLikeRepository ideaLikeRepository;

    // Получить все идеи
    @GetMapping("/ideas")
    @Transactional
    public ResponseEntity<?> getIdeas(Authentication auth,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        // Получаем текущего пользователя для проверки лайков
        Optional<User> currentUserOpt = userRepository.findByUsername(username);
        Long currentUserId = currentUserOpt.map(User::getId).orElse(null);

        Pageable pageable = PageRequest.of(page, size);
        Page<Idea> ideasPage;

        if (isAdmin) {
            ideasPage = ideaRepository.findAll(pageable);
        } else {
            ideasPage = ideaRepository.findByStatus("APPROVED", pageable);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Idea idea : ideasPage.getContent()) {
            Map<String, Object> ideaMap = new HashMap<>();
            ideaMap.put("id", idea.getId());
            ideaMap.put("title", idea.getTitle());
            ideaMap.put("description", idea.getDescription());
            ideaMap.put("type", idea.getType());
            ideaMap.put("author", idea.getAuthor());
            ideaMap.put("status", idea.getStatus());
            ideaMap.put("likes", idea.getLikesCount());
            ideaMap.put("createdAt", idea.getCreatedAt());

            // Добавляем информацию, лайкнул ли текущий пользователь
            if (currentUserId != null) {
                boolean liked = ideaLikeRepository.existsByIdeaIdAndUserId(idea.getId(), currentUserId);
                ideaMap.put("liked", liked);
            } else {
                ideaMap.put("liked", false);
            }

            result.add(ideaMap);
        }

        // Возвращаем также мета-информацию о пагинации
        Map<String, Object> response = new HashMap<>();
        response.put("content", result);
        response.put("totalPages", ideasPage.getTotalPages());
        response.put("totalElements", ideasPage.getTotalElements());
        response.put("currentPage", page);
        response.put("size", size);

        return ResponseEntity.ok(response);
    }

    // Поставить/убрать лайк идее (toggle)
    @PostMapping("/ideas/{id}/like")
    @Transactional
    public ResponseEntity<?> toggleLike(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Пользователь не найден"));
        }

        Optional<Idea> ideaOpt = ideaRepository.findById(id);
        if (ideaOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Идея не найдена"));
        }

        Idea idea = ideaOpt.get();
        User user = userOpt.get();

        // Проверяем, есть ли уже лайк
        boolean alreadyLiked = ideaLikeRepository.existsByIdeaIdAndUserId(id, user.getId());

        if (alreadyLiked) {
            // Удаляем лайк
            ideaLikeRepository.deleteByIdeaIdAndUserId(id, user.getId());
            idea.setLikesCount(idea.getLikesCount() - 1);
            ideaRepository.save(idea);
            return ResponseEntity.ok(Map.of("success", true, "liked", false, "likes", idea.getLikesCount()));
        } else {
            // Добавляем лайк
            IdeaLike like = new IdeaLike();
            like.setIdea(idea);
            like.setUser(user);
            ideaLikeRepository.save(like);
            idea.setLikesCount(idea.getLikesCount() + 1);
            ideaRepository.save(idea);
            return ResponseEntity.ok(Map.of("success", true, "liked", true, "likes", idea.getLikesCount()));
        }
    }

    // Получить статистику идей
    @GetMapping("/ideas/stats")
    public ResponseEntity<?> getIdeasStats() {
        long buildIdeas = ideaRepository.countByTypeAndStatus("BUILD", "APPROVED");
        long siteIdeas = ideaRepository.countByTypeAndStatus("SITE", "APPROVED");
        long pendingIdeas = ideaRepository.countByStatus("PENDING");  // используй новый метод

        Map<String, Object> stats = new HashMap<>();
        stats.put("buildIdeas", buildIdeas);
        stats.put("siteIdeas", siteIdeas);
        stats.put("pendingIdeas", pendingIdeas);

        return ResponseEntity.ok(stats);
    }

    @PostMapping("/ideas")
    public ResponseEntity<?> createIdea(@RequestBody Map<String, String> data, Authentication auth) {
        String title = data.get("title");
        String description = data.get("description");
        String type = data.get("type");
        String username = auth.getName();

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Введите название идеи"));
        }
        if (description == null || description.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Введите описание идеи"));
        }
        if (type == null || (!type.equals("BUILD") && !type.equals("SITE"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Неверный тип идеи"));
        }

        Idea idea = new Idea();
        idea.setTitle(title);
        idea.setDescription(description);
        idea.setType(type);
        idea.setAuthor(username);
        idea.setStatus("PENDING");
        idea.setLikesCount(0);

        ideaRepository.save(idea);

        return ResponseEntity.ok(Map.of("success", true, "message", "Идея отправлена на модерацию"));
    }

    // ========== АДМИНСКИЕ МЕТОДЫ ДЛЯ ИДЕЙ ==========

    // Одобрить идею
    @PostMapping("/admin/ideas/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> approveIdea(@PathVariable Long id) {
        Optional<Idea> ideaOpt = ideaRepository.findById(id);
        if (ideaOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Идея не найдена"));
        }
        Idea idea = ideaOpt.get();
        idea.setStatus("APPROVED");
        ideaRepository.save(idea);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Отклонить идею
    @PostMapping("/admin/ideas/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> rejectIdea(@PathVariable Long id) {
        Optional<Idea> ideaOpt = ideaRepository.findById(id);
        if (ideaOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Идея не найдена"));
        }
        Idea idea = ideaOpt.get();
        idea.setStatus("REJECTED");
        ideaRepository.save(idea);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Удалить идею
    @DeleteMapping("/admin/ideas/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteIdea(@PathVariable Long id) {
        Optional<Idea> ideaOpt = ideaRepository.findById(id);
        if (ideaOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Идея не найдена"));
        }

        // Удаляем все лайки этой идеи
        ideaLikeRepository.deleteByIdeaId(id);

        ideaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

}