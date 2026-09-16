package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Address;
import com.bako.backend.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;

    /* ============================================================
       دریافت لیست آدرس‌های کاربر
       ============================================================ */
    public List<Address> getAddresses(String userId) {
        return addressRepository
                .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
    }

    /* ============================================================
       دریافت یه آدرس خاص
       ============================================================ */
    public Address getAddressById(String id, String userId) {
        return addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "آدرس با شناسه '" + id + "' پیدا نشد."));
    }

    /* ============================================================
       افزودن آدرس جدید
       ============================================================ */
    public Address addAddress(String userId, Address address) {
        address.setId(null);
        address.setUserId(userId);
        address.setCreatedAt(LocalDateTime.now());
        address.setUpdatedAt(LocalDateTime.now());

        long count = addressRepository.countByUserId(userId);

        // اگه اولین آدرس کاربر بود → پیش‌فرض بشه
        if (count == 0) {
            address.setIsDefault(true);
        }

        // اگه این آدرس پیش‌فرضه → بقیه رو غیرپیش‌فرض کن
        if (Boolean.TRUE.equals(address.getIsDefault())) {
            List<Address> existing = addressRepository
                    .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            existing.forEach(a -> a.setIsDefault(false));
            addressRepository.saveAll(existing);
        }

        Address saved = addressRepository.save(address);
        log.info("➕ آدرس جدید برای کاربر '{}' اضافه شد.", userId);
        return saved;
    }

    /* ============================================================
       ویرایش آدرس
       ============================================================ */
    public Address updateAddress(String id, String userId, Address updated) {
        Address existing = getAddressById(id, userId);

        // اگه این آدرس رو می‌خواد پیش‌فرض کنه → بقیه رو غیرپیش‌فرض کن
        if (Boolean.TRUE.equals(updated.getIsDefault())) {
            List<Address> others = addressRepository
                    .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            others.forEach(a -> {
                if (!a.getId().equals(id)) {
                    a.setIsDefault(false);
                }
            });
            addressRepository.saveAll(others);
        }

        existing.setTitle(updated.getTitle());
        existing.setFullAddress(updated.getFullAddress());
        existing.setLatitude(updated.getLatitude());
        existing.setLongitude(updated.getLongitude());
        existing.setPhone(updated.getPhone());
        existing.setIsDefault(updated.getIsDefault());
        existing.setUpdatedAt(LocalDateTime.now());

        Address saved = addressRepository.save(existing);
        log.info("✏️ آدرس '{}' برای کاربر '{}' ویرایش شد.", id, userId);
        return saved;
    }

    /* ============================================================
       حذف آدرس
       ============================================================ */
    public void deleteAddress(String id, String userId) {
        Address address = getAddressById(id, userId);
        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        addressRepository.delete(address);

        // اگه آدرس پیش‌فرض حذف شد → اولین آدرس باقی‌مانده پیش‌فرض بشه
        if (wasDefault) {
            List<Address> remaining = addressRepository
                    .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                remaining.get(0).setIsDefault(true);
                addressRepository.save(remaining.get(0));
            }
        }

        log.info("🗑️ آدرس '{}' از کاربر '{}' حذف شد.", id, userId);
    }

    /* ============================================================
       تنظیم پیش‌فرض
       ============================================================ */
    public Address setDefaultAddress(String id, String userId) {
        Address target = getAddressById(id, userId);

        List<Address> all = addressRepository
                .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        all.forEach(a -> a.setIsDefault(a.getId().equals(id)));
        addressRepository.saveAll(all);

        target.setIsDefault(true);
        log.info("⭐ آدرس '{}' برای کاربر '{}' پیش‌فرض شد.", id, userId);
        return target;
    }
}