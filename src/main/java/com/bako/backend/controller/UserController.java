package com.bako.backend.controller;

import com.bako.backend.model.User;
import com.bako.backend.service.UserService;
import com.bako.backend.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Value("${app.test.tenant-id:BAKERY_1}")
    private String defaultTenantId;

    // ===== متد کمکی برای دریافت tenantId =====
    private String getCurrentTenantId() {
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (tenantId == null) {
            log.warn("⚠️ هیچ کاربری لاگین نیست. از tenantId پیش‌فرض '{}' استفاده می‌شود.", defaultTenantId);
            return defaultTenantId;
        }
        return tenantId;
    }

    // ===== متد کمکی برای دریافت userId =====
    private String getCurrentUserId() {
        return SecurityUtils.getCurrentUserId();
    }

    // ==========================================
    //  ۱. دریافت لیست کاربران (همه نقش‌ها) - GET
    // ==========================================
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        String tenantId = getCurrentTenantId();
        List<User> users = userService.getAllUsers(tenantId);
        log.info("📋 {} کاربر برای نانوایی {} دریافت شد.", users.size(), tenantId);
        return ResponseEntity.ok(users);
    }

    // ============================================================
    //  🆕 دریافت پروفایل کاربر جاری — GET /api/users/me
    //  ⚠️ این متد باید بالای /{id} باشد
    // ============================================================
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUserProfile() {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userService.getCurrentUserProfile(userId);
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    // ============================================================
    //  🆕 به‌روزرسانی پروفایل کاربر جاری — PUT /api/users/me
    // ============================================================
    @PutMapping("/me")
    public ResponseEntity<User> updateCurrentUserProfile(
            @RequestBody Map<String, Object> body) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User updated = userService.updateCurrentUserProfile(userId, body);
        updated.setPassword(null);
        return ResponseEntity.ok(updated);
    }

    // ==========================================
    //  ۲. دریافت یک کاربر با ID - GET
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        User user = userService.getUserById(id, tenantId);
        return ResponseEntity.ok(user);
    }

    // ==========================================
    //  ۳. ایجاد کاربر جدید - POST
    // ==========================================
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        String tenantId = getCurrentTenantId();
        user.setTenantId(tenantId);
        User saved = userService.createUser(user);
        log.info("➕ کاربر جدید '{}' در نانوایی {} ایجاد شد.", saved.getUsername(), tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ==========================================
    //  ۴. ویرایش کاربر - PUT
    // ==========================================
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable String id,
            @RequestBody User user) {
        String tenantId = getCurrentTenantId();

        if (!tenantId.equals(user.getTenantId())) {
            log.warn("تلاش برای ویرایش کاربر با tenantId متفاوت: {}", user.getTenantId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            User existing = userService.getUserById(id, tenantId);
            user.setPassword(existing.getPassword());
            log.info("🔑 رمز عبور برای کاربر {} از دیتابیس حفظ شد.", id);
        }

        User updated = userService.updateUser(id, user, tenantId);
        log.info("✏️ کاربر با شناسه {} در نانوایی {} به‌روزرسانی شد.", id, tenantId);
        return ResponseEntity.ok(updated);
    }

    // ==========================================
    //  ۵. حذف کاربر - DELETE
    // ==========================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        userService.deleteUser(id, tenantId);
        log.info("🗑️ کاربر با شناسه {} از نانوایی {} حذف شد.", id, tenantId);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    //  ۶. غیرفعال کردن کاربر - PATCH
    // ==========================================
    @PatchMapping("/{id}/disable")
    public ResponseEntity<User> disableUser(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        User updated = userService.disableUser(id, tenantId);
        log.info("⛔ کاربر با شناسه {} در نانوایی {} غیرفعال شد.", id, tenantId);
        return ResponseEntity.ok(updated);
    }

    // ==========================================
    //  ۷. فعال کردن کاربر - PATCH
    // ==========================================
    @PatchMapping("/{id}/enable")
    public ResponseEntity<User> enableUser(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        User updated = userService.enableUser(id, tenantId);
        log.info("✅ کاربر با شناسه {} در نانوایی {} فعال شد.", id, tenantId);
        return ResponseEntity.ok(updated);
    }
}