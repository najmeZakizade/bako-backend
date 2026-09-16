package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Notification;
import com.bako.backend.model.User;
import com.bako.backend.service.NotificationService;
import com.bako.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // ============================================================
    //  تشخیص گیرنده از کاربر لاگین‌شده
    //  - CUSTOMER → phone
    //  - BAKERY_OWNER / STAFF → tenantId
    // ============================================================
    private Map<String, String> resolveRecipient() {
        User user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new ResourceNotFoundException("کاربر لاگین نیست.");
        }

        Map<String, String> result = new HashMap<>();
        String role = user.getRole();

        if ("CUSTOMER".equals(role)) {
            result.put("type", "CUSTOMER");
            result.put("id", user.getPhone() != null ? user.getPhone() : "");
        } else {
            result.put("type", "BAKERY");
            result.put("id", user.getTenantId() != null ? user.getTenantId() : "");
        }
        return result;
    }

    // ============================================================
    //  GET /api/notifications
    //  لیست اعلان‌های کاربر جاری
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications() {
        Map<String, String> r = resolveRecipient();
        List<Notification> list = notificationService.getNotifications(
                r.get("type"), r.get("id"));
        return ResponseEntity.ok(list);
    }

    // ============================================================
    //  GET /api/notifications/unread-count
    // ============================================================
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        Map<String, String> r = resolveRecipient();
        long count = notificationService.getUnreadCount(
                r.get("type"), r.get("id"));
        Map<String, Object> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    // ============================================================
    //  PATCH /api/notifications/{id}/read
    // ============================================================
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        Notification n = notificationService.markAsRead(id);
        return ResponseEntity.ok(n);
    }

    // ============================================================
    //  PATCH /api/notifications/read-all
    // ============================================================
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {
        Map<String, String> r = resolveRecipient();
        int updated = notificationService.markAllAsRead(
                r.get("type"), r.get("id"));
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("updated", updated);
        return ResponseEntity.ok(response);
    }
}