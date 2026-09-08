package com.earthchat.model;

import java.util.Objects;

public class ConnectionLink {
    private String id;
    private String user1Id;
    private String user2Id;
    private String user1Name;
    private String user2Name;
    private double user1Lat;
    private double user1Lng;
    private double user2Lat;
    private double user2Lng;
    private String type; // "CHAT", "VIDEO"
    private String color;
    private long timestamp;
    private String user1Gender;
    private String user2Gender;
    private boolean isLoveLink;
    private String maleUserId;
    private String femaleUserId;
    private double maleLat;
    private double maleLng;
    private double femaleLat;
    private double femaleLng;

    public ConnectionLink() {
        this.timestamp = System.currentTimeMillis();
    }

    public ConnectionLink(User u1, User u2, String type) {
        // Deterministic ID regardless of order
        if (u1.getId().compareTo(u2.getId()) <= 0) {
            this.id = u1.getId() + "_" + u2.getId();
            this.user1Id = u1.getId();
            this.user1Name = u1.getName();
            this.user1Lat = u1.getLat();
            this.user1Lng = u1.getLng();
            this.user1Gender = u1.getGender();

            this.user2Id = u2.getId();
            this.user2Name = u2.getName();
            this.user2Lat = u2.getLat();
            this.user2Lng = u2.getLng();
            this.user2Gender = u2.getGender();
        } else {
            this.id = u2.getId() + "_" + u1.getId();
            this.user1Id = u2.getId();
            this.user1Name = u2.getName();
            this.user1Lat = u2.getLat();
            this.user1Lng = u2.getLng();
            this.user1Gender = u2.getGender();

            this.user2Id = u1.getId();
            this.user2Name = u1.getName();
            this.user2Lat = u1.getLat();
            this.user2Lng = u1.getLng();
            this.user2Gender = u1.getGender();
        }
        this.type = type;

        boolean u1IsMale = "MALE".equalsIgnoreCase(u1.getGender());
        boolean u2IsMale = "MALE".equalsIgnoreCase(u2.getGender());
        boolean u1IsFemale = "FEMALE".equalsIgnoreCase(u1.getGender());
        boolean u2IsFemale = "FEMALE".equalsIgnoreCase(u2.getGender());

        if (u1IsMale && u2IsFemale) {
            this.isLoveLink = true;
            this.maleUserId = u1.getId();
            this.maleLat = u1.getLat();
            this.maleLng = u1.getLng();
            this.femaleUserId = u2.getId();
            this.femaleLat = u2.getLat();
            this.femaleLng = u2.getLng();
            this.color = "#ff007f"; // Radiant Love Pink
        } else if (u2IsMale && u1IsFemale) {
            this.isLoveLink = true;
            this.maleUserId = u2.getId();
            this.maleLat = u2.getLat();
            this.maleLng = u2.getLng();
            this.femaleUserId = u1.getId();
            this.femaleLat = u1.getLat();
            this.femaleLng = u1.getLng();
            this.color = "#ff007f"; // Radiant Love Pink
        } else {
            this.isLoveLink = false;
            // Assign a distinct, vibrant color for this specific pair of users
            int hash = Math.abs(this.id.hashCode());
            this.color = User.PALETTE[hash % User.PALETTE.length];
        }

        this.timestamp = System.currentTimeMillis();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUser1Id() {
        return user1Id;
    }

    public void setUser1Id(String user1Id) {
        this.user1Id = user1Id;
    }

    public String getUser2Id() {
        return user2Id;
    }

    public void setUser2Id(String user2Id) {
        this.user2Id = user2Id;
    }

    public String getUser1Name() {
        return user1Name;
    }

    public void setUser1Name(String user1Name) {
        this.user1Name = user1Name;
    }

    public String getUser2Name() {
        return user2Name;
    }

    public void setUser2Name(String user2Name) {
        this.user2Name = user2Name;
    }

    public double getUser1Lat() {
        return user1Lat;
    }

    public void setUser1Lat(double user1Lat) {
        this.user1Lat = user1Lat;
    }

    public double getUser1Lng() {
        return user1Lng;
    }

    public void setUser1Lng(double user1Lng) {
        this.user1Lng = user1Lng;
    }

    public double getUser2Lat() {
        return user2Lat;
    }

    public void setUser2Lat(double user2Lat) {
        this.user2Lat = user2Lat;
    }

    public double getUser2Lng() {
        return user2Lng;
    }

    public void setUser2Lng(double user2Lng) {
        this.user2Lng = user2Lng;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getUser1Gender() {
        return user1Gender;
    }

    public void setUser1Gender(String user1Gender) {
        this.user1Gender = user1Gender;
    }

    public String getUser2Gender() {
        return user2Gender;
    }

    public void setUser2Gender(String user2Gender) {
        this.user2Gender = user2Gender;
    }

    public boolean isLoveLink() {
        return isLoveLink;
    }

    public void setLoveLink(boolean loveLink) {
        isLoveLink = loveLink;
    }

    public String getMaleUserId() {
        return maleUserId;
    }

    public void setMaleUserId(String maleUserId) {
        this.maleUserId = maleUserId;
    }

    public String getFemaleUserId() {
        return femaleUserId;
    }

    public void setFemaleUserId(String femaleUserId) {
        this.femaleUserId = femaleUserId;
    }

    public double getMaleLat() {
        return maleLat;
    }

    public void setMaleLat(double maleLat) {
        this.maleLat = maleLat;
    }

    public double getMaleLng() {
        return maleLng;
    }

    public void setMaleLng(double maleLng) {
        this.maleLng = maleLng;
    }

    public double getFemaleLat() {
        return femaleLat;
    }

    public void setFemaleLat(double femaleLat) {
        this.femaleLat = femaleLat;
    }

    public double getFemaleLng() {
        return femaleLng;
    }

    public void setFemaleLng(double femaleLng) {
        this.femaleLng = femaleLng;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ConnectionLink that = (ConnectionLink) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
