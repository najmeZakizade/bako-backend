package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    // ===== مقادیر پیش‌فرض تعرفه پیک =====
    private static final long DEFAULT_BASE_FEE = 15_000L;
    private static final long DEFAULT_PER_KM_RATE = 5_000L;
    private static final boolean DEFAULT_FREE_ENABLED = false;
    private static final long DEFAULT_FREE_THRESHOLD = 500_000L;
    private static final String DEFAULT_COMMISSION_TYPE = "PERCENTAGE";
    private static final long DEFAULT_COMMISSION_VALUE = 20L;

    // ============================================================
    //  CRUD پایه
    // ============================================================

    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    public Tenant getTenantById(String id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "نانوایی با شناسه '" + id + "' پیدا نشد."));
    }

    public Tenant getTenantBySubdomain(String subdomain) {
        return tenantRepository.findBySubdomain(subdomain)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "نانوایی با زیردامنه '" + subdomain + "' پیدا نشد."));
    }

    public Tenant createTenant(Tenant tenant) {
        tenant.setStatus("ACTIVE");

        // ===== اطمینان از non-null بودن subscriptionExpiry =====
        if (tenant.getSubscriptionExpiry() == null) {
            tenant.setSubscriptionExpiry(LocalDateTime.now().plusMonths(1));
        }

        // ===== مقادیر پیش‌فرض تعرفه پیک =====
        applyDefaultTariffValues(tenant);

        log.info("🏪 نانوایی جدید ایجاد شد: {}", tenant.getName());
        return tenantRepository.save(tenant);
    }

    public Tenant updateTenant(String id, Tenant updatedTenant) {
        Tenant existing = getTenantById(id);
        existing.setName(updatedTenant.getName());
        existing.setAddress(updatedTenant.getAddress());
        existing.setPhone(updatedTenant.getPhone());
        existing.setSubdomain(updatedTenant.getSubdomain());
        existing.setLogoUrl(updatedTenant.getLogoUrl());
        existing.setDescription(updatedTenant.getDescription());

        // ===== اطمینان از non-null بودن subscriptionExpiry =====
        if (existing.getSubscriptionExpiry() == null) {
            existing.setSubscriptionExpiry(LocalDateTime.now().plusMonths(1));
        }

        log.info("✏️ نانوایی با شناسه {} به‌روزرسانی شد.", id);
        return tenantRepository.save(existing);
    }

    public void deleteTenant(String id) {
        Tenant tenant = getTenantById(id);
        tenant.setStatus("SUSPENDED");
        ensureNonNullDates(tenant);
        tenantRepository.save(tenant);
        log.info("🗑️ نانوایی با شناسه {} غیرفعال شد.", id);
    }

    public void activateTenant(String id) {
        Tenant tenant = getTenantById(id);
        tenant.setStatus("ACTIVE");
        ensureNonNullDates(tenant);
        tenantRepository.save(tenant);
        log.info("✅ نانوایی با شناسه {} فعال شد.", id);
    }

    // ============================================================
    //  موقعیت مکانی نانوایی
    // ============================================================
    public Tenant updateTenantLocation(String id, String address, Double latitude, Double longitude) {
        Tenant tenant = getTenantById(id);
        if (address != null && !address.trim().isEmpty()) {
            tenant.setAddress(address.trim());
        }
        tenant.setLatitude(latitude);
        tenant.setLongitude(longitude);

        ensureNonNullDates(tenant);

        log.info("📍 موقعیت مکانی نانوایی '{}' به‌روزرسانی شد.", tenant.getName());
        return tenantRepository.save(tenant);
    }

    // ============================================================
    //  به‌روزرسانی کامل تعرفه پیک نانوایی
    // ============================================================
    public Tenant updateCourierTariff(String id, Map<String, Object> body) {
        Tenant tenant = getTenantById(id);

        // ===== کرایه پایه =====
        if (body.containsKey("baseFee")) {
            Long baseFee = toLong(body.get("baseFee"));
            if (baseFee == null || baseFee < 0) {
                throw new IllegalArgumentException("کرایه پایه نامعتبر است.");
            }
            tenant.setBaseFee(baseFee);
        }

        // ===== نرخ هر کیلومتر =====
        if (body.containsKey("perKmRate")) {
            Long perKmRate = toLong(body.get("perKmRate"));
            if (perKmRate == null || perKmRate < 0) {
                throw new IllegalArgumentException("نرخ هر کیلومتر نامعتبر است.");
            }
            tenant.setPerKmRate(perKmRate);
        }

        // ===== فعال بودن تعرفه =====
        if (body.containsKey("tariffActive")) {
            Object activeObj = body.get("tariffActive");
            if (activeObj instanceof Boolean) {
                tenant.setTariffActive((Boolean) activeObj);
            }
        }

        // ===== ارسال رایگان =====
        if (body.containsKey("freeDeliveryEnabled")) {
            Object enabledObj = body.get("freeDeliveryEnabled");
            if (enabledObj instanceof Boolean) {
                tenant.setFreeDeliveryEnabled((Boolean) enabledObj);
            }
        }

        if (body.containsKey("freeDeliveryThreshold")) {
            Long threshold = toLong(body.get("freeDeliveryThreshold"));
            if (threshold == null || threshold < 0) {
                throw new IllegalArgumentException("مبلغ ارسال رایگان نامعتبر است.");
            }
            tenant.setFreeDeliveryThreshold(threshold);
        }

        // ===== سهم نانوایی =====
        if (body.containsKey("deliveryCommissionType")) {
            String type = String.valueOf(body.get("deliveryCommissionType"));
            if (!"PERCENTAGE".equals(type) && !"FIXED".equals(type)) {
                throw new IllegalArgumentException(
                        "نوع سهم نانوایی باید PERCENTAGE یا FIXED باشد.");
            }
            tenant.setDeliveryCommissionType(type);
        }

        if (body.containsKey("deliveryCommissionValue")) {
            Long value = toLong(body.get("deliveryCommissionValue"));
            if (value == null || value < 0) {
                throw new IllegalArgumentException("مقدار سهم نانوایی نامعتبر است.");
            }
            if ("PERCENTAGE".equals(tenant.getDeliveryCommissionType()) && value > 100) {
                throw new IllegalArgumentException(
                        "درصد سهم نانوایی نمی‌تواند بیشتر از ۱۰۰ باشد.");
            }
            tenant.setDeliveryCommissionValue(value);
        }

        // ===== 🛡 اطمینان از non-null بودن همه فیلدهای حیاتی =====
        ensureNonNullDates(tenant);
        applyDefaultTariffValuesIfMissing(tenant);

        log.info("💰 تعرفه پیک نانوایی '{}' به‌روزرسانی شد.", tenant.getName());
        return tenantRepository.save(tenant);
    }

    // ============================================================
    //  متد قدیمی — حفظ سازگاری (Deprecated)
    // ============================================================
    @Deprecated
    public Tenant updateDeliveryCommission(String id, String commissionType, Long commissionValue) {
        Tenant tenant = getTenantById(id);

        if (!"PERCENTAGE".equals(commissionType) && !"FIXED".equals(commissionType)) {
            throw new IllegalArgumentException("نوع تعرفه باید PERCENTAGE یا FIXED باشد.");
        }
        if (commissionValue == null || commissionValue < 0) {
            throw new IllegalArgumentException("مقدار تعرفه نامعتبر است.");
        }
        if ("PERCENTAGE".equals(commissionType) && commissionValue > 100) {
            throw new IllegalArgumentException("درصد تعرفه نمی‌تواند بیشتر از ۱۰۰ باشد.");
        }

        tenant.setDeliveryCommissionType(commissionType);
        tenant.setDeliveryCommissionValue(commissionValue);

        ensureNonNullDates(tenant);

        return tenantRepository.save(tenant);
    }

    // ============================================================
    //  Helper methods
    // ============================================================

    /**
     * 🛡 اطمینان از non-null بودن فیلدهای تاریخ
     * جلوگیری از خطای Jackson: Cannot invoke LocalDateTime.toString() because null
     */
    private void ensureNonNullDates(Tenant tenant) {
        if (tenant.getSubscriptionExpiry() == null) {
            tenant.setSubscriptionExpiry(LocalDateTime.now().plusMonths(1));
            log.debug("🔧 subscriptionExpiry برای نانوایی '{}' تنظیم شد.", tenant.getName());
        }
    }

    /**
     * اعمال مقادیر پیش‌فرض تعرفه پیک — برای create
     */
    private void applyDefaultTariffValues(Tenant tenant) {
        if (tenant.getBaseFee() == null) {
            tenant.setBaseFee(DEFAULT_BASE_FEE);
        }
        if (tenant.getPerKmRate() == null) {
            tenant.setPerKmRate(DEFAULT_PER_KM_RATE);
        }
        if (tenant.getTariffActive() == null) {
            tenant.setTariffActive(true);
        }
        if (tenant.getFreeDeliveryEnabled() == null) {
            tenant.setFreeDeliveryEnabled(DEFAULT_FREE_ENABLED);
        }
        if (tenant.getFreeDeliveryThreshold() == null) {
            tenant.setFreeDeliveryThreshold(DEFAULT_FREE_THRESHOLD);
        }
        if (tenant.getDeliveryCommissionType() == null) {
            tenant.setDeliveryCommissionType(DEFAULT_COMMISSION_TYPE);
        }
        if (tenant.getDeliveryCommissionValue() == null) {
            tenant.setDeliveryCommissionValue(DEFAULT_COMMISSION_VALUE);
        }
    }

    /**
     * اعمال مقادیر پیش‌فرض فقط اگه null باشن — برای update
     */
    private void applyDefaultTariffValuesIfMissing(Tenant tenant) {
        if (tenant.getBaseFee() == null) {
            tenant.setBaseFee(DEFAULT_BASE_FEE);
        }
        if (tenant.getPerKmRate() == null) {
            tenant.setPerKmRate(DEFAULT_PER_KM_RATE);
        }
        if (tenant.getTariffActive() == null) {
            tenant.setTariffActive(true);
        }
        if (tenant.getFreeDeliveryEnabled() == null) {
            tenant.setFreeDeliveryEnabled(DEFAULT_FREE_ENABLED);
        }
        if (tenant.getFreeDeliveryThreshold() == null) {
            tenant.setFreeDeliveryThreshold(DEFAULT_FREE_THRESHOLD);
        }
        if (tenant.getDeliveryCommissionType() == null) {
            tenant.setDeliveryCommissionType(DEFAULT_COMMISSION_TYPE);
        }
        if (tenant.getDeliveryCommissionValue() == null) {
            tenant.setDeliveryCommissionValue(DEFAULT_COMMISSION_VALUE);
        }
    }

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try {
            return Long.parseLong(obj.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}