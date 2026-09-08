package com.earthchat.listener;

import com.earthchat.model.ChatMessage;
import com.earthchat.model.User;
import com.earthchat.service.UserManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final UserManager userManager;
    private final SimpMessageSendingOperations messagingTemplate;

    public WebSocketEventListener(UserManager userManager, SimpMessageSendingOperations messagingTemplate) {
        this.userManager = userManager;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        if (sessionId != null) {
            User removedUser = userManager.removeBySessionId(sessionId);
            if (removedUser != null) {
                logger.info("User disconnected: {} (ID: {})", removedUser.getName(), removedUser.getId());

                // Broadcast updated user list
                messagingTemplate.convertAndSend("/topic/users", userManager.getAllUsers());

                // Broadcast updated active links (arcs)
                messagingTemplate.convertAndSend("/topic/links", userManager.getAllLinks());

                // Notify chat about user departure
                ChatMessage leaveMessage = new ChatMessage(
                        removedUser.getId(),
                        removedUser.getName(),
                        removedUser.getAvatarUrl(),
                        "GLOBAL",
                        removedUser.getName() + " disconnected from OrbitSync.",
                        "SYSTEM"
                );
                messagingTemplate.convertAndSend("/topic/chat.public", leaveMessage);
            }
        }
    }
}
