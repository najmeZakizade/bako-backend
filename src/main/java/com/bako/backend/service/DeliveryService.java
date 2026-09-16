package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final TenantService tenantService;

    // ===== مقادیر پیش‌فرض =====
    private static final long DEFAULT_BASE_FEE = 15_000L;
    private static final long DEFAULT_PER_KM_RATE = 5_000L;
    private static final double ROAD_FACTOR = 1.3; // ضریب تبدیل فاصله مستقیم به مسیر واقعی

    // ============================================================
    //  محاسبه هزینه ارسال (نسخه اصلی — با orderTotal)
    // ============================================================
    /**
     * محاسبه هزینه ارسال بر اساس مختصات مقصد
     *
     * @param tenantId   شناسه نانوایی
     * @param destLat    عرض جغرافیایی مقصد
     * @param destLng    طول جغرافیایی مقصد
     * @param orderTotal مبلغ کل سفارش (برای چک ارسال رایگان) — می‌تواند null باشد
     */
    public Map<String, Object> calculateDeliveryCost(
            String tenantId, Double destLat, Double destLng, Long orderTotal) {

        log.info("📦 محاسبه هزینه ارسال برای tenantId: {} به مختصات: lat={}, lng={}",
                tenantId, destLat, destLng);

        // ===== اعتبارسنجی اولیه =====
        if (destLat == null || destLng == null) {
            throw new ResourceNotFoundException("مختصات مقصد نامعتبر است.");
        }

        // ===== دریافت اطلاعات نانوایی =====
        Tenant tenant = tenantService.getTenantById(tenantId);

        if (tenant.getLatitude() == null || tenant.getLongitude() == null) {
            throw new ResourceNotFoundException(
                    "مختصات نانوایی ثبت نشده است. لطفاً آدرس نانوایی را در تنظیمات به‌روزرسانی کنید."
            );
        }

        // ===== چک فعال بودن تعرفه =====
        if (Boolean.FALSE.equals(tenant.getTariffActive())) {
            throw new IllegalStateException("تعرفه ارسال برای این نانوایی غیرفعال است.");
        }

        double originLat = tenant.getLatitude();
        double originLng = tenant.getLongitude();

        // ===== محاسبه فاصله =====
        double straightDistanceKm = calculateHaversineDistance(originLat, originLng, destLat, destLng);
        double roadDistanceKm = straightDistanceKm * ROAD_FACTOR;
        double roundedDistance = Math.round(roadDistanceKm * 100.0) / 100.0;

        // ===== چک ارسال رایگان =====
        boolean freeEnabled = Boolean.TRUE.equals(tenant.getFreeDeliveryEnabled());
        Long freeThreshold = tenant.getFreeDeliveryThreshold();
        boolean isFree = freeEnabled
                && freeThreshold != null
                && freeThreshold > 0
                && orderTotal != null
                && orderTotal >= freeThreshold;

        // ===== نرخ‌ها (با fallback به پیش‌فرض) =====
        long baseFee = tenant.getBaseFee() != null
                ? tenant.getBaseFee() : DEFAULT_BASE_FEE;
        long perKmRate = tenant.getPerKmRate() != null
                ? tenant.getPerKmRate() : DEFAULT_PER_KM_RATE;

        // ===== محاسبه هزینه کل =====
        long totalPrice = isFree ? 0 : (baseFee + Math.round(roadDistanceKm * perKmRate));

        // ===== محاسبه سهم نانوایی و سهم پیک =====
        long bakeryCommission = isFree ? 0 : calculateBakeryCommission(tenant, totalPrice);
        long courierShare = totalPrice - bakeryCommission;

        // ===== آماده‌سازی نتیجه =====
        Map<String, Object> result = new HashMap<>();
        result.put("distance", roundedDistance);
        result.put("straightDistance", Math.round(straightDistanceKm * 100.0) / 100.0);
        result.put("price", totalPrice);
        result.put("baseFee", baseFee);
        result.put("perKmRate", perKmRate);
        result.put("bakeryCommission", bakeryCommission);
        result.put("courierShare", courierShare);
        result.put("commissionType", tenant.getDeliveryCommissionType());
        result.put("commissionValue", tenant.getDeliveryCommissionValue());
        result.put("isFreeDelivery", isFree);
        result.put("freeDeliveryEnabled", freeEnabled);
        result.put("freeDeliveryThreshold", freeThreshold);
        result.put("originLat", originLat);
        result.put("originLng", originLng);
        result.put("destLat", destLat);
        result.put("destLng", destLng);
        result.put("message", isFree
                ? "🎁 ارسال رایگان"
                : "هزینه ارسال با موفقیت محاسبه شد.");

        log.info("✅ هزینه: {} ریال | سهم نانوایی: {} ریال | سهم پیک: {} ریال | رایگان: {}",
                totalPrice, bakeryCommission, courierShare, isFree);

        return result;
    }

    // ============================================================
    //  Overload سازگاری — بدون orderTotal
    // ============================================================
    public Map<String, Object> calculateDeliveryCost(String tenantId, Double destLat, Double destLng) {
        return calculateDeliveryCost(tenantId, destLat, destLng, null);
    }

    // ============================================================
    //  محاسبه سهم نانوایی از هزینه ارسال
    // ============================================================
    private long calculateBakeryCommission(Tenant tenant, long totalPrice) {
        if (totalPrice <= 0) return 0;

        String type = tenant.getDeliveryCommissionType();
        Long value = tenant.getDeliveryCommissionValue();

        // اگه تنظیم نشده بود → پیش‌فرض ۲۰٪
        if (type == null || value == null) {
            return Math.round(totalPrice * 0.20);
        }

        if ("PERCENTAGE".equals(type)) {
            long commission = Math.round(totalPrice * value / 100.0);
            return Math.min(commission, totalPrice);
        } else if ("FIXED".equals(type)) {
            return Math.min(value, totalPrice);
        }

        return 0;
    }

    // ============================================================
    //  محاسبه فاصله Haversine
    // ============================================================
    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS_KM = 6371;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }
}