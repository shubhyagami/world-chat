package com.earthchat.model;

import java.util.UUID;

public class ChatMessage {
    private String id;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String targetId; // null or "GLOBAL" for broadcast
    private String content;
    private String mediaUrl; // URL or base64 data for images / meme GIFs
    private String mediaType; // "IMAGE", "GIF", "EMOJI", "TEXT"
    private long timestamp;
    private String type; // "CHAT", "GLOBAL", "SYSTEM", "IMAGE", "GIF"

    public ChatMessage() {
        this.id = UUID.randomUUID().toString();
        this.timestamp = System.currentTimeMillis();
        this.type = "CHAT";
        this.mediaType = "TEXT";
    }

    public ChatMessage(String senderId, String senderName, String senderAvatar, String targetId, String content, String type) {
        this.id = UUID.randomUUID().toString();
        this.senderId = senderId;
        this.senderName = senderName;
        this.senderAvatar = senderAvatar;
        this.targetId = targetId;
        this.content = content;
        this.type = type != null ? type : "CHAT";
        this.mediaType = "TEXT";
        this.timestamp = System.currentTimeMillis();
    }

    public ChatMessage(String senderId, String senderName, String senderAvatar, String targetId, String content, String mediaUrl, String mediaType, String type) {
        this.id = UUID.randomUUID().toString();
        this.senderId = senderId;
        this.senderName = senderName;
        this.senderAvatar = senderAvatar;
        this.targetId = targetId;
        this.content = content;
        this.mediaUrl = mediaUrl;
        this.mediaType = mediaType != null ? mediaType : "TEXT";
        this.type = type != null ? type : "CHAT";
        this.timestamp = System.currentTimeMillis();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderAvatar() {
        return senderAvatar;
    }

    public void setSenderAvatar(String senderAvatar) {
        this.senderAvatar = senderAvatar;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
