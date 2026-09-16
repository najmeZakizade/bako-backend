package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor
public class TenantAdminController {

    private final TenantRepository tenantRepository;

    // ============================================================
    //  ۱. دریافت تنظیمات پرداخت
    // ============================================================
    @GetMapping("/{tenantId}/payment-config")
    public ResponseEntity<Map<String, Object>> getPaymentConfig(
            @PathVariable String tenantId) {

        log.info("📥 دریافت تنظیمات پرداخت نانوایی: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

        Map<String, Object> response = new HashMap<>();
        response.put("tenantId", tenant.getId());
        response.put("tenantName", tenant.getName());
        response.put("merchantId", tenant.getZarinpalMerchantId());
        response.put("enabled", tenant.getZarinpalEnabled());
        response.put("sandbox", tenant.getZarinpalSandbox());
        response.put("paymentAccountName", tenant.getPaymentAccountName());
        response.put("paymentAccountIban", tenant.getPaymentAccountIban());
        response.put("updatedAt", tenant.getPaymentConfigUpdatedAt());

        return ResponseEntity.ok(response);
    }

    // ============================================================
    //  ۲. به‌روزرسانی تنظیمات پرداخت
    // ============================================================
    @PutMapping("/{tenantId}/payment-config")
    public ResponseEntity<Map<String, Object>> updatePaymentConfig(
            @PathVariable String tenantId,
            @RequestBody Map<String, Object> body) {

        log.info("📝 به‌روزرسانی تنظیمات پرداخت نانوایی: {}", tenantId);

        Map<String, Object> response = new HashMap<>();

        try {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

            // ===== Merchant ID =====
            if (body.containsKey("merchantId")) {
                String merchantId = (String) body.get("merchantId");
                if (merchantId != null) {
                    merchantId = merchantId.trim();

                    if (!merchantId.isEmpty() && !isValidMerchantId(merchantId)) {
                        response.put("success", false);
                        response.put("message",
                                "کد Merchant ID وارد شده صحیح نیست. " +
                                        "این کد را از پنل زرین‌پال خود کپی کنید. " +
                                        "کد صحیح چیزی شبیه این است: " +
                                        "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
                        return ResponseEntity.ok(response);
                    }
                }
                tenant.setZarinpalMerchantId(merchantId);
            }

            // ===== فعال/غیرفعال =====
            if (body.containsKey("enabled")) {
                Object enabledObj = body.get("enabled");
                if (enabledObj instanceof Boolean) {
                    tenant.setZarinpalEnabled((Boolean) enabledObj);
                }
            }

            // ===== sandbox =====
            if (body.containsKey("sandbox")) {
                Object sandboxObj = body.get("sandbox");
                if (sandboxObj instanceof Boolean) {
                    tenant.setZarinpalSandbox((Boolean) sandboxObj);
                }
            }

            // ===== نام صاحب حساب =====
            if (body.containsKey("paymentAccountName")) {
                tenant.setPaymentAccountName((String) body.get("paymentAccountName"));
            }

            // ===== شبا =====
            if (body.containsKey("paymentAccountIban")) {
                String iban = (String) body.get("paymentAccountIban");
                if (iban != null) {
                    iban = iban.trim().replaceAll("\\s", "");
                    if (!iban.isEmpty() && !iban.matches("^IR\\d{24}$")) {
                        response.put("success", false);
                        response.put("message",
                                "شماره شبا وارد شده صحیح نیست. " +
                                        "شماره شبا باید با «IR» شروع شده و بعد از آن دقیقاً ۲۴ رقم داشته باشد. " +
                                        "مثال: IR123456789012345678901234");
                        return ResponseEntity.ok(response);
                    }
                }
                tenant.setPaymentAccountIban(iban);
            }

            tenant.setPaymentConfigUpdatedAt(LocalDateTime.now());
            tenant.setUpdatedAt(LocalDateTime.now());

            Tenant saved = tenantRepository.save(tenant);

            response.put("success", true);
            response.put("message", "تنظیمات پرداخت با موفقیت ذخیره شد");
            response.put("tenant", saved);
            log.info("✅ تنظیمات پرداخت نانوایی {} ذخیره شد", tenant.getName());

            return ResponseEntity.ok(response);

        } catch (ResourceNotFoundException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ خطا در به‌روزرسانی تنظیمات پرداخت:", e);
            response.put("success", false);
            response.put("message", "خطای غیرمنتظره در سرور. لطفاً دوباره تلاش کنید.");
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۳. تست اتصال
    // ============================================================
    @PostMapping("/{tenantId}/payment-config/test")
    public ResponseEntity<Map<String, Object>> testPaymentConnection(
            @PathVariable String tenantId) {

        log.info("🧪 تست اتصال درگاه نانوایی: {}", tenantId);

        Map<String, Object> response = new HashMap<>();

        try {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

            String merchantId = tenant.getZarinpalMerchantId();
            if (merchantId == null || merchantId.isEmpty()) {
                response.put("success", false);
                response.put("message",
                        "ابتدا کد Merchant ID را وارد و ذخیره کنید، سپس تست کنید.");
                return ResponseEntity.ok(response);
            }

            if (!isValidMerchantId(merchantId)) {
                response.put("success", false);
                response.put("message",
                        "کد Merchant ID ذخیره شده معتبر نیست. " +
                                "لطفاً کد را از پنل زرین‌پال به‌درستی کپی کنید.");
                return ResponseEntity.ok(response);
            }

            response.put("success", true);
            response.put("message", "✅ کد Merchant ID معتبر است و اتصال برقرار شد");
            response.put("sandbox", tenant.getZarinpalSandbox());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ خطا در تست اتصال:", e);
            response.put("success", false);
            response.put("message", "خطا در برقراری ارتباط با سرور");
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۴. فعال/غیرفعال کردن درگاه
    // ============================================================
    @PatchMapping("/{tenantId}/payment-config/status")
    public ResponseEntity<Map<String, Object>> togglePaymentEnabled(
            @PathVariable String tenantId,
            @RequestBody Map<String, Object> body) {

        log.info("🔄 تغییر وضعیت درگاه پرداخت نانوایی: {}", tenantId);

        Map<String, Object> response = new HashMap<>();

        try {
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

            Object enabledObj = body.get("enabled");
            if (!(enabledObj instanceof Boolean)) {
                response.put("success", false);
                response.put("message", "مقدار ارسالی نامعتبر است");
                return ResponseEntity.ok(response);
            }

            tenant.setZarinpalEnabled((Boolean) enabledObj);
            tenant.setPaymentConfigUpdatedAt(LocalDateTime.now());
            tenantRepository.save(tenant);

            response.put("success", true);
            response.put("message",
                    Boolean.TRUE.equals(enabledObj)
                            ? "✅ درگاه پرداخت فعال شد"
                            : "⛔ درگاه پرداخت غیرفعال شد");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  متد کمکی — اعتبارسنجی Merchant ID
    // ============================================================
    private boolean isValidMerchantId(String merchantId) {
        if (merchantId == null) return false;
        return merchantId.matches(
                "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        );
    }
}