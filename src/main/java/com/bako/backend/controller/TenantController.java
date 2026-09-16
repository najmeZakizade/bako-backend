package com.bako.backend.controller;

import com.bako.backend.model.Tenant;
import com.bako.backend.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    // ============================================================
    //  CRUD پایه
    // ============================================================

    @GetMapping
    public ResponseEntity<List<Tenant>> getAllTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tenant> getTenantById(@PathVariable String id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    @PostMapping
    public ResponseEntity<Tenant> createTenant(@Valid @RequestBody Tenant tenant) {
        Tenant created = tenantService.createTenant(tenant);
        log.info("🏪 نانوایی جدید ایجاد شد: {}", created.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tenant> updateTenant(
            @PathVariable String id,
            @Valid @RequestBody Tenant tenant) {
        Tenant updated = tenantService.updateTenant(id, tenant);
        log.info("✏️ نانوایی با شناسه {} به‌روزرسانی شد.", id);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTenant(@PathVariable String id) {
        tenantService.deleteTenant(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activateTenant(@PathVariable String id) {
        tenantService.activateTenant(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    //  موقعیت مکانی نانوایی
    // ============================================================

    @GetMapping("/{id}/location")
    public ResponseEntity<Map<String, Object>> getTenantLocation(@PathVariable String id) {
        Tenant tenant = tenantService.getTenantById(id);

        Map<String, Object> result = new HashMap<>();
        result.put("address", tenant.getAddress());
        result.put("latitude", tenant.getLatitude());
        result.put("longitude", tenant.getLongitude());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<Map<String, Object>> updateTenantLocation(
            @PathVariable String id,
            @RequestBody Map<String, Object> locationData) {

        String address = locationData.get("address") != null
                ? locationData.get("address").toString() : null;

        Double latitude = null;
        Double longitude = null;

        if (locationData.get("latitude") != null) {
            latitude = ((Number) locationData.get("latitude")).doubleValue();
        }
        if (locationData.get("longitude") != null) {
            longitude = ((Number) locationData.get("longitude")).doubleValue();
        }

        Tenant updated = tenantService.updateTenantLocation(id, address, latitude, longitude);
        log.info("📍 موقعیت نانوایی {} به‌روزرسانی شد.", id);

        // به جای برگرداندن Tenant کامل، فقط فیلدهای لازم رو Map می‌کنیم
        Map<String, Object> result = new HashMap<>();
        result.put("id", updated.getId());
        result.put("name", updated.getName());
        result.put("address", updated.getAddress());
        result.put("latitude", updated.getLatitude());
        result.put("longitude", updated.getLongitude());
        result.put("message", "✅ موقعیت مکانی با موفقیت ذخیره شد.");

        return ResponseEntity.ok(result);
    }

    // ============================================================
    //  تعرفه پیک — نسخه کامل (جدید)
    // ============================================================

    /**
     * دریافت تعرفه کامل پیک نانوایی
     * GET /api/admin/tenants/{id}/courier-tariff
     */
    @GetMapping("/{id}/courier-tariff")
    public ResponseEntity<Map<String, Object>> getCourierTariff(@PathVariable String id) {
        Tenant tenant = tenantService.getTenantById(id);

        Map<String, Object> result = new HashMap<>();
        result.put("baseFee", tenant.getBaseFee());
        result.put("perKmRate", tenant.getPerKmRate());
        result.put("tariffActive", tenant.getTariffActive());
        result.put("freeDeliveryEnabled", tenant.getFreeDeliveryEnabled());
        result.put("freeDeliveryThreshold", tenant.getFreeDeliveryThreshold());
        result.put("deliveryCommissionType", tenant.getDeliveryCommissionType());
        result.put("deliveryCommissionValue", tenant.getDeliveryCommissionValue());

        return ResponseEntity.ok(result);
    }

    /**
     * به‌روزرسانی کامل تعرفه پیک نانوایی
     * PUT /api/admin/tenants/{id}/courier-tariff
     *
     * ⚠️ Map برمی‌گردونیم نه Tenant — چون Tenant شامل LocalDateTime است
     * و اگه null باشه، Jackson موقع سریالایز خطا می‌ده.
     */
    @PutMapping("/{id}/courier-tariff")
    public ResponseEntity<Map<String, Object>> updateCourierTariff(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {

        log.info("💰 درخواست به‌روزرسانی تعرفه پیک برای tenantId: {}", id);

        Tenant updated = tenantService.updateCourierTariff(id, body);

        // برگرداندن Map ساده — بدون LocalDateTime
        Map<String, Object> result = new HashMap<>();
        result.put("baseFee", updated.getBaseFee());
        result.put("perKmRate", updated.getPerKmRate());
        result.put("tariffActive", updated.getTariffActive());
        result.put("freeDeliveryEnabled", updated.getFreeDeliveryEnabled());
        result.put("freeDeliveryThreshold", updated.getFreeDeliveryThreshold());
        result.put("deliveryCommissionType", updated.getDeliveryCommissionType());
        result.put("deliveryCommissionValue", updated.getDeliveryCommissionValue());
        result.put("message", "✅ تعرفه پیک با موفقیت ذخیره شد.");

        log.info("✅ تعرفه پیک نانوایی {} با موفقیت به‌روزرسانی شد.", id);

        return ResponseEntity.ok(result);
    }

    // ============================================================
    //  تعرفه پیک — نسخه قدیمی (Deprecated - حفظ سازگاری)
    // ============================================================

    @Deprecated
    @GetMapping("/{id}/delivery-commission")
    public ResponseEntity<Map<String, Object>> getDeliveryCommission(@PathVariable String id) {
        Tenant tenant = tenantService.getTenantById(id);

        Map<String, Object> result = new HashMap<>();
        result.put("commissionType", tenant.getDeliveryCommissionType());
        result.put("commissionValue", tenant.getDeliveryCommissionValue());

        return ResponseEntity.ok(result);
    }

    @Deprecated
    @PutMapping("/{id}/delivery-commission")
    public ResponseEntity<Map<String, Object>> updateDeliveryCommission(
            @PathVariable String id,
            @RequestBody Map<String, Object> commissionData) {

        String type = commissionData.get("commissionType") != null
                ? commissionData.get("commissionType").toString() : null;
        Long value = commissionData.get("commissionValue") != null
                ? ((Number) commissionData.get("commissionValue")).longValue() : null;

        Tenant updated = tenantService.updateDeliveryCommission(id, type, value);
        log.info("💰 تعرفه پیک نانوایی {} به‌روزرسانی شد.", id);

        Map<String, Object> result = new HashMap<>();
        result.put("commissionType", updated.getDeliveryCommissionType());
        result.put("commissionValue", updated.getDeliveryCommissionValue());
        result.put("message", "✅ تعرفه با موفقیت ذخیره شد.");

        return ResponseEntity.ok(result);
    }
}