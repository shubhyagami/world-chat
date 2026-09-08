package com.earthchat.controller;

import com.earthchat.model.ConnectionLink;
import com.earthchat.model.User;
import com.earthchat.service.UserManager;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collection;

@Controller
public class GlobeController {

    private final UserManager userManager;

    public GlobeController(UserManager userManager) {
        this.userManager = userManager;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("totalUsers", userManager.getAllUsers().size());
        model.addAttribute("totalLinks", userManager.getAllLinks().size());
        return "index";
    }

    @GetMapping("/api/users")
    @ResponseBody
    public Collection<User> getActiveUsers() {
        return userManager.getAllUsers();
    }

    @GetMapping("/api/links")
    @ResponseBody
    public Collection<ConnectionLink> getActiveLinks() {
        return userManager.getAllLinks();
    }

    @GetMapping("/api/health")
    @ResponseBody
    public String health() {
        return "OK";
    }
}
