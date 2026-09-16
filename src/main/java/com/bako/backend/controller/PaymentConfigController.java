package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * کنترلر عمومی — تنظیمات پرداخت نانوایی برای مشتری
 * فقط برای خوندن، هیچ داده حساسی (merchantId و...) برنمی‌گردونه.
 */
@Slf4j
@RestController
@RequestMapping("/api/public/bakeries")
@RequiredArgsConstructor
public class PaymentConfigController {

    private final TenantRepository tenantRepository;

    /**
     * دریافت روش‌های پرداخت فعال برای یک نانوایی
     * GET /api/public/bakeries/{tenantId}/payment-methods
     */
    @GetMapping("/{tenantId}/payment-methods")
    public ResponseEntity<Map<String, Object>> getPaymentMethods(
            @PathVariable String tenantId) {

        log.info("📥 درخواست روش‌های پرداخت نانوایی: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "نانوایی یافت نشد"));

        Map<String, Object> result = new HashMap<>();
        result.put("cash", Boolean.TRUE.equals(tenant.getCashPaymentEnabled()));
        result.put("pos", Boolean.TRUE.equals(tenant.getPosPaymentEnabled()));
        result.put("online", Boolean.TRUE.equals(tenant.getZarinpalEnabled()));

        log.info("✅ روش‌های پرداخت {}: cash={}, pos={}, online={}",
                tenantId, result.get("cash"), result.get("pos"), result.get("online"));

        return ResponseEntity.ok(result);
    }
}