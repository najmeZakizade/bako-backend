package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Order;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.OrderRepository;
import com.bako.backend.repository.TenantRepository;
import com.bako.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class PaymentController {

    private final OrderRepository orderRepository;
    private final TenantRepository tenantRepository;
    private final PaymentService paymentService;

    // ============================================================
    //  ۱. درخواست لینک پرداخت آنلاین
    // ============================================================
    @PostMapping("/{orderId}/payment/request")
    public ResponseEntity<Map<String, Object>> requestPayment(
            @PathVariable String orderId,
            @RequestBody(required = false) Map<String, Object> body) {

        log.info("========================================");
        log.info("💳 درخواست پرداخت برای سفارش: {}", orderId);
        log.info("========================================");

        Map<String, Object> response = new HashMap<>();

        try {
            // ===== ۱. پیدا کردن سفارش =====
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("سفارش یافت نشد"));

            log.info("✅ سفارش پیدا شد - tenantId: {}", order.getTenantId());

            // ===== ۲. چک کردن وضعیت پرداخت =====
            if ("PAID".equals(order.getPaymentStatus())) {
                response.put("success", false);
                response.put("message", "این سفارش قبلاً پرداخت شده است.");
                return ResponseEntity.ok(response);
            }

            // ===== ۳. پیدا کردن نانوایی =====
            String tenantId = order.getTenantId();
            if (tenantId == null || tenantId.isEmpty()) {
                response.put("success", false);
                response.put("message", "شناسه نانوایی در سفارش وجود ندارد");
                return ResponseEntity.ok(response);
            }

            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

            // ===== ۴. چک کردن فعال بودن درگاه =====
            if (tenant.getZarinpalEnabled() == null || !tenant.getZarinpalEnabled()) {
                response.put("success", false);
                response.put("message", "درگاه پرداخت آنلاین این نانوایی فعال نیست");
                return ResponseEntity.ok(response);
            }

            String merchantId = tenant.getZarinpalMerchantId();
            if (merchantId == null || merchantId.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Merchant ID نانوایی تنظیم نشده است");
                return ResponseEntity.ok(response);
            }

            boolean sandbox = tenant.getZarinpalSandbox() == null || tenant.getZarinpalSandbox();

            // ===== ۵. محاسبه مبلغ نهایی =====
            Long amount = order.getTotalPrice() != null ? order.getTotalPrice() : 0L;
            if (order.getDeliveryPrice() != null) {
                amount += order.getDeliveryPrice();
            }

            if (amount <= 0) {
                response.put("success", false);
                response.put("message", "مبلغ سفارش نامعتبر است");
                return ResponseEntity.ok(response);
            }

            log.info("💰 مبلغ نهایی: {} ریال | نانوایی: {}", amount, tenant.getName());

            // ===== ۶. درخواست از درگاه =====
            Map<String, Object> result = paymentService.requestPayment(
                    order.getId(),
                    amount,
                    order.getCustomerName(),
                    merchantId,
                    sandbox
            );

            if (!Boolean.TRUE.equals(result.get("success"))) {
                response.put("success", false);
                response.put("message", result.getOrDefault("message", "خطا در اتصال به درگاه"));
                return ResponseEntity.ok(response);
            }

            // ===== ۷. ذخیره authority =====
            order.setPaymentMethod("GATEWAY");
            order.setPaymentStatus("PENDING");
            order.setPaymentAuthority((String) result.get("authority"));
            orderRepository.save(order);

            response.put("success", true);
            response.put("authority", result.get("authority"));
            response.put("paymentUrl", result.get("paymentUrl"));
            return ResponseEntity.ok(response);

        } catch (ResourceNotFoundException e) {
            log.error("❌ منبع پیدا نشد: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ خطای غیرمنتظره در requestPayment:", e);
            response.put("success", false);
            response.put("message", "خطای سرور: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۲. تأیید پرداخت پس از بازگشت از درگاه
    // ============================================================
    @PostMapping("/{orderId}/payment/verify")
    public ResponseEntity<Map<String, Object>> verifyPayment(
            @PathVariable String orderId,
            @RequestBody Map<String, Object> body) {

        log.info("🔍 verify پرداخت برای سفارش {}", orderId);

        Map<String, Object> response = new HashMap<>();

        try {
            // ===== ۱. پیدا کردن سفارش =====
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("سفارش یافت نشد"));

            // ===== ۲. پیدا کردن نانوایی =====
            Tenant tenant = tenantRepository.findById(order.getTenantId())
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

            String merchantId = tenant.getZarinpalMerchantId();
            if (merchantId == null || merchantId.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Merchant ID نانوایی تنظیم نشده است");
                return ResponseEntity.ok(response);
            }

            boolean sandbox = tenant.getZarinpalSandbox() == null || tenant.getZarinpalSandbox();

            // ===== ۳. استخراج پارامترها =====
            String authority = (String) body.getOrDefault("authority", order.getPaymentAuthority());
            String status = (String) body.getOrDefault("status", "OK");

            log.info("authority: {}, status: {}, tenant: {}", authority, status, tenant.getName());

            // ===== ۴. چک کردن لغو توسط کاربر =====
            if (!"OK".equalsIgnoreCase(status) && !"success".equalsIgnoreCase(status)) {
                order.setPaymentStatus("FAILED");
                orderRepository.save(order);
                response.put("success", false);
                response.put("message", "پرداخت توسط کاربر لغو شد");
                return ResponseEntity.ok(response);
            }

            // ===== ۵. محاسبه مبلغ =====
            Long amount = order.getTotalPrice() != null ? order.getTotalPrice() : 0L;
            if (order.getDeliveryPrice() != null) {
                amount += order.getDeliveryPrice();
            }

            // ===== ۶. تأیید از درگاه =====
            Map<String, Object> result = paymentService.verifyPayment(
                    authority,
                    amount,
                    merchantId,
                    sandbox
            );

            if (Boolean.TRUE.equals(result.get("success"))) {
                order.setPaymentStatus("PAID");
                order.setPaymentRefId((String) result.get("refId"));
                order.setPaidAt(LocalDateTime.now());
                orderRepository.save(order);

                response.put("success", true);
                response.put("refId", result.get("refId"));
                response.put("message", "پرداخت با موفقیت تأیید شد");
                log.info("✅ پرداخت سفارش {} تأیید شد", orderId);
            } else {
                order.setPaymentStatus("FAILED");
                orderRepository.save(order);
                response.put("success", false);
                response.put("message", result.getOrDefault("message", "پرداخت ناموفق"));
                log.warn("❌ تأیید پرداخت سفارش {} ناموفق بود", orderId);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ خطای غیرمنتظره در verifyPayment:", e);
            response.put("success", false);
            response.put("message", "خطای سرور: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۳. ثبت روش پرداخت (نقدی / کارتخوان)
    // ============================================================
    @PatchMapping("/{orderId}/payment-method")
    public ResponseEntity<Map<String, Object>> updatePaymentMethod(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {

        log.info("💵 ثبت روش پرداخت برای سفارش {}", orderId);

        Map<String, Object> response = new HashMap<>();

        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("سفارش یافت نشد"));

            String method = body.get("paymentMethod");
            order.setPaymentMethod(method);
            order.setPaymentStatus("PAID");
            order.setPaidAt(LocalDateTime.now());

            orderRepository.save(order);

            response.put("success", true);
            response.put("message", "روش پرداخت ثبت شد");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ خطا در updatePaymentMethod:", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }
}