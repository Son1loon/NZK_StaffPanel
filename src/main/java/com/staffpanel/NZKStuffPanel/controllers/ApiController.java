package com.staffpanel.NZKStuffPanel.controllers;

import com.staffpanel.NZKStuffPanel.models.RegistrationRequest;
import com.staffpanel.NZKStuffPanel.models.Role;
import com.staffpanel.NZKStuffPanel.models.User;
import com.staffpanel.NZKStuffPanel.repository.RegistrationRequestRepository;
import com.staffpanel.NZKStuffPanel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
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

    // ========== ЗАДАЧИ ==========
    @GetMapping("/tasks")
    public Map<String, Object> getTasks() {
        Map<String, Object> tasks = new HashMap<>();
        tasks.put("inProgress", new ArrayList<>());
        tasks.put("completed", new ArrayList<>());
        return tasks;
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

        // Получаем список ролей из запроса
        @SuppressWarnings("unchecked")
        List<String> selectedRoles = (List<String>) userData.get("roles");

        Map<String, String> response = new HashMap<>();

        // Проверка: имя не пустое
        if (username == null || username.trim().isEmpty()) {
            response.put("error", "Имя пользователя не может быть пустым");
            return ResponseEntity.badRequest().body(response);
        }

        // Проверка: длина пароля
        if (password == null || password.length() < 3) {
            response.put("error", "Пароль должен быть минимум 3 символа");
            return ResponseEntity.badRequest().body(response);
        }

        // Проверка: совпадение паролей
        if (!password.equals(confirmPassword)) {
            response.put("error", "Пароли не совпадают");
            return ResponseEntity.badRequest().body(response);
        }

        // Проверка: уникальность имени
        if (userRepository.findByUsername(username).isPresent()) {
            response.put("error", "Пользователь с таким именем уже существует");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // Создаём пользователя
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword(passwordEncoder.encode(password));

            // Формируем набор ролей
            Set<Role> roles = new HashSet<>();

            // Всегда добавляем базовую роль USER
            roles.add(Role.ROLE_USER);

            // Добавляем выбранные роли
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
                        default:
                            break;
                    }
                }
            }

            newUser.setRoles(roles);
            userRepository.save(newUser);

            // Формируем ответ с информацией о созданном пользователе
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

    // ========== ИЗМЕНИТЬ РОЛИ ПОЛЬЗОВАТЕЛЯ ==========
    @PutMapping("/admin/users/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserRoles(@PathVariable Long id, @RequestBody Map<String, Object> userData) {
        Optional<User> userOpt = userRepository.findById(id);

        if (userOpt.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Пользователь не найден");
            return ResponseEntity.badRequest().body(response);
        }

        @SuppressWarnings("unchecked")
        List<String> selectedRoles = (List<String>) userData.get("roles");

        User user = userOpt.get();
        Set<Role> roles = new HashSet<>();

        // Всегда добавляем базовую роль USER
        roles.add(Role.ROLE_USER);

        // Добавляем выбранные роли
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
                    default:
                        break;
                }
            }
        }

        user.setRoles(roles);
        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("success", "Роли пользователя " + user.getUsername() + " обновлены");
        response.put("roles", roles.toString());
        return ResponseEntity.ok(response);
    }

    // ========== ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С РОЛЯМИ ДЛЯ ОБЗОРА ==========
    @GetMapping("/admin/all-users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsersWithRoles() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());

            // Получаем роли пользователя (убираем префикс ROLE_)
            List<String> roles = user.getRoles().stream()
                    .map(role -> role.name().replace("ROLE_", ""))
                    .collect(Collectors.toList());
            userMap.put("roles", roles);

            // Статус (пока все online, потом можно добавить last_login)
            userMap.put("status", "online");

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

        // Создаём пользователя с ролью USER
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(request.getPassword()); // уже зашифрован
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
}