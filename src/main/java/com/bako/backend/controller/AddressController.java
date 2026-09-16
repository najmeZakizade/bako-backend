package com.bako.backend.controller;

import com.bako.backend.model.Address;
import com.bako.backend.service.AddressService;
import com.bako.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    /**
     * متد کمکی — دریافت userId از SecurityContext
     */
    private String requireCurrentUserId() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null || userId.isEmpty()) {
            throw new RuntimeException("کاربر لاگین نیست.");
        }
        return userId;
    }

    // ============================================================
    //  ۱. لیست آدرس‌های من — GET /api/addresses
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Address>> getMyAddresses() {
        String userId = requireCurrentUserId();
        List<Address> addresses = addressService.getAddresses(userId);
        log.info("📋 {} آدرس برای کاربر {} برگشت داده شد.", addresses.size(), userId);
        return ResponseEntity.ok(addresses);
    }

    // ============================================================
    //  ۲. دریافت یه آدرس — GET /api/addresses/{id}
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<Address> getAddress(@PathVariable String id) {
        String userId = requireCurrentUserId();
        Address address = addressService.getAddressById(id, userId);
        return ResponseEntity.ok(address);
    }

    // ============================================================
    //  ۳. افزودن آدرس — POST /api/addresses
    // ============================================================
    @PostMapping
    public ResponseEntity<Address> addAddress(@RequestBody Address address) {
        String userId = requireCurrentUserId();
        Address saved = addressService.addAddress(userId, address);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ============================================================
    //  ۴. ویرایش آدرس — PUT /api/addresses/{id}
    // ============================================================
    @PutMapping("/{id}")
    public ResponseEntity<Address> updateAddress(
            @PathVariable String id,
            @RequestBody Address address) {
        String userId = requireCurrentUserId();
        Address updated = addressService.updateAddress(id, userId, address);
        return ResponseEntity.ok(updated);
    }

    // ============================================================
    //  ۵. حذف آدرس — DELETE /api/addresses/{id}
    // ============================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddress(@PathVariable String id) {
        String userId = requireCurrentUserId();
        addressService.deleteAddress(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    //  ۶. تنظیم پیش‌فرض — PATCH /api/addresses/{id}/default
    // ============================================================
    @PatchMapping("/{id}/default")
    public ResponseEntity<Address> setDefault(@PathVariable String id) {
        String userId = requireCurrentUserId();
        Address updated = addressService.setDefaultAddress(id, userId);
        return ResponseEntity.ok(updated);
    }
}