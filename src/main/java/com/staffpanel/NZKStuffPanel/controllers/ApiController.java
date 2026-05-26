package com.staffpanel.NZKStuffPanel.controllers;

import com.staffpanel.NZKStuffPanel.models.RegistrationRequest;
import com.staffpanel.NZKStuffPanel.models.Role;
import com.staffpanel.NZKStuffPanel.models.User;
import com.staffpanel.NZKStuffPanel.repository.RegistrationRequestRepository;
import com.staffpanel.NZKStuffPanel.repository.UserRepository;
import com.staffpanel.NZKStuffPanel.services.CloudinaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import com.staffpanel.NZKStuffPanel.models.Task;
import com.staffpanel.NZKStuffPanel.repository.TaskRepository;
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

    // ========== ИДЕИ ==========
    @GetMapping("/ideas")
    public List<Map<String, Object>> getIdeas() {
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
                        case "ANIMATOR":
                            roles.add(Role.ROLE_ANIMATOR);
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

    // ========== УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АДМИНКИ) ==========
    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Пользователь не найден");
            return ResponseEntity.badRequest().body(response);
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
                    case "ANIMATOR":
                        roles.add(Role.ROLE_ANIMATOR);
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

        RegistrationRequest request = new RegistrationRequest();
        request.setUsername(username);
        request.setPassword(passwordEncoder.encode(password));
        request.setStatus("PENDING");
        requestRepository.save(request);

        response.put("success", "Заявка отправлена на рассмотрение");
        return ResponseEntity.ok(response);
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

        try {
            String avatarUrl = cloudinaryService.uploadAvatar(file, userOpt.get().getId());
            User user = userOpt.get();
            user.setAvatar(avatarUrl);
            userRepository.save(user);

            // Устанавливаем заголовки для отключения кэша
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

}