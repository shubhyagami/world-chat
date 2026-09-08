package com.earthchat.model;

public class SignalMessage {
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String targetId;
    private String type; // "call-request", "call-accept", "call-reject", "offer", "answer", "ice-candidate", "hangup"
    private Object payload; // SDP offer/answer object or ICE candidate object
    private String mediaType; // "video" or "audio"

    public SignalMessage() {
    }

    public SignalMessage(String senderId, String senderName, String senderAvatar, String targetId, String type, Object payload) {
        this.senderId = senderId;
        this.senderName = senderName;
        this.senderAvatar = senderAvatar;
        this.targetId = targetId;
        this.type = type;
        this.payload = payload;
        this.mediaType = "video";
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }
}
