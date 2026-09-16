package com.bako.backend.controller;

import com.bako.backend.model.Courier;
import com.bako.backend.service.CourierService;
import com.bako.backend.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/couriers")
@RequiredArgsConstructor
public class CourierController {

    private final CourierService courierService;

    @Value("${app.test.tenant-id:BAKERY_1}")
    private String defaultTenantId;

    private String getCurrentTenantId() {
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (tenantId == null) {
            log.warn("⚠️ هیچ کاربری لاگین نیست. از tenantId پیش‌فرض '{}' استفاده می‌شود.", defaultTenantId);
            return defaultTenantId;
        }
        return tenantId;
    }

    // ==========================================
    //  ۱. دریافت لیست پیک‌ها
    // ==========================================
    @GetMapping
    public ResponseEntity<List<Courier>> getAllCouriers() {
        String tenantId = getCurrentTenantId();
        List<Courier> couriers = courierService.getAllCouriers(tenantId);
        log.info("📋 {} پیک برای نانوایی {} دریافت شد.", couriers.size(), tenantId);
        return ResponseEntity.ok(couriers);
    }

    // ==========================================
    //  ۲. دریافت یک پیک
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<Courier> getCourierById(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        return ResponseEntity.ok(courierService.getCourierById(id, tenantId));
    }

    // ==========================================
    //  ۳. ایجاد پیک جدید
    // ==========================================
    @PostMapping
    public ResponseEntity<Courier> createCourier(@Valid @RequestBody Courier courier) {
        String tenantId = getCurrentTenantId();
        courier.setTenantId(tenantId);
        Courier saved = courierService.createCourier(courier);
        log.info("➕ پیک جدید '{}' در نانوایی {} ایجاد شد.", saved.getFullName(), tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ==========================================
    //  ۴. ویرایش پیک
    // ==========================================
    @PutMapping("/{id}")
    public ResponseEntity<Courier> updateCourier(
            @PathVariable String id,
            @Valid @RequestBody Courier courier) {
        String tenantId = getCurrentTenantId();
        Courier updated = courierService.updateCourier(id, courier, tenantId);
        log.info("✏️ پیک {} به‌روزرسانی شد.", id);
        return ResponseEntity.ok(updated);
    }

    // ==========================================
    //  ۵. حذف پیک
    // ==========================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourier(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        courierService.deleteCourier(id, tenantId);
        log.info("🗑️ پیک {} حذف شد.", id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    //  ۶. فعال/غیرفعال کردن پیک
    // ==========================================
    @PatchMapping("/{id}/enable")
    public ResponseEntity<Courier> enableCourier(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        return ResponseEntity.ok(courierService.enableCourier(id, tenantId));
    }

    @PatchMapping("/{id}/disable")
    public ResponseEntity<Courier> disableCourier(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        return ResponseEntity.ok(courierService.disableCourier(id, tenantId));
    }
}