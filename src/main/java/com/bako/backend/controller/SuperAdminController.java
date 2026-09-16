package com.bako.backend.controller;

import com.bako.backend.service.SuperAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/super-admin")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    private boolean isSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403)
                .body(Map.of("error", "دسترسی فقط برای سوپر ادمین مجاز است"));
    }

    // ============================================================
    //  🔬 DEBUG
    // ============================================================
    @GetMapping("/debug/whoami")
    public ResponseEntity<?> whoAmI() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(Map.of(
                "name", auth != null ? auth.getName() : "null",
                "authenticated", auth != null && auth.isAuthenticated(),
                "authorities", auth != null ? auth.getAuthorities() : List.of(),
                "isSuperAdmin", isSuperAdmin()));
    }

    @GetMapping("/debug/db")
    public ResponseEntity<?> debugDb() {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getDebugInfo());
    }

    // ============================================================
    //  📊 داشبورد
    // ============================================================
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getDashboardStats());
    }

    @GetMapping("/dashboard/revenue-timeline")
    public ResponseEntity<?> getRevenueTimeline(
            @RequestParam(defaultValue = "7") int days) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getDailyRevenueTimeline(days));
    }

    @GetMapping("/dashboard/top-tenants")
    public ResponseEntity<?> getTopTenants(
            @RequestParam(defaultValue = "5") int limit) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getTopTenants(limit));
    }

    // ============================================================
    //  📊 گزارشات
    // ============================================================
    @GetMapping("/reports/revenue-by-tenant")
    public ResponseEntity<?> getRevenueByTenant() {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getRevenueByTenant());
    }

    @GetMapping("/reports/top-products")
    public ResponseEntity<?> getTopProducts(
            @RequestParam(defaultValue = "10") int limit) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.getTopProducts(limit));
    }

    // ============================================================
    //  👥 کاربران
    // ============================================================
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) Boolean enabled) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService
                .getAllUsersFiltered(search, role, tenantId, enabled));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        if (!isSuperAdmin()) return forbidden();
        String role = body.get("role");
        if (role == null || role.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "نقش جدید الزامی است"));
        }
        return ResponseEntity.ok(superAdminService.updateUserRole(id, role));
    }

    @PatchMapping("/users/{id}/tenant")
    public ResponseEntity<?> updateUserTenant(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService.updateUserTenant(id, body.get("tenantId")));
    }

    @PatchMapping("/users/{id}/enabled")
    public ResponseEntity<?> toggleUserEnabled(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        if (!isSuperAdmin()) return forbidden();
        Object enabledObj = body.get("enabled");
        if (!(enabledObj instanceof Boolean)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "مقدار enabled باید Boolean باشد"));
        }
        return ResponseEntity.ok(
                superAdminService.toggleUserEnabled(id, (Boolean) enabledObj));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        if (!isSuperAdmin()) return forbidden();
        superAdminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    //  🏪 ویرایش نانوایی (فقط ۵ فیلد)
    // ============================================================
    @PutMapping("/tenants/{id}")
    public ResponseEntity<?> updateTenant(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        if (!isSuperAdmin()) return forbidden();
        log.info("✏️ درخواست ویرایش نانوایی: {}", id);
        return ResponseEntity.ok(superAdminService.updateTenant(id, body));
    }

    // ============================================================
    //  💰 تراکنش‌ها
    // ============================================================
    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!isSuperAdmin()) return forbidden();
        return ResponseEntity.ok(superAdminService
                .getAllTransactions(tenantId, paymentStatus, page, size));
    }
}