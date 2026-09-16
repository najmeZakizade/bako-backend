package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/bakeries")
@RequiredArgsConstructor
public class BakeryController {

    private final TenantRepository tenantRepository;

    // ============================================================
    //  ۱. لیست نانوایی‌های فعال — عمومی (بدون نیاز به لاگین)
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Tenant>> getActiveBakeries() {
        log.info("📥 درخواست لیست نانوایی‌های فعال");

        // فقط نانوایی‌های فعال و باز
        List<Tenant> bakeries = tenantRepository.findByEnabledTrueAndIsOpenTrueOrderByCreatedAtDesc();

        // اگه این متد خالی برگردوند، همه نانوایی‌های فعال رو برگردون
        if (bakeries.isEmpty()) {
            bakeries = tenantRepository.findByEnabledTrueOrderByCreatedAtDesc();
        }

        log.info("✅ تعداد نانوایی‌های برگشتی: {}", bakeries.size());
        return ResponseEntity.ok(bakeries);
    }

    // ============================================================
    //  ۲. جزئیات یک نانوایی
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<Tenant> getBakeryById(@PathVariable String id) {
        log.info("📥 درخواست جزئیات نانوایی: {}", id);

        Tenant bakery = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "نانوایی با شناسه '" + id + "' پیدا نشد."
                ));

        if (Boolean.FALSE.equals(bakery.getEnabled())) {
            throw new ResourceNotFoundException(
                    "این نانوایی در حال حاضر غیرفعال است."
            );
        }

        return ResponseEntity.ok(bakery);
    }

    // ============================================================
    //  ۳. جستجوی نانوایی‌ها
    // ============================================================
    @GetMapping("/search")
    public ResponseEntity<List<Tenant>> searchBakeries(
            @RequestParam(required = false) String q) {

        log.info("🔍 جستجوی نانوایی: '{}'", q);

        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.ok(
                    tenantRepository.findByEnabledTrueOrderByCreatedAtDesc()
            );
        }

        String pattern = ".*" + q.trim() + ".*";
        List<Tenant> results = tenantRepository.searchByNameEnabled(pattern);

        log.info("✅ تعداد نتایج: {}", results.size());
        return ResponseEntity.ok(results);
    }

    // ============================================================
    //  ۴. اطلاعات کوتاه (برای نمایش سریع)
    // ============================================================
    @GetMapping("/{id}/summary")
    public ResponseEntity<Map<String, Object>> getBakerySummary(
            @PathVariable String id) {

        log.info("📥 خلاصه اطلاعات نانوایی: {}", id);

        Tenant bakery = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "نانوایی یافت نشد."
                ));

        Map<String, Object> summary = new HashMap<>();
        summary.put("id", bakery.getId());
        summary.put("name", bakery.getName());
        summary.put("address", bakery.getAddress());
        summary.put("phone", bakery.getPhone());
        summary.put("logoUrl", bakery.getLogoUrl());
        summary.put("coverImageUrl", bakery.getCoverImageUrl());
        summary.put("isOpen", bakery.getIsOpen());
        summary.put("enabled", bakery.getEnabled());
        summary.put("rating", bakery.getRating());
        summary.put("productCount", bakery.getProductCount());
        summary.put("latitude", bakery.getLatitude());
        summary.put("longitude", bakery.getLongitude());

        return ResponseEntity.ok(summary);
    }
}