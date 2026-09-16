package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Order;
import com.bako.backend.model.User;
import com.bako.backend.repository.UserRepository;
import com.bako.backend.security.JwtUtil;
import com.bako.backend.service.DeliveryService;
import com.bako.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final DeliveryService deliveryService;

    @Value("${app.test.tenant-id:BAKERY_1}")
    private String defaultTenantId;

    // ============================================================
    //  متدهای کمکی
    // ============================================================

    private String extractUsernameFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.error("❌ هدر Authorization وجود ندارد یا نامعتبر است.");
            throw new ResourceNotFoundException("کاربر لاگین نیست.");
        }
        String token = authHeader.substring(7);
        try {
            String username = jwtUtil.extractUsername(token);
            log.info("👤 username استخراج‌شده از توکن: '{}'", username);
            return username;
        } catch (Exception e) {
            log.error("❌ خطا در استخراج username: {}", e.getMessage());
            throw new ResourceNotFoundException("توکن نامعتبر است.");
        }
    }

    private String getTenantIdFromUsername(String username) {
        log.info("🔍 جستجوی کاربر با username: '{}'", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.error("❌ کاربر با نام '{}' یافت نشد.", username);
                    return new ResourceNotFoundException("کاربر یافت نشد.");
                });
        String tenantId = user.getTenantId();
        log.info("🏷️ tenantId کاربر از دیتابیس: '{}'", tenantId);
        if (tenantId == null || tenantId.isEmpty()) {
            throw new ResourceNotFoundException("کاربر لاگین نیست یا نانوایی نامعتبر است.");
        }
        return tenantId;
    }

    private User getCurrentUser(String authHeader) {
        String username = extractUsernameFromToken(authHeader);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));
    }

    private String resolveTenantId(Map<String, Object> body, String authHeader) {
        if (body != null) {
            Object tenantIdObj = body.get("tenantId");
            if (tenantIdObj != null && !tenantIdObj.toString().trim().isEmpty()) {
                String tid = tenantIdObj.toString().trim();
                log.info("🏷️ tenantId از body: '{}'", tid);
                return tid;
            }
        }

        try {
            String username = extractUsernameFromToken(authHeader);
            return getTenantIdFromUsername(username);
        } catch (Exception e) {
            log.warn("⚠️ خطا در استخراج tenantId از توکن: {}", e.getMessage());
        }

        log.info("🔧 استفاده از tenantId پیش‌فرض: '{}'", defaultTenantId);
        return defaultTenantId;
    }

    // ============================================================
    //  ۱. دریافت همه سفارشات
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("📥 دریافت سفارشات...");
        String username = extractUsernameFromToken(authHeader);
        String tenantId = getTenantIdFromUsername(username);
        List<Order> orders = orderService.getAllOrders(tenantId);
        log.info("✅ تعداد سفارشات برگشتی: {}", orders.size());
        return ResponseEntity.ok(orders);
    }

    // ============================================================
    //  ۲. دریافت یک سفارش با ID
    //  🎯 مشتری → فقط سفارش‌های خودش
    //  🎯 صاحب نانوایی / کارمند → فقط سفارش‌های نانوایی خودش
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        User user = getCurrentUser(authHeader);
        Order order;

        if ("CUSTOMER".equals(user.getRole())) {
            // 🎯 مشتری — چک می‌کنیم که شماره تماس سفارش با کاربر یکی باشه
            log.info("🛒 دریافت سفارش {} برای مشتری '{}'", id, user.getUsername());
            order = orderService.getOrderByIdForCustomer(id, user.getPhone());
        } else {
            // صاحب نانوایی / کارمند
            String tenantId = getTenantIdFromUsername(user.getUsername());
            order = orderService.getOrderById(id, tenantId);
        }

        return ResponseEntity.ok(order);
    }

    // ============================================================
    //  ۳. ایجاد سفارش جدید
    // ============================================================
    @PostMapping
    public ResponseEntity<Order> createOrder(
            @Valid @RequestBody Order order,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String tenantId = order.getTenantId();
        if (tenantId == null || tenantId.isEmpty()) {
            String username = extractUsernameFromToken(authHeader);
            tenantId = getTenantIdFromUsername(username);
        }
        order.setTenantId(tenantId);

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ResourceNotFoundException("سبد خرید خالی است.");
        }

        if ("DELIVERY".equals(order.getDeliveryMethod())
                && (order.getDeliveryPrice() == null || order.getDeliveryPrice() == 0)
                && order.getDestinationLat() != null
                && order.getDestinationLng() != null) {
            try {
                Map<String, Object> deliveryResult = deliveryService.calculateDeliveryCost(
                        tenantId,
                        order.getDestinationLat(),
                        order.getDestinationLng(),
                        order.getTotalPrice()
                );

                if (deliveryResult.containsKey("error")) {
                    throw new IllegalStateException((String) deliveryResult.get("message"));
                }

                Long calculatedPrice = ((Number) deliveryResult.get("price")).longValue();
                Double distance = ((Number) deliveryResult.get("distance")).doubleValue();

                order.setDeliveryPrice(calculatedPrice);
                order.setDeliveryDistance((int) Math.round(distance));
                order.setOriginLat(((Number) deliveryResult.get("originLat")).doubleValue());
                order.setOriginLng(((Number) deliveryResult.get("originLng")).doubleValue());

                log.info("🚚 هزینه ارسال محاسبه شد: {} ریال (مسافت: {})", calculatedPrice, distance);
            } catch (Exception e) {
                log.error("⚠️ خطا در محاسبه هزینه ارسال: {}", e.getMessage());
                throw new ResourceNotFoundException("محاسبه هزینه ارسال ناموفق بود: " + e.getMessage());
            }
        }

        Order savedOrder = orderService.createOrder(order);
        log.info("✅ سفارش جدید با شناسه {} ثبت شد.", savedOrder.getId());
        return ResponseEntity.ok(savedOrder);
    }

    // ============================================================
    //  ۴. محاسبه هزینه ارسال
    // ============================================================
    @PostMapping("/calculate-delivery")
    public ResponseEntity<Map<String, Object>> calculateDelivery(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("📥 درخواست محاسبه هزینه ارسال دریافت شد.");

        Object destLatObj = request.get("destLat");
        Object destLngObj = request.get("destLng");
        Object orderTotalObj = request.get("orderTotal");

        if (destLatObj == null || destLngObj == null) {
            throw new IllegalArgumentException("مختصات مقصد (destLat و destLng) الزامی است.");
        }

        Double destLat = ((Number) destLatObj).doubleValue();
        Double destLng = ((Number) destLngObj).doubleValue();
        Long orderTotal = orderTotalObj != null
                ? ((Number) orderTotalObj).longValue() : null;

        String tenantId = resolveTenantId(request, authHeader);

        log.info("📍 tenantId: '{}' | مقصد: lat={}, lng={}", tenantId, destLat, destLng);

        Map<String, Object> result = deliveryService.calculateDeliveryCost(
                tenantId, destLat, destLng, orderTotal);

        return ResponseEntity.ok(result);
    }

    // ============================================================
    //  ۵. به‌روزرسانی وضعیت سفارش
    // ============================================================
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable String id,
            @RequestParam String status,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String username = extractUsernameFromToken(authHeader);
        String tenantId = getTenantIdFromUsername(username);
        Order updated = orderService.updateOrderStatus(id, status, tenantId);
        return ResponseEntity.ok(updated);
    }

    // ============================================================
    //  ۶. لغو سفارش
    // ============================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelOrder(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String username = extractUsernameFromToken(authHeader);
        String tenantId = getTenantIdFromUsername(username);
        orderService.cancelOrder(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    //  ۷. دریافت سفارشات بر اساس وضعیت
    // ============================================================
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Order>> getOrdersByStatus(
            @PathVariable String status,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String username = extractUsernameFromToken(authHeader);
        String tenantId = getTenantIdFromUsername(username);
        List<Order> orders = orderService.getOrdersByStatus(status, tenantId);
        return ResponseEntity.ok(orders);
    }

    // ============================================================
    //  ۸. دریافت سفارشات بر اساس شماره تلفن
    //  🎯 مشتری → همه سفارشات خودش (بدون فیلتر tenantId)
    //  🎯 صاحب نانوایی / کارمند → فقط سفارشات نانوایی خودش
    // ============================================================
    @GetMapping("/phone/{phone}")
    public ResponseEntity<List<Order>> getOrdersByPhone(
            @PathVariable String phone,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String username = extractUsernameFromToken(authHeader);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));

        List<Order> orders;

        if ("CUSTOMER".equals(user.getRole())) {
            log.info("🛒 دریافت همه سفارشات مشتری '{}' با شماره {}", username, phone);
            orders = orderService.getOrdersByPhone(phone);
        } else {
            String tenantId = getTenantIdFromUsername(username);
            log.info("🏪 دریافت سفارشات نانوایی {} با شماره {}", tenantId, phone);
            orders = orderService.getOrdersByPhone(phone, tenantId);
        }

        log.info("✅ {} سفارش برگشت داده شد.", orders.size());
        return ResponseEntity.ok(orders);
    }

    // ============================================================
    //  ۹. تخصیص پیک به سفارش
    // ============================================================
    @PostMapping("/{orderId}/assign-courier")
    public ResponseEntity<Order> assignCourier(
            @PathVariable String orderId,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("🚴 درخواست تخصیص پیک به سفارش {}", orderId);

        Object courierIdObj = request.get("courierId");
        if (courierIdObj == null || courierIdObj.toString().trim().isEmpty()) {
            throw new IllegalArgumentException("شناسه پیک (courierId) الزامی است.");
        }
        String courierId = courierIdObj.toString().trim();

        String tenantId = resolveTenantId(request, authHeader);

        log.info("🏷️ tenantId: '{}' | courierId: '{}'", tenantId, courierId);

        Order updated = orderService.assignCourier(orderId, courierId, tenantId);
        log.info("✅ پیک {} به سفارش {} تخصیص یافت.", courierId, orderId);
        return ResponseEntity.ok(updated);
    }

    // ============================================================
    //  ۱۰. حذف تخصیص پیک از سفارش
    // ============================================================
    @DeleteMapping("/{orderId}/assign-courier")
    public ResponseEntity<Order> unassignCourier(
            @PathVariable String orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("🗑️ درخواست حذف تخصیص پیک از سفارش {}", orderId);

        String tenantId = resolveTenantId(null, authHeader);

        Order updated = orderService.unassignCourier(orderId, tenantId);
        log.info("✅ تخصیص پیک از سفارش {} حذف شد.", orderId);
        return ResponseEntity.ok(updated);
    }

    // ============================================================
    //  ۱۱. علامت‌گذاری سفارش به عنوان تحویل‌شده
    // ============================================================
    @PatchMapping("/{orderId}/mark-delivered")
    public ResponseEntity<Order> markAsDelivered(
            @PathVariable String orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("✅ علامت‌گذاری سفارش {} به عنوان تحویل‌شده", orderId);

        String tenantId = resolveTenantId(null, authHeader);

        Order updated = orderService.markAsDelivered(orderId, tenantId);
        return ResponseEntity.ok(updated);
    }

    // ============================================================
    //  ۱۲. دیباگ
    // ============================================================
    @GetMapping("/debug/me")
    public ResponseEntity<?> debugMe(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String username = extractUsernameFromToken(authHeader);
            User user = userRepository.findByUsername(username).orElse(null);
            Map<String, Object> data = new HashMap<>();
            data.put("username", username);
            if (user != null) {
                data.put("tenantId", user.getTenantId());
                data.put("role", user.getRole());
                data.put("fullName", user.getFullName());
                data.put("phone", user.getPhone());
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("❌ " + e.getMessage());
        }
    }
    // ============================================================
    //  ۱۳. 🆕 تأیید دریافت سفارش توسط مشتری
    //  PATCH /api/orders/{id}/customer-received
    //  - فقط CUSTOMER
    //  - فقط یه‌بار قابل ثبت
    // ============================================================
    @PatchMapping("/{id}/customer-received")
    public ResponseEntity<Order> markCustomerReceived(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        User user = getCurrentUser(authHeader);

        if (!"CUSTOMER".equals(user.getRole())) {
            throw new ResourceNotFoundException("فقط مشتری می‌تواند این عملیات را انجام دهد.");
        }

        Order updated = orderService.markCustomerReceived(id, user.getPhone());
        return ResponseEntity.ok(updated);
    }

}