package com.earthchat.service;

import com.earthchat.model.ConnectionLink;
import com.earthchat.model.User;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserManager {

    private final Map<String, User> usersById = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToUserId = new ConcurrentHashMap<>();
    private final Map<String, ConnectionLink> activeLinks = new ConcurrentHashMap<>();

    public User registerUser(User user, String sessionId) {
        if (user.getId() == null || user.getId().trim().isEmpty()) {
            user.setId(UUID.randomUUID().toString());
        }
        user.setSessionId(sessionId);
        user.setLastSeen(System.currentTimeMillis());
        user.setStatus("ONLINE");

        usersById.put(user.getId(), user);
        if (sessionId != null) {
            sessionToUserId.put(sessionId, user.getId());
        }
        return user;
    }

    public User updateLocation(String userId, double lat, double lng, String city, String country) {
        User user = usersById.get(userId);
        if (user != null) {
            user.setLat(lat);
            user.setLng(lng);
            if (city != null && !city.isEmpty()) {
                user.setCity(city);
            }
            if (country != null && !country.isEmpty()) {
                user.setCountry(country);
            }
            user.setLastSeen(System.currentTimeMillis());

            // Also update any active connection links involving this user
            for (ConnectionLink link : activeLinks.values()) {
                if (link.getUser1Id().equals(userId)) {
                    link.setUser1Lat(lat);
                    link.setUser1Lng(lng);
                } else if (link.getUser2Id().equals(userId)) {
                    link.setUser2Lat(lat);
                    link.setUser2Lng(lng);
                }
                if (link.isLoveLink()) {
                    if (userId.equals(link.getMaleUserId())) {
                        link.setMaleLat(lat);
                        link.setMaleLng(lng);
                    } else if (userId.equals(link.getFemaleUserId())) {
                        link.setFemaleLat(lat);
                        link.setFemaleLng(lng);
                    }
                }
            }
        }
        return user;
    }

    public User updateProfile(String userId, String name, Integer age, String gender, String avatarUrl) {
        User user = usersById.get(userId);
        if (user != null) {
            if (name != null && !name.trim().isEmpty()) user.setName(name.trim());
            if (age != null) user.setAge(age);
            if (gender != null && !gender.trim().isEmpty()) user.setGender(gender.trim().toUpperCase());
            if (avatarUrl != null && !avatarUrl.trim().isEmpty()) user.setAvatarUrl(avatarUrl.trim());
            user.setLastSeen(System.currentTimeMillis());

            // Synchronize active connection links if gender or details changed
            for (ConnectionLink link : activeLinks.values()) {
                if (link.getUser1Id().equals(userId)) {
                    link.setUser1Gender(user.getGender());
                    link.setUser1Name(user.getName());
                } else if (link.getUser2Id().equals(userId)) {
                    link.setUser2Gender(user.getGender());
                    link.setUser2Name(user.getName());
                }
                User u1 = usersById.get(link.getUser1Id());
                User u2 = usersById.get(link.getUser2Id());
                if (u1 != null && u2 != null) {
                    boolean u1Male = "MALE".equalsIgnoreCase(u1.getGender());
                    boolean u2Male = "MALE".equalsIgnoreCase(u2.getGender());
                    boolean u1Female = "FEMALE".equalsIgnoreCase(u1.getGender());
                    boolean u2Female = "FEMALE".equalsIgnoreCase(u2.getGender());
                    if (u1Male && u2Female) {
                        link.setLoveLink(true);
                        link.setMaleUserId(u1.getId());
                        link.setMaleLat(u1.getLat());
                        link.setMaleLng(u1.getLng());
                        link.setFemaleUserId(u2.getId());
                        link.setFemaleLat(u2.getLat());
                        link.setFemaleLng(u2.getLng());
                        link.setColor("#ff007f");
                    } else if (u2Male && u1Female) {
                        link.setLoveLink(true);
                        link.setMaleUserId(u2.getId());
                        link.setMaleLat(u2.getLat());
                        link.setMaleLng(u2.getLng());
                        link.setFemaleUserId(u1.getId());
                        link.setFemaleLat(u1.getLat());
                        link.setFemaleLng(u1.getLng());
                        link.setColor("#ff007f");
                    } else {
                        link.setLoveLink(false);
                    }
                }
            }
        }
        return user;
    }

    public User getUser(String userId) {
        return usersById.get(userId);
    }

    public User getUserBySessionId(String sessionId) {
        String userId = sessionToUserId.get(sessionId);
        return userId != null ? usersById.get(userId) : null;
    }

    public Collection<User> getAllUsers() {
        return Collections.unmodifiableCollection(usersById.values());
    }

    public User removeBySessionId(String sessionId) {
        String userId = sessionToUserId.remove(sessionId);
        if (userId != null) {
            removeUserLinks(userId);
            return usersById.remove(userId);
        }
        return null;
    }

    public User removeUser(String userId) {
        if (userId == null) return null;
        removeUserLinks(userId);
        User user = usersById.remove(userId);
        if (user != null && user.getSessionId() != null) {
            sessionToUserId.remove(user.getSessionId());
        }
        return user;
    }

    public ConnectionLink createLink(String user1Id, String user2Id, String type) {
        User u1 = usersById.get(user1Id);
        User u2 = usersById.get(user2Id);
        if (u1 == null || u2 == null) {
            return null;
        }

        ConnectionLink link = new ConnectionLink(u1, u2, type);
        activeLinks.put(link.getId(), link);

        // Update users state
        if ("VIDEO".equalsIgnoreCase(type)) {
            u1.setStatus("IN_CALL");
            u2.setStatus("IN_CALL");
            u1.setConnectedToId(u2.getId());
            u2.setConnectedToId(u1.getId());
        } else if ("CHAT".equalsIgnoreCase(type)) {
            if (!"IN_CALL".equals(u1.getStatus())) u1.setStatus("CHATTING");
            if (!"IN_CALL".equals(u2.getStatus())) u2.setStatus("CHATTING");
        }

        return link;
    }

    public ConnectionLink removeLink(String user1Id, String user2Id) {
        if (user1Id == null || user2Id == null) return null;
        String linkId1 = user1Id + "_" + user2Id;
        String linkId2 = user2Id + "_" + user1Id;

        ConnectionLink link = activeLinks.remove(linkId1);
        if (link == null) {
            link = activeLinks.remove(linkId2);
        }

        User u1 = usersById.get(user1Id);
        User u2 = usersById.get(user2Id);

        if (u1 != null && Objects.equals(u1.getConnectedToId(), user2Id)) {
            u1.setStatus("ONLINE");
            u1.setConnectedToId(null);
        }
        if (u2 != null && Objects.equals(u2.getConnectedToId(), user1Id)) {
            u2.setStatus("ONLINE");
            u2.setConnectedToId(null);
        }

        return link;
    }

    public List<ConnectionLink> removeUserLinks(String userId) {
        List<ConnectionLink> removed = new ArrayList<>();
        Iterator<Map.Entry<String, ConnectionLink>> it = activeLinks.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, ConnectionLink> entry = it.next();
            ConnectionLink link = entry.getValue();
            if (link.getUser1Id().equals(userId) || link.getUser2Id().equals(userId)) {
                it.remove();
                removed.add(link);

                // Reset other user's status if they were in a call
                String otherUserId = link.getUser1Id().equals(userId) ? link.getUser2Id() : link.getUser1Id();
                User otherUser = usersById.get(otherUserId);
                if (otherUser != null && Objects.equals(otherUser.getConnectedToId(), userId)) {
                    otherUser.setStatus("ONLINE");
                    otherUser.setConnectedToId(null);
                }
            }
        }
        return removed;
    }

    public Collection<ConnectionLink> getAllLinks() {
        return Collections.unmodifiableCollection(activeLinks.values());
    }

    public void setUserStatus(String userId, String status) {
        User user = usersById.get(userId);
        if (user != null) {
            user.setStatus(status);
        }
    }
}
