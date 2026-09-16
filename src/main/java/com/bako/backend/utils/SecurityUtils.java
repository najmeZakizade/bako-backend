package com.bako.backend.utils;

import com.bako.backend.model.User;
import com.bako.backend.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Slf4j
public class SecurityUtils {

    // ============================================================
    //  دریافت UserRepository از SpringContextHolder
    // ============================================================
    private static UserRepository getUserRepository() {
        return SpringContextHolder.getBean(UserRepository.class);
    }

    // ============================================================
    //  🎯 دریافت شناسه کاربر جاری
    //  - فقط از userId (نه username)
    //  - اگه کاربر لاگین نکرده یا پیدا نشه → null برمی‌گردونه
    //  - ⚠️ هیچ fallback به username نداریم تا سبدها قاطی نشن
    // ============================================================
    public static String getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder
                    .getContext()
                    .getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                log.debug("ℹ️ کاربر لاگین نیست (Authentication null یا غیرمعتبر).");
                return null;
            }

            String username = authentication.getName();
            if (username == null
                    || username.isEmpty()
                    || "anonymousUser".equals(username)) {
                log.debug("ℹ️ نام کاربری نامعتبر: '{}'", username);
                return null;
            }

            UserRepository userRepository = getUserRepository();
            if (userRepository != null) {
                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null && user.getId() != null) {
                    log.debug("👤 userId از دیتابیس: {}", user.getId());
                    return user.getId();
                }
            }

            // 🎯 دیگه به username fallback نمی‌کنیم
            // اگه کاربر پیدا نشد، null برمی‌گردونیم تا بالادست تصمیم بگیره
            log.warn("⚠️ کاربر '{}' در دیتابیس پیدا نشد.", username);
            return null;

        } catch (Exception e) {
            log.warn("⚠️ خطا در دریافت userId: {}", e.getMessage());
            return null;
        }
    }

    // ============================================================
    //  دریافت tenantId کاربر جاری
    // ============================================================
    public static String getCurrentTenantId() {
        log.debug("🔍 متد getCurrentTenantId فراخوانی شد.");

        // ۱. دریافت Authentication
        Authentication authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null) {
            log.warn("❌ Authentication در SecurityContext وجود ندارد.");
            return null;
        }

        if (!authentication.isAuthenticated()) {
            log.warn("❌ Authentication معتبر نیست.");
            return null;
        }

        // ۲. استخراج username
        String username = authentication.getName();
        if (username == null
                || username.isEmpty()
                || "anonymousUser".equals(username)) {
            log.warn("❌ نام کاربری نامعتبر: '{}'", username);
            return null;
        }

        log.debug("👤 نام کاربری استخراج‌شده از Authentication: '{}'", username);

        // ۳. جستجوی کاربر در دیتابیس
        UserRepository userRepository = getUserRepository();
        if (userRepository == null) {
            log.error("❌ UserRepository در SpringContext یافت نشد.");
            return null;
        }

        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                log.warn("❌ کاربر با نام '{}' در دیتابیس یافت نشد.", username);
                return null;
            }

            String tenantId = user.getTenantId();
            if (tenantId == null || tenantId.isEmpty()) {
                log.warn("⚠️ کاربر '{}' در دیتابیس tenantId ندارد.", username);
                return null;
            }

            log.debug(
                    "✅ tenantId برای کاربر '{}' از دیتابیس دریافت شد: {}",
                    username,
                    tenantId
            );
            return tenantId;

        } catch (Exception e) {
            log.error(
                    "❌ خطا در دریافت tenantId از دیتابیس: {}",
                    e.getMessage(),
                    e
            );
            return null;
        }
    }

    // ============================================================
    //  دریافت کاربر جاری
    // ============================================================
    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String username = authentication.getName();
        UserRepository userRepository = getUserRepository();
        if (userRepository == null) return null;

        return userRepository.findByUsername(username).orElse(null);
    }
}