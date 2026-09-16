package com.bako.backend.security;

import com.bako.backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private static final long EXPIRATION_TIME = 86400000; // 24 ساعت

    // ============================================================
    //  تولید توکن با نقش پیش‌فرض کاربر (سازگار با کد قبلی)
    // ============================================================
    public String generateToken(User user) {
        return generateToken(user, user.getRole());
    }

    // ============================================================
    //  تولید توکن با نقش انتخاب‌شده (برای کاربران چند-نقشی)
    // ============================================================
    public String generateToken(User user, String selectedRole) {
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", selectedRole)
                .claim("tenantId", user.getTenantId())
                .claim("userId", user.getId())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    // ============================================================
    //  استخراج نام کاربری از توکن
    // ============================================================
    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // ============================================================
    //  استخراج نقش (role) از توکن
    // ============================================================
    public String extractRole(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }

    // ============================================================
    //  استخراج tenantId از توکن
    // ============================================================
    public String extractTenantId(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("tenantId", String.class);
    }

    // ============================================================
    //  استخراج userId از توکن
    // ============================================================
    public String extractUserId(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("userId", String.class);
    }

    // ============================================================
    //  بررسی اعتبار توکن
    // ============================================================
    public boolean isTokenValid(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}