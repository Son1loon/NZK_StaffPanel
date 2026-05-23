package com.staffpanel.NZKStuffPanel.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

    @GetMapping("/login")
    public String login() {
        return "login_form";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/hub_nzk";
    }
}