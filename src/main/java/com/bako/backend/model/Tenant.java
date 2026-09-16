package com.bako.backend.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "tenants")
public class Tenant {

    // ============================================================
    //  شناسه و نام
    // ============================================================
    @Id
    private String id;

    @NotBlank(message = "نام نانوایی الزامی است.")
    @Indexed(unique = true)
    private String name;

    private String displayName;

    private String ownerName;

    private String ownerNationalId;

    /**
     * زیردامنه یکتای نانوایی
     * مثال: "ali-bakery" → ali-bakery.bako.ir
     */
    @Indexed(unique = true, sparse = true)
    private String subdomain;

    // ============================================================
    //  اطلاعات تماس
    // ============================================================
    private String phone;

    private String mobile;

    private String email;

    private String address;

    private String postalCode;

    // ============================================================
    //  اطلاعات جغرافیایی
    // ============================================================
    private Double latitude;

    private Double longitude;

    // ============================================================
    //  تصاویر
    // ============================================================
    private String logoUrl;

    private String coverImageUrl;

    private List<String> galleryImages;

    // ============================================================
    //  وضعیت نانوایی
    // ============================================================
    private Boolean enabled = true;

    private Boolean isOpen = true;

    private String status;   // ACTIVE | INACTIVE | SUSPENDED | PENDING

    // ============================================================
    //  اشتراک و انقضا
    // ============================================================
    private LocalDateTime subscriptionExpiry;

    private LocalDateTime subscriptionStart;

    private String subscriptionPlan;   // FREE | BASIC | PREMIUM | ENTERPRISE

    // ============================================================
    //  ساعات کاری
    //  ✅ به‌صورت String ذخیره می‌شه (فرمت "HH:mm")
    //  مثال: "06:00" و "22:00"
    // ============================================================
    private String openTime;

    private String closeTime;

    private List<String> workingDays;

    // ============================================================
    //  🎯 تنظیمات تعرفه پیک نانوایی
    // ============================================================

    /**
     * آیا تعرفه پیک برای این نانوایی فعال است؟
     */
    private Boolean tariffActive = false;

    /**
     * هزینه پایه پیک (ریال)
     */
    private Long baseFee = 0L;

    /**
     * نرخ هر کیلومتر (ریال)
     */
    private Long perKmRate = 0L;

    /**
     * آیا ارسال رایگان فعال است؟
     */
    private Boolean freeDeliveryEnabled = false;

    /**
     * حداقل مبلغ سفارش برای ارسال رایگان (ریال)
     */
    private Long freeDeliveryThreshold = 0L;

    /**
     * نوع محاسبه سهم نانوایی از هزینه پیک
     * مقادیر ممکن: "PERCENTAGE" | "FIXED"
     */
    private String deliveryCommissionType = "PERCENTAGE";

    /**
     * مقدار سهم نانوایی
     */
    private Long deliveryCommissionValue = 20L;

    /**
     * حداکثر فاصله مجاز برای ارسال (کیلومتر)
     */
    private Integer maxDeliveryDistance = 15;

    /**
     * حداقل مبلغ سفارش برای ارسال با پیک (ریال)
     */
    private Long minOrderForDelivery = 0L;

    /**
     * زمان تقریبی تحویل (دقیقه)
     */
    private Integer estimatedDeliveryMinutes = 30;

    /**
     * هزینه ثابت ارسال (ریال) — اختیاری
     */
    private Long deliveryPrice = 0L;

    // ============================================================
    //  تنظیمات درگاه پرداخت زرین‌پال
    // ============================================================
    private String zarinpalMerchantId;

    private Boolean zarinpalEnabled = false;

    private Boolean zarinpalSandbox = true;

    private String paymentAccountName;

    private String paymentAccountIban;

    private LocalDateTime paymentConfigUpdatedAt;

    // ============================================================
    //  روش‌های پرداخت پشتیبانی‌شده
    // ============================================================
    private Boolean cashPaymentEnabled = true;

    private Boolean posPaymentEnabled = true;

    private Boolean onlinePaymentEnabled = false;

    // ============================================================
    //  اطلاعات اضافی
    // ============================================================
    private String description;

    private List<String> categories;

    private List<String> tags;

    // ============================================================
    //  آمار
    // ============================================================
    private Integer productCount = 0;

    private Integer totalOrders = 0;

    private Double rating = 0.0;

    private Integer ratingCount = 0;

    // ============================================================
    //  تنظیمات پیشرفته
    // ============================================================
    private Map<String, Object> settings;

    private Long minOrderAmount = 0L;

    private Integer taxPercent = 0;

    // ============================================================
    //  زمان‌ها
    // ============================================================
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime lastActiveAt;
}