package com.bako.backend.security;

import com.bako.backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

/**
 * ابزار کار با JWT
 *
 * تغییر نسبت به نسخه قبلی:
 *   - کلید دیگر static final نیست؛ از application.properties خونده می‌شه
 *   - یعنی بین restart های سرور، توکن‌ها معتبر می‌مونن
 *   - امکان استفاده از کلید متفاوت برای dev/prod
 */
@Slf4j
@Component
public class JwtUtil {

    /**
     * کلید امضای JWT — از application.properties خونده می‌شه (jwt.secret)
     */
    @Value("${jwt.secret}")
    private String secret;

    /**
     * مدت اعتبار توکن به میلی‌ثانیه — از application.properties (jwt.expiration)
     */
    @Value("${jwt.expiration:86400000}")
    private long expirationMs;

    /**
     * این فیلد بعد از تزریق @Value ساخته می‌شه
     */
    private Key signingKey;

    /**
     * بعد از اینکه Spring مقادیر @Value رو تزریق کرد، کلید رو می‌سازیم
     * و اعتبار secret رو چک می‌کنیم
     */
    @PostConstruct
    public void init() {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException(
                    "jwt.secret در application.properties تنظیم نشده است."
            );
        }

        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);

        // برای HS256، کلید باید حداقل ۳۲ بایت (۲۵۶ بیت) باشه
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "jwt.secret باید حداقل ۳۲ کاراکتر باشه (طول فعلی: " + keyBytes.length + ")"
            );
        }

        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        log.info("✅ JwtUtil با موفقیت مقداردهی شد (کلید: {}...، انقضا: {} ساعت)",
                maskSecret(secret), expirationMs / 3600_000);
    }

    // ============================================================
    //  تولید توکن
    // ============================================================
    public String generateToken(User user) {
        return generateToken(user, user.getRole());
    }

    public String generateToken(User user, String selectedRole) {
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", selectedRole)
                .claim("tenantId", user.getTenantId())
                .claim("userId", user.getId())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // ============================================================
    //  استخراج اطلاعات از توکن
    // ============================================================
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String extractTenantId(String token) {
        return parseClaims(token).get("tenantId", String.class);
    }

    public String extractUserId(String token) {
        return parseClaims(token).get("userId", String.class);
    }

    // ============================================================
    //  اعتبارسنجی توکن
    // ============================================================
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ============================================================
    //  متد کمکی — parse کردن claims
    // ============================================================
    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // ============================================================
    //  مخفی کردن secret در لاگ (امنیت)
    // ============================================================
    private String maskSecret(String s) {
        if (s == null || s.length() < 8) return "***";
        return s.substring(0, 4) + "..." + s.substring(s.length() - 4);
    }
}