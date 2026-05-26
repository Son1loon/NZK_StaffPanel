package com.staffpanel.NZKStuffPanel.controllers;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GiveTaskController {

    @GetMapping("/give_tusk_form")
    public String giveTaskForm(Authentication auth, Model model) {
        String username = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals("ROLE_ADMIN"));

        model.addAttribute("username", username);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("currentPage", "give_tusk_form");

        return "give_tusk_form";
    }
}