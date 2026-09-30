package com.bako.backend.controller;

import com.bako.backend.model.User;
import com.bako.backend.security.JwtUtil;
import com.bako.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ============================================================
    //  ورود (Login)
    // ============================================================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        try {
            User user = userService.findByUsername(username).orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "نام کاربری یا رمز عبور اشتباه است."));
            }

            if (!passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("error", "نام کاربری یا رمز عبور اشتباه است."));
            }

            List<String> availableRoles = user.getAvailableRoles();
            boolean hasMultipleRoles = availableRoles != null && availableRoles.size() > 1;

            if (hasMultipleRoles) {
                Map<String, Object> response = new HashMap<>();
                response.put("requiresRoleSelection", true);
                response.put("username", user.getUsername());
                response.put("fullName", user.getFullName());
                response.put("availableRoles", availableRoles);
                response.put("defaultRole", user.getRole());
                return ResponseEntity.ok(response);
            }

            String token = jwtUtil.generateToken(user);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", user.getUsername());
            response.put("role", user.getRole());
            response.put("tenantId", user.getTenantId());
            response.put("fullName", user.getFullName());
            response.put("phone", user.getPhone());
            response.put("requiresRoleSelection", false);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "نام کاربری یا رمز عبور اشتباه است."));
        }
    }

    // ============================================================
    //  ثبت‌نام (Register)
    //  🎯 چک‌های اعتبارسنجی:
    //   - نام کاربری یکتا
    //   - شماره موبایل یکتا
    //
    //  🔴 نکته امنیتی مهم:
    //   نقش همیشه CUSTOMER است. مقدار role از request نادیده گرفته می‌شود.
    //   ارتقاء به نقش‌های دیگر فقط توسط SUPER_ADMIN از پنل خودش انجام می‌شود.
    // ============================================================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> registerRequest) {
        try {
            // ===== ۱. استخراج پارامترها =====
            String fullName = getString(registerRequest, "fullName");
            String username = getString(registerRequest, "username");
            String phone = getString(registerRequest, "phone");
            String password = getString(registerRequest, "password");
            // 🔴 خط role حذف شد — به‌عمد نادیده گرفته می‌شود

            // ===== ۲. اعتبارسنجی پایه =====
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "نام کاربری الزامی است."));
            }
            if (password == null || password.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "رمز عبور باید حداقل ۶ کاراکتر باشد."));
            }
            if (phone == null || phone.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "شماره موبایل الزامی است."));
            }

            String trimmedUsername = username.trim();
            String trimmedPhone = phone.trim();

            // ===== ۳. چک تکراری نبودن نام کاربری =====
            if (userService.findByUsername(trimmedUsername).isPresent()) {
                return ResponseEntity.status(409)
                        .body(Map.of(
                                "error", "این نام کاربری قبلاً استفاده شده است.",
                                "field", "username"
                        ));
            }

            // ============================================================
            //  ۴. چک تکراری نبودن شماره موبایل
            // ============================================================
            if (userService.existsByPhone(trimmedPhone)) {
                log.warn("⚠️ تلاش برای ثبت‌نام با شماره تکراری: {}", trimmedPhone);
                return ResponseEntity.status(409)
                        .body(Map.of(
                                "error", "این شماره موبایل قبلاً ثبت شده است. لطفاً از شماره دیگری استفاده کنید.",
                                "field", "phone"
                        ));
            }

            // ===== ۵. ساخت کاربر جدید =====
            User newUser = new User();
            newUser.setUsername(trimmedUsername);
            newUser.setPassword(password);
            newUser.setFullName(fullName != null ? fullName.trim() : "");
            newUser.setPhone(trimmedPhone);
            newUser.setEmail("");

            // 🔴🔴🔴 تغییر امنیتی اصلی: نقش همیشه CUSTOMER
            newUser.setRole("CUSTOMER");
            newUser.setAvailableRoles(List.of("CUSTOMER"));

            newUser.setEnabled(true);
            newUser.setTenantId(null);

            // ===== ۶. ذخیره =====
            User savedUser = userService.createUser(newUser);
            log.info("➕ کاربر جدید ثبت‌نام کرد: '{}' با نقش '{}' — موبایل: {}",
                    savedUser.getUsername(), savedUser.getRole(), savedUser.getPhone());

            // ===== ۷. صدور توکن (لاگین خودکار) =====
            String token = jwtUtil.generateToken(savedUser);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("id", savedUser.getId());
            response.put("username", savedUser.getUsername());
            response.put("role", savedUser.getRole());
            response.put("fullName", savedUser.getFullName());
            response.put("phone", savedUser.getPhone());
            response.put("tenantId", savedUser.getTenantId());
            response.put("message", "ثبت‌نام با موفقیت انجام شد.");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ خطا در ثبت‌نام: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(Map.of("error", "خطا در ثبت‌نام: " + e.getMessage()));
        }
    }

    // ============================================================
    //  انتخاب نقش (Select Role)
    // ============================================================
    @PostMapping("/select-role")
    public ResponseEntity<?> selectRole(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String selectedRole = request.get("role");

        if (username == null || password == null || selectedRole == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "پارامترهای ورودی ناقص هستند."));
        }

        try {
            User user = userService.findByUsername(username).orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "کاربر یافت نشد."));
            }

            if (!passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("error", "اطلاعات ورود نامعتبر است."));
            }

            List<String> availableRoles = user.getAvailableRoles();
            if (availableRoles == null || !availableRoles.contains(selectedRole)) {
                return ResponseEntity.status(403).body(Map.of("error", "شما به این نقش دسترسی ندارید."));
            }

            user.setRole(selectedRole);
            userService.updateUserRole(user.getId(), selectedRole);

            String token = jwtUtil.generateToken(user, selectedRole);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", user.getUsername());
            response.put("role", selectedRole);
            response.put("tenantId", user.getTenantId());
            response.put("fullName", user.getFullName());
            response.put("phone", user.getPhone());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "خطا در انتخاب نقش: " + e.getMessage()));
        }
    }

    // ============================================================
    //  دریافت لیست نقش‌های کاربر
    // ============================================================
    @PostMapping("/my-roles")
    public ResponseEntity<?> getMyRoles(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of("error", "کاربر لاگین نیست."));
            }
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);

            User user = userService.findByUsername(username).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("error", "کاربر یافت نشد."));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("username", user.getUsername());
            response.put("currentRole", user.getRole());
            response.put("availableRoles", user.getAvailableRoles());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ============================================================
    //  🎯 متد کمکی — استخراج رشته از Map
    // ============================================================
    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }
}