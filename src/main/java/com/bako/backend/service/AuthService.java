package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.User;
import com.bako.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * ورود کاربر
     * - اگر یک نقش داشته باشد: توکن صادر می‌شود
     * - اگر چند نقش داشته باشد: لیست نقش‌ها برای انتخاب برگردانده می‌شود
     */
    public Map<String, Object> login(String username, String password) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("نام کاربری یا رمز عبور اشتباه است."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResourceNotFoundException("نام کاربری یا رمز عبور اشتباه است.");
        }

        List<String> availableRoles = user.getAvailableRoles();
        boolean hasMultipleRoles = availableRoles != null && availableRoles.size() > 1;

        Map<String, Object> response = new HashMap<>();

        if (hasMultipleRoles) {
            // نیاز به انتخاب نقش
            response.put("requiresRoleSelection", true);
            response.put("username", user.getUsername());
            response.put("fullName", user.getFullName());
            response.put("availableRoles", availableRoles);
            response.put("defaultRole", user.getRole());
            log.info("🎭 کاربر {} با {} نقش وارد شد - نیاز به انتخاب پنل", username, availableRoles.size());
            return response;
        }

        // یک نقش دارد - توکن صادر کن
        String token = jwtUtil.generateToken(user);
        response.put("token", token);
        response.put("username", user.getUsername());
        response.put("role", user.getRole());
        response.put("tenantId", user.getTenantId());
        response.put("fullName", user.getFullName());
        response.put("requiresRoleSelection", false);
        log.info("✅ کاربر {} با نقش {} وارد شد", username, user.getRole());
        return response;
    }

    /**
     * انتخاب نقش و صدور توکن جدید
     */
    public Map<String, Object> selectRole(String username, String password, String selectedRole) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResourceNotFoundException("اطلاعات ورود نامعتبر است.");
        }

        List<String> availableRoles = user.getAvailableRoles();
        if (availableRoles == null || !availableRoles.contains(selectedRole)) {
            throw new ResourceNotFoundException("شما به این نقش دسترسی ندارید.");
        }

        // به‌روزرسانی نقش فعلی (اختیاری)
        userService.updateUserRole(user.getId(), selectedRole);

        // صدور توکن با نقش انتخاب‌شده
        String token = jwtUtil.generateToken(user, selectedRole);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("username", user.getUsername());
        response.put("role", selectedRole);
        response.put("tenantId", user.getTenantId());
        response.put("fullName", user.getFullName());
        log.info("🎯 نقش {} برای کاربر {} انتخاب شد", selectedRole, username);
        return response;
    }

    /**
     * دریافت لیست نقش‌های کاربر (برای دکمه «تغییر پنل»)
     */
    public Map<String, Object> getMyRoles(String username) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("currentRole", user.getRole());
        response.put("availableRoles", user.getAvailableRoles());
        return response;
    }
}