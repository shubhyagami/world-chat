package com.earthchat.model;

public class LocationUpdate {
    private String userId;
    private double lat;
    private double lng;
    private String city;
    private String country;

    public LocationUpdate() {
    }

    public LocationUpdate(String userId, double lat, double lng, String city, String country) {
        this.userId = userId;
        this.lat = lat;
        this.lng = lng;
        this.city = city;
        this.country = country;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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
}
