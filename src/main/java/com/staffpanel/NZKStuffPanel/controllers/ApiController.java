package com.staffpanel.NZKStuffPanel.controllers;

import com.staffpanel.NZKStuffPanel.models.RegistrationRequest;
import com.staffpanel.NZKStuffPanel.models.Role;
import com.staffpanel.NZKStuffPanel.models.User;
import com.staffpanel.NZKStuffPanel.repository.RegistrationRequestRepository;
import com.staffpanel.NZKStuffPanel.repository.UserRepository;
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

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

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

            List<String> roles = user.getRoles().stream()
                    .map(role -> role.name().replace("ROLE_", ""))
                    .collect(Collectors.toList());
            userMap.put("roles", roles);

            response.add(userMap);
        }

        return ResponseEntity.ok(response);
    }
}