package com.staffpanel.NZKStuffPanel.controllers;

import com.staffpanel.NZKStuffPanel.models.User;
import com.staffpanel.NZKStuffPanel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public String profile(Authentication auth, Model model) {
        String username = auth.getName();
        User user = userRepository.findByUsername(username).orElse(null);

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        model.addAttribute("username", username);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("user", user);
        model.addAttribute("currentPage", "profile");

        return "profile";
    }
}