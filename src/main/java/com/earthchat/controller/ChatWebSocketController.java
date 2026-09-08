package com.earthchat.controller;

import com.earthchat.model.*;
import com.earthchat.service.UserManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketController.class);

    private final UserManager userManager;
    private final SimpMessageSendingOperations messagingTemplate;

    public ChatWebSocketController(UserManager userManager, SimpMessageSendingOperations messagingTemplate) {
        this.userManager = userManager;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * User registers when opening the app and acquiring coordinates
     */
    @MessageMapping("/user.join")
    public void joinUser(@Payload User user, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        User registered = userManager.registerUser(user, sessionId);
        logger.info("User joined: {} ({}, {}) from {}, {}", registered.getName(), registered.getLat(), registered.getLng(), registered.getCity(), registered.getCountry());

        // Broadcast full user list to all connected clients
        messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());

        // Broadcast all active connection links (arcs)
        messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());

        // Send a system message to public chat
        ChatMessage welcomeMsg = new ChatMessage(
                registered.getId(),
                registered.getName(),
                registered.getAvatarUrl(),
                "GLOBAL",
                registered.getName() + " joined from " + registered.getCity() + ", " + registered.getCountry() + "!",
                "SYSTEM"
        );
        messagingTemplate.convertAndSend("/topic/chat.public", welcomeMsg);
    }

    /**
     * User updates coordinates (GPS shift or teleport / city select)
     */
    @MessageMapping("/user.updateLocation")
    public void updateLocation(@Payload LocationUpdate update) {
        if (update.getUserId() != null) {
            User updated = userManager.updateLocation(
                    update.getUserId(),
                    update.getLat(),
                    update.getLng(),
                    update.getCity(),
                    update.getCountry()
            );
            if (updated != null) {
                // Broadcast updated user list and active links (since coordinates shifted)
                messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());
                messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());
            }
        }
    }

    /**
     * User updates identity profile (Name, Age, Gender, Avatar)
     */
    @MessageMapping("/user.updateProfile")
    public void updateProfile(@Payload User profile) {
        if (profile.getId() != null) {
            User updated = userManager.updateProfile(
                    profile.getId(),
                    profile.getName(),
                    profile.getAge(),
                    profile.getGender(),
                    profile.getAvatarUrl()
            );
            if (updated != null) {
                messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());
                messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());
            }
        }
    }

    /**
     * Broadcast live Cupid love arrow action between Male and Female users
     */
    @MessageMapping("/love.shoot")
    public void shootLoveArrow(@Payload java.util.Map<String, Object> event) {
        // Broadcast love animation trigger to all clients across the world
        messagingTemplate.convertAndSend("/topic/love-events", event);
    }

    /**
     * Send public or 1-on-1 private chat message
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage message) {
        if (message.getTargetId() == null || "GLOBAL".equalsIgnoreCase(message.getTargetId())) {
            // Public room message
            messagingTemplate.convertAndSend("/topic/chat.public", message);
        } else {
            // Private 1-on-1 message
            // Create a CHAT link if not already connected
            ConnectionLink link = userManager.createLink(message.getSenderId(), message.getTargetId(), "CHAT");
            if (link != null) {
                messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());
            }

            // Route to target user's private channel
            messagingTemplate.convertAndSend("/topic/user." + message.getTargetId() + ".chat", message);
            // Echo back to sender so their UI updates
            messagingTemplate.convertAndSend("/topic/user." + message.getSenderId() + ".chat", message);
        }
    }

    /**
     * WebRTC signaling (call-request, call-accept, call-reject, offer, answer, ice-candidate, hangup)
     */
    @MessageMapping("/call.signal")
    public void handleSignal(@Payload SignalMessage signal) {
        String targetId = signal.getTargetId();
        String type = signal.getType();

        logger.debug("Signal {} from {} to {}", type, signal.getSenderId(), targetId);

        if ("call-accept".equalsIgnoreCase(type)) {
            // Video call accepted: establish VIDEO link and mark users IN_CALL
            ConnectionLink link = userManager.createLink(signal.getSenderId(), targetId, "VIDEO");
            if (link != null) {
                messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());
                messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());
            }
        } else if ("hangup".equalsIgnoreCase(type) || "call-reject".equalsIgnoreCase(type)) {
            // Call terminated: remove link and reset status
            userManager.removeLink(signal.getSenderId(), targetId);
            messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());
            messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());
        }

        // Deliver signal directly to target user
        if (targetId != null && !targetId.isEmpty()) {
            messagingTemplate.convertAndSend("/topic/user." + targetId + ".signal", signal);
        }
    }
}
