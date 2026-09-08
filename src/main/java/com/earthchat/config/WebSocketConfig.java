package com.earthchat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Primary endpoint with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Direct WebSocket endpoint without SockJS
        registry.addEndpoint("/ws-direct")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable in-memory broker for public topics and user-specific private queues
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages routed to @MessageMapping handlers
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user-targeted messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Support sending images, GIFs and rich media over STOMP
        registration.setMessageSizeLimit(8 * 1024 * 1024); // 8 MB
        registration.setSendBufferSizeLimit(16 * 1024 * 1024); // 16 MB
        registration.setSendTimeLimit(25 * 1000); // 25 seconds
    }
}
