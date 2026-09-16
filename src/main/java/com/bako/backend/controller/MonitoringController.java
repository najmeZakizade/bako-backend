package com.bako.backend.controller;

import com.bako.backend.service.MonitoringService;
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
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final MonitoringService monitoringService;

    // ============================================================
    //  🔒 چک دستی نقش MONITOR یا SUPER_ADMIN
    // ============================================================
    private boolean hasAccess() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_MONITOR".equals(a.getAuthority())
                        || "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403)
                .body(Map.of("error", "دسترسی فقط برای ناظر یا سوپر ادمین مجاز است"));
    }

    // ============================================================
    //  📊 داشبورد
    // ============================================================
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getDashboardStats());
    }

    @GetMapping("/dashboard/revenue-timeline")
    public ResponseEntity<?> getRevenueTimeline(
            @RequestParam(defaultValue = "7") int days) {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getDailyRevenueTimeline(days));
    }

    @GetMapping("/dashboard/top-tenants")
    public ResponseEntity<?> getTopTenants(
            @RequestParam(defaultValue = "5") int limit) {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getTopTenants(limit));
    }

    // ============================================================
    //  📊 گزارشات
    // ============================================================
    @GetMapping("/reports/revenue-by-tenant")
    public ResponseEntity<?> getRevenueByTenant() {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getRevenueByTenant());
    }

    @GetMapping("/reports/top-products")
    public ResponseEntity<?> getTopProducts(
            @RequestParam(defaultValue = "10") int limit) {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getTopProducts(limit));
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
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService
                .getTransactions(tenantId, paymentStatus, page, size));
    }

    // ============================================================
    //  🔔 هشدارها
    // ============================================================
    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        if (!hasAccess()) return forbidden();
        return ResponseEntity.ok(monitoringService.getAlerts());
    }
}