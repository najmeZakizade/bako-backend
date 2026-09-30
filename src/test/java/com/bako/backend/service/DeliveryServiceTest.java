package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * تست‌های DeliveryService
 *
 * هدف: محافظت از محاسبه‌ی کرایه پیک — که مستقیماً روی پول مشتری، نانوایی و پیک تأثیر می‌ذاره
 *
 * نکات کلیدی:
 *   - محاسبه Haversine + ضریب جاده (۱.۳)
 *   - ارسال رایگان (۳ شرط ترکیبی)
 *   - commission درصدی/ثابت + clamping
 *   - fallback به مقادیر پیش‌فرض اگه tenant ناقص باشه
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("تست‌های DeliveryService")
class DeliveryServiceTest {

    @Mock
    private TenantService tenantService;

    @InjectMocks
    private DeliveryService deliveryService;

    private static final String TENANT_ID = "tenant-1";

    // مختصات نانوایی (تهران)
    private static final double ORIGIN_LAT = 35.7000;
    private static final double ORIGIN_LNG = 51.4000;

    // مختصات مقصد — حدود ۱ کیلومتر دورتر
    private static final double DEST_LAT = 35.7090;
    private static final double DEST_LNG = 51.4000;

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("نانوایی برکت");
        tenant.setLatitude(ORIGIN_LAT);
        tenant.setLongitude(ORIGIN_LNG);
        tenant.setTariffActive(true);
        tenant.setBaseFee(15_000L);
        tenant.setPerKmRate(5_000L);
        tenant.setDeliveryCommissionType("PERCENTAGE");
        tenant.setDeliveryCommissionValue(20L);
        tenant.setFreeDeliveryEnabled(false);
        tenant.setFreeDeliveryThreshold(500_000L);
    }

    // =================================================================
    //  بخش ۱: اعتبارسنجی ورودی‌ها
    // =================================================================
    @Nested
    @DisplayName("۱. اعتبارسنجی ورودی‌ها")
    class ValidationTests {

        @Test
        @DisplayName("🚨 destLat=null → ResourceNotFoundException")
        void null_lat_should_throw() {
            assertThatThrownBy(() ->
                    deliveryService.calculateDeliveryCost(TENANT_ID, null, DEST_LNG, 100_000L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("مختصات");
        }

        @Test
        @DisplayName("🚨 destLng=null → ResourceNotFoundException")
        void null_lng_should_throw() {
            assertThatThrownBy(() ->
                    deliveryService.calculateDeliveryCost(TENANT_ID, DEST_LAT, null, 100_000L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("مختصات");
        }

        @Test
        @DisplayName("🚨 نانوایی بدون مختصات → ResourceNotFoundException")
        void tenant_without_coordinates_should_throw() {
            tenant.setLatitude(null);
            tenant.setLongitude(null);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            assertThatThrownBy(() ->
                    deliveryService.calculateDeliveryCost(TENANT_ID, DEST_LAT, DEST_LNG, 100_000L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("نانوایی ثبت نشده");
        }

        @Test
        @DisplayName("🚨 tariffActive=false → IllegalStateException")
        void inactive_tariff_should_throw() {
            tenant.setTariffActive(false);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            assertThatThrownBy(() ->
                    deliveryService.calculateDeliveryCost(TENANT_ID, DEST_LAT, DEST_LNG, 100_000L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("غیرفعال");
        }

        @Test
        @DisplayName("overload بدون orderTotal → null استفاده می‌شه")
        void overload_without_order_total() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result =
                    deliveryService.calculateDeliveryCost(TENANT_ID, DEST_LAT, DEST_LNG);

            assertThat(result).containsKey("price");
            assertThat(result).containsKey("distance");
        }
    }

    // =================================================================
    //  بخش ۲: محاسبه فاصله
    // =================================================================
    @Nested
    @DisplayName("۲. محاسبه فاصله Haversine")
    class DistanceTests {

        @Test
        @DisplayName("مبدأ = مقصد → distance=0 و price=baseFee")
        void same_coordinates_yields_zero_distance() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Double) result.get("distance")).isEqualTo(0.0);
            assertThat((Long) result.get("price")).isEqualTo(15_000L); // فقط baseFee
        }

        @Test
        @DisplayName("مقصد متفاوت → distance > 0")
        void different_coordinates_yield_positive_distance() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat((Double) result.get("distance")).isGreaterThan(0.0);
        }

        @Test
        @DisplayName("ضریب جاده اعمال می‌شه (roadDistance = straight × 1.3)")
        void road_factor_is_applied() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            double straight = (Double) result.get("straightDistance");
            double rounded = (Double) result.get("distance");

            // فاصله‌ی گرد‌شده باید ~۱.۳ برابر فاصله‌ی مستقیم باشه
            assertThat(rounded).isCloseTo(straight * 1.3, within(0.1));
        }

        @Test
        @DisplayName("مقصد دورتر → کرایه بیشتر")
        void farther_destination_costs_more() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> near = deliveryService.calculateDeliveryCost(
                    TENANT_ID, 35.7010, 51.4000, 100_000L);
            Map<String, Object> far = deliveryService.calculateDeliveryCost(
                    TENANT_ID, 35.7500, 51.4000, 100_000L);

            assertThat((Long) far.get("price")).isGreaterThan((Long) near.get("price"));
        }
    }

    // =================================================================
    //  بخش ۳: مقادیر پیش‌فرض (fallback)
    // =================================================================
    @Nested
    @DisplayName("۳. مقادیر پیش‌فرض")
    class DefaultValueTests {

        @Test
        @DisplayName("baseFee نال → پیش‌فرض ۱۵,۰۰۰")
        void null_base_fee_uses_default() {
            tenant.setBaseFee(null);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Long) result.get("baseFee")).isEqualTo(15_000L);
        }

        @Test
        @DisplayName("perKmRate نال → پیش‌فرض ۵,۰۰۰")
        void null_per_km_rate_uses_default() {
            tenant.setPerKmRate(null);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Long) result.get("perKmRate")).isEqualTo(5_000L);
        }

        @Test
        @DisplayName("commissionType نال → پیش‌فرض ۲۰٪")
        void null_commission_type_defaults_to_20_percent() {
            tenant.setDeliveryCommissionType(null);
            tenant.setDeliveryCommissionValue(null);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            // distance=0 → price = 15_000 → commission = 20% = 3000
            assertThat((Long) result.get("bakeryCommission")).isEqualTo(3_000L);
        }
    }

    // =================================================================
    //  بخش ۴: ارسال رایگان
    // =================================================================
    @Nested
    @DisplayName("۴. ارسال رایگان")
    class FreeDeliveryTests {

        @BeforeEach
        void enableFreeDelivery() {
            tenant.setFreeDeliveryEnabled(true);
            tenant.setFreeDeliveryThreshold(100_000L);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);
        }

        @Test
        @DisplayName("سفارش بالای حد → price=0 و commission=0 و courierShare=0")
        void order_above_threshold_is_free() {
            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 150_000L);

            assertThat((Boolean) result.get("isFreeDelivery")).isTrue();
            assertThat((Long) result.get("price")).isEqualTo(0L);
            assertThat((Long) result.get("bakeryCommission")).isEqualTo(0L);
            assertThat((Long) result.get("courierShare")).isEqualTo(0L);
        }

        @Test
        @DisplayName("سفارش زیر حد → هزینه محاسبه می‌شه")
        void order_below_threshold_not_free() {
            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 50_000L);

            assertThat((Boolean) result.get("isFreeDelivery")).isFalse();
            assertThat((Long) result.get("price")).isGreaterThan(0L);
        }

        @Test
        @DisplayName("orderTotal نال → ارسال رایگان اعمال نمی‌شه")
        void null_order_total_not_free() {
            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, null);

            assertThat((Boolean) result.get("isFreeDelivery")).isFalse();
        }

        @Test
        @DisplayName("threshold=0 → ارسال رایگان اعمال نمی‌شه")
        void zero_threshold_not_free() {
            tenant.setFreeDeliveryThreshold(0L);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 1_000_000L);

            assertThat((Boolean) result.get("isFreeDelivery")).isFalse();
        }

        @Test
        @DisplayName("freeDeliveryEnabled=false → ارسال رایگان اعمال نمی‌شه")
        void disabled_free_delivery_not_applied() {
            tenant.setFreeDeliveryEnabled(false);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 10_000_000L);

            assertThat((Boolean) result.get("isFreeDelivery")).isFalse();
            assertThat((Long) result.get("price")).isGreaterThan(0L);
        }

        @Test
        @DisplayName("سفارش دقیقاً مساوی threshold → ارسال رایگان")
        void order_exactly_threshold_is_free() {
            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat((Boolean) result.get("isFreeDelivery")).isTrue();
            assertThat((Long) result.get("price")).isEqualTo(0L);
        }
    }

    // =================================================================
    //  بخش ۵: سهم نانوایی (commission)
    // =================================================================
    @Nested
    @DisplayName("۵. محاسبه سهم نانوایی")
    class CommissionTests {

        @BeforeEach
        void ensureNotFree() {
            // فاصله = 0 → فقط baseFee → price = 15,000
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);
        }

        @Test
        @DisplayName("PERCENTAGE 20% از ۱۵,۰۰۰ → commission=۳,۰۰۰")
        void percentage_commission() {
            tenant.setDeliveryCommissionType("PERCENTAGE");
            tenant.setDeliveryCommissionValue(20L);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Long) result.get("bakeryCommission")).isEqualTo(3_000L);
            assertThat((Long) result.get("courierShare")).isEqualTo(12_000L);
        }

        @Test
        @DisplayName("PERCENTAGE بزرگتر از ۱۰۰ → clamp به totalPrice")
        void percentage_over_100_clamped() {
            tenant.setDeliveryCommissionType("PERCENTAGE");
            tenant.setDeliveryCommissionValue(200L); // ۲۰۰٪

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            long price = (Long) result.get("price");
            long commission = (Long) result.get("bakeryCommission");

            assertThat(commission).isEqualTo(price);
            assertThat((Long) result.get("courierShare")).isEqualTo(0L);
        }

        @Test
        @DisplayName("FIXED ۵,۰۰۰ → commission=۵,۰۰۰")
        void fixed_commission() {
            tenant.setDeliveryCommissionType("FIXED");
            tenant.setDeliveryCommissionValue(5_000L);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Long) result.get("bakeryCommission")).isEqualTo(5_000L);
            assertThat((Long) result.get("courierShare")).isEqualTo(10_000L);
        }

        @Test
        @DisplayName("FIXED بزرگتر از total → clamp به total")
        void fixed_over_total_clamped() {
            tenant.setDeliveryCommissionType("FIXED");
            tenant.setDeliveryCommissionValue(1_000_000L);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            long price = (Long) result.get("price");
            assertThat((Long) result.get("bakeryCommission")).isEqualTo(price);
            assertThat((Long) result.get("courierShare")).isEqualTo(0L);
        }

        @Test
        @DisplayName("نوع ناشناخته → commission=۰")
        void unknown_type_zero_commission() {
            tenant.setDeliveryCommissionType("UNKNOWN");
            tenant.setDeliveryCommissionValue(50L);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, ORIGIN_LAT, ORIGIN_LNG, 100_000L);

            assertThat((Long) result.get("bakeryCommission")).isEqualTo(0L);
            assertThat((Long) result.get("courierShare"))
                    .isEqualTo((Long) result.get("price"));
        }

        @Test
        @DisplayName("همیشه: commission + courierShare = price")
        void commission_plus_share_equals_price() {
            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            long price = (Long) result.get("price");
            long commission = (Long) result.get("bakeryCommission");
            long share = (Long) result.get("courierShare");

            assertThat(commission + share).isEqualTo(price);
        }
    }

    // =================================================================
    //  بخش ۶: ساختار پاسخ
    // =================================================================
    @Nested
    @DisplayName("۶. ساختار پاسخ")
    class ResultStructureTests {

        @Test
        @DisplayName("همه کلیدهای مورد انتظار وجود دارن")
        void all_expected_keys_present() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat(result).containsKeys(
                    "distance", "straightDistance", "price",
                    "baseFee", "perKmRate", "bakeryCommission", "courierShare",
                    "commissionType", "commissionValue",
                    "isFreeDelivery", "freeDeliveryEnabled", "freeDeliveryThreshold",
                    "originLat", "originLng", "destLat", "destLng", "message"
            );
        }

        @Test
        @DisplayName("origin/dest در پاسخ درست ثبت می‌شن")
        void coordinates_are_returned() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat((Double) result.get("originLat")).isEqualTo(ORIGIN_LAT);
            assertThat((Double) result.get("originLng")).isEqualTo(ORIGIN_LNG);
            assertThat((Double) result.get("destLat")).isEqualTo(DEST_LAT);
            assertThat((Double) result.get("destLng")).isEqualTo(DEST_LNG);
        }

        @Test
        @DisplayName("پیام ارسال رایگان هنگام free بودن")
        void free_delivery_message() {
            tenant.setFreeDeliveryEnabled(true);
            tenant.setFreeDeliveryThreshold(50_000L);
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat((String) result.get("message")).contains("رایگان");
        }

        @Test
        @DisplayName("پیام عادی هنگام non-free بودن")
        void normal_delivery_message() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            assertThat((String) result.get("message")).contains("محاسبه");
        }
    }

    // =================================================================
    //  بخش ۷: هماهنگی با فرانت‌اند
    // =================================================================
    @Nested
    @DisplayName("۷. هماهنگی فرمول با فرانت‌اند (CourierTariff.jsx)")
    class FrontendConsistencyTests {

        @Test
        @DisplayName("فرمول price = baseFee + (perKmRate × distance) تایید می‌شه")
        void formula_matches_frontend() {
            when(tenantService.getTenantById(TENANT_ID)).thenReturn(tenant);

            Map<String, Object> result = deliveryService.calculateDeliveryCost(
                    TENANT_ID, DEST_LAT, DEST_LNG, 100_000L);

            double distance = (Double) result.get("distance");
            long baseFee = (Long) result.get("baseFee");
            long perKmRate = (Long) result.get("perKmRate");
            long price = (Long) result.get("price");

            // نکته: فرانت‌اند از distance نمایش‌داده‌شده (نه roadDistance خام) استفاده می‌کنه
            // پس ممکنه ۱-۲ ریال اختلاف باشه که قابل قبوله
            long expected = baseFee + Math.round(distance * perKmRate);

            assertThat(price).isCloseTo(expected, within(10L));
        }
    }
}