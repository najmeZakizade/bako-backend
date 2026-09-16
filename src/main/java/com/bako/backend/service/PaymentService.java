package com.bako.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class PaymentService {

    // ============================================================
    //  تنظیمات عمومی درگاه (نه Merchant ID که مخصوص هر نانوایی است)
    //  🎯 حالا callback مشترکه: /payment/callback
    // ============================================================
    @Value("${zarinpal.callback-url:http://localhost:5173/payment/callback}")
    private String callbackUrl;

    private final RestTemplate restTemplate;

    public PaymentService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(20_000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * دریافت Base URL بر اساس حالت sandbox
     */
    private String getBaseUrl(boolean sandbox) {
        return sandbox
                ? "https://sandbox.zarinpal.com/pg"
                : "https://payment.zarinpal.com/pg";
    }

    // ============================================================
    //  درخواست پرداخت — merchantId از نانوایی میاد
    // ============================================================
    public Map<String, Object> requestPayment(
            String orderId,
            Long amount,
            String description,
            String merchantId,
            boolean sandbox
    ) {
        Map<String, Object> result = new HashMap<>();

        // ===== اعتبارسنجی =====
        if (merchantId == null || merchantId.trim().isEmpty()) {
            log.error("❌ Merchant ID برای این نانوایی تنظیم نشده است");
            result.put("success", false);
            result.put("message", "درگاه پرداخت این نانوایی تنظیم نشده است");
            return result;
        }

        if (amount == null || amount <= 0) {
            result.put("success", false);
            result.put("message", "مبلغ پرداخت نامعتبر است");
            return result;
        }

        try {
            String url = getBaseUrl(sandbox) + "/v4/payment/request.json";

            log.info("📤 درخواست پرداخت:");
            log.info("   Merchant ID: {}", maskMerchantId(merchantId));
            log.info("   Order ID: {}", orderId);
            log.info("   Amount: {}", amount);
            log.info("   Sandbox: {}", sandbox);

            Map<String, Object> body = new HashMap<>();
            body.put("merchant_id", merchantId);
            body.put("amount", amount);
            body.put("callback_url", callbackUrl + "?orderId=" + orderId);
            body.put("description", description != null ? description : "پرداخت سفارش " + orderId);
            body.put("metadata", Map.of("order_id", orderId));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            Map<String, Object> respBody = response.getBody();
            if (respBody == null) {
                result.put("success", false);
                result.put("message", "پاسخ خالی از درگاه");
                return result;
            }

            // ===== استخراج authority =====
            Object dataObj = respBody.get("data");
            if (dataObj instanceof Map) {
                Map<String, Object> data = (Map<String, Object>) dataObj;
                Object authorityObj = data.get("authority");

                if (authorityObj != null) {
                    String authority = authorityObj.toString();
                    String paymentUrl = getBaseUrl(sandbox) + "/StartPay/" + authority;

                    result.put("success", true);
                    result.put("authority", authority);
                    result.put("paymentUrl", paymentUrl);
                    log.info("✅ لینک پرداخت ساخته شد");
                    return result;
                }
            }

            // ===== استخراج خطا =====
            String errMsg = extractErrorMessage(respBody);
            result.put("success", false);
            result.put("message", "درگاه: " + errMsg);
            log.warn("⚠️ درگاه پاسخ خطا داد: {}", errMsg);
            return result;

        } catch (HttpClientErrorException e) {
            log.error("❌ خطای HTTP از درگاه: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            result.put("success", false);
            result.put("message", "خطای درگاه پرداخت (HTTP " + e.getStatusCode() + ")");
        } catch (ResourceAccessException e) {
            log.error("❌ خطای شبکه در اتصال به درگاه: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "عدم دسترسی به سرور درگاه پرداخت");
        } catch (Exception e) {
            log.error("❌ خطای غیرمنتظره در requestPayment: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "خطای داخلی در پردازش پرداخت");
        }

        return result;
    }

    // ============================================================
    //  تأیید پرداخت — merchantId از نانوایی میاد
    // ============================================================
    public Map<String, Object> verifyPayment(
            String authority,
            Long amount,
            String merchantId,
            boolean sandbox
    ) {
        Map<String, Object> result = new HashMap<>();

        if (merchantId == null || merchantId.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "Merchant ID تنظیم نشده است");
            return result;
        }

        if (authority == null || authority.trim().isEmpty()) {
            result.put("success", false);
            result.put("message", "شناسه تراکنش نامعتبر است");
            return result;
        }

        try {
            String url = getBaseUrl(sandbox) + "/v4/payment/verify.json";

            log.info("📤 تأیید پرداخت:");
            log.info("   Authority: {}", authority);
            log.info("   Amount: {}", amount);
            log.info("   Merchant ID: {}", maskMerchantId(merchantId));

            Map<String, Object> body = new HashMap<>();
            body.put("merchant_id", merchantId);
            body.put("amount", amount);
            body.put("authority", authority);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            Map<String, Object> respBody = response.getBody();
            if (respBody == null) {
                result.put("success", false);
                result.put("message", "پاسخ خالی از درگاه");
                return result;
            }

            // ===== استخراج ref_id =====
            Object dataObj = respBody.get("data");
            if (dataObj instanceof Map) {
                Map<String, Object> data = (Map<String, Object>) dataObj;
                Object refIdObj = data.get("ref_id");

                if (refIdObj != null) {
                    result.put("success", true);
                    result.put("refId", refIdObj.toString());
                    log.info("✅ پرداخت تأیید شد — RefId: {}", refIdObj);
                    return result;
                }
            }

            String errMsg = extractErrorMessage(respBody);
            result.put("success", false);
            result.put("message", errMsg);
            log.warn("⚠️ تأیید پرداخت ناموفق: {}", errMsg);
            return result;

        } catch (HttpClientErrorException e) {
            log.error("❌ خطای HTTP در verify: status={}", e.getStatusCode());
            result.put("success", false);
            result.put("message", "خطای HTTP در تأیید پرداخت");
        } catch (ResourceAccessException e) {
            log.error("❌ خطای شبکه در verify: {}", e.getMessage());
            result.put("success", false);
            result.put("message", "عدم دسترسی به سرور درگاه");
        } catch (Exception e) {
            log.error("❌ خطای غیرمنتظره در verifyPayment: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "خطای داخلی در تأیید پرداخت");
        }

        return result;
    }

    // ============================================================
    //  استخراج پیام خطا از پاسخ درگاه
    // ============================================================
    private String extractErrorMessage(Map<String, Object> respBody) {
        Object errorsObj = respBody.get("errors");
        String errMsg = "خطای نامشخص درگاه";

        if (errorsObj instanceof List && !((List<?>) errorsObj).isEmpty()) {
            Object firstErr = ((List<?>) errorsObj).get(0);
            if (firstErr instanceof Map) {
                Object msg = ((Map<?, ?>) firstErr).get("message");
                if (msg != null) errMsg = msg.toString();
            }
        } else if (errorsObj instanceof Map) {
            Object msg = ((Map<?, ?>) errorsObj).get("message");
            if (msg != null) errMsg = msg.toString();
        }

        return errMsg;
    }

    // ============================================================
    //  مخفی کردن Merchant ID در لاگ (امنیت)
    // ============================================================
    private String maskMerchantId(String merchantId) {
        if (merchantId == null || merchantId.length() < 12) return "***";
        return merchantId.substring(0, 8) + "..." + merchantId.substring(merchantId.length() - 4);
    }
}