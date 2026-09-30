package com.bako.backend.controller;

import com.bako.backend.utils.SecurityUtils;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * کنترلر دیباگ — فقط برای محیط توسعه
 *
 * ⚠️ امنیت:
 *   ۱. @Profile("dev")  → این کلاس فقط وقتی پروفایل فعال "dev" باشه load می‌شه
 *      یعنی تو production (spring.profiles.active=prod) این کلاس اصلاً وجود نداره
 *   ۲. @PreAuthorize     → لایه دوم امنیت، فقط SUPER_ADMIN دسترسی داره
 *      (حتی اگه یه روزی @Profile رو اشتباهی برداشتیم، بازم محافظت‌شده‌ست)
 */
@RestController
@RequestMapping("/api/debug")
@Profile("dev")                                      // ⭐️ اضافه شد
@PreAuthorize("hasRole('SUPER_ADMIN')")              // ⭐️ اضافه شد
public class DebugController {

    @GetMapping("/tenant")
    public ResponseEntity<Map<String, Object>> getTenant() {
        Map<String, Object> result = new HashMap<>();
        try {
            String tenantId = SecurityUtils.getCurrentTenantId();
            result.put("tenantId", tenantId);
            result.put("status", tenantId != null ? "OK" : "FAIL");
            result.put("message", tenantId != null ? "tenantId دریافت شد." : "tenantId دریافت نشد.");
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", e.getMessage());
        }
        return ResponseEntity.ok(result);
    }
}