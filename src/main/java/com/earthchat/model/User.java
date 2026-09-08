package com.earthchat.model;

public class User {
    private String id;
    private String sessionId;
    private String name;
    private String avatarUrl;
    private double lat;
    private double lng;
    private String city;
    private String country;
    private String status; // "ONLINE", "CHATTING", "IN_CALL"
    private String connectedToId;
    private String color;
    private long lastSeen;
    private Integer age = 24;
    private String gender = "MALE"; // "MALE" or "FEMALE"

    public static final String[] PALETTE = {
        "#00f0ff", // Neon Cyan
        "#ff007f", // Neon Pink
        "#10b981", // Emerald Green
        "#f59e0b", // Amber Gold
        "#a855f7", // Electric Purple
        "#3b82f6", // Royal Blue
        "#ff5722", // Neon Orange
        "#14b8a6", // Bright Teal
        "#e11d48", // Crimson Rose
        "#84cc16", // Electric Lime
        "#8b5cf6", // Violet
        "#d946ef", // Neon Magenta
        "#06b6d4", // Electric Turquoise
        "#f43f5e"  // Coral Red
    };

    public static String getColorForId(String id) {
        if (id == null || id.isEmpty()) return PALETTE[0];
        int hash = Math.abs(id.hashCode());
        return PALETTE[hash % PALETTE.length];
    }

    public User() {
        this.status = "ONLINE";
        this.lastSeen = System.currentTimeMillis();
        this.age = 24;
        this.gender = "MALE";
    }

    public User(String id, String sessionId, String name, String avatarUrl, double lat, double lng, String city, String country) {
        this.id = id;
        this.sessionId = sessionId;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.lat = lat;
        this.lng = lng;
        this.city = city != null ? city : "Unknown";
        this.country = country != null ? country : "Global";
        this.status = "ONLINE";
        this.lastSeen = System.currentTimeMillis();
        this.age = 24;
        this.gender = "MALE";
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLng() {
        return lng;
    }

    public void setLng(double lng) {
        this.lng = lng;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getConnectedToId() {
        return connectedToId;
    }

    public void setConnectedToId(String connectedToId) {
        this.connectedToId = connectedToId;
    }

    public long getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(long lastSeen) {
        this.lastSeen = lastSeen;
    }

    public String getColor() {
        if (color == null && id != null) {
            color = getColorForId(id);
        }
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getAge() {
        return age != null ? age : 24;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getGender() {
        return gender != null ? gender : "MALE";
    }

    public void setGender(String gender) {
        this.gender = gender;
    }
}
