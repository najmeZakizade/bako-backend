package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.CartItem;
import com.bako.backend.model.Product;
import com.bako.backend.repository.CartItemRepository;
import com.bako.backend.repository.ProductRepository;
import com.bako.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    // ===== برای مهمان‌ها (در صورت نبود لاگین) =====
    // ⚠️ دیگه استفاده نمی‌شه — چون fallback غیرفعال شده
    @Value("${app.test.guest-id:GUEST_USER}")
    private String defaultGuestId;

    /**
     * 🎯 دریافت شناسه کاربر از SecurityContext
     * ⚠️ هیچ fallback به GUEST_USER یا username نداریم
     * اگه کاربر لاگین نکرده باشه، یه exception پرت می‌کنیم
     * تا خطا loud بشه و سبدها قاطی نشن.
     */
    private String getCurrentUserId() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null || userId.isEmpty()) {
            log.error("❌ کاربر لاگین نیست یا userId از SecurityContext استخراج نشد.");
            throw new RuntimeException(
                    "برای این عملیات باید وارد حساب کاربری شوید."
            );
        }
        return userId;
    }

    // ============================================================
    //  ۱. دریافت آیتم‌های سبد خرید
    //  GET /api/cart/items
    //  GET /api/cart/items?tenantId=BAKERY_1
    // ============================================================
    @GetMapping("/items")
    public ResponseEntity<List<Map<String, Object>>> getCartItems(
            @RequestParam(required = false) String tenantId
    ) {
        String userId = getCurrentUserId();
        log.info("📥 دریافت سبد کاربر {} | tenantId: {}", userId, tenantId);

        List<CartItem> items;

        if (tenantId != null && !tenantId.trim().isEmpty()) {
            items = cartItemRepository.findByUserIdAndTenantIdOrderByAddedAtAsc(
                    userId, tenantId.trim()
            );
        } else {
            items = cartItemRepository.findByUserIdOrderByAddedAtAsc(userId);
        }

        // ===== تبدیل به فرمت پاسخ =====
        List<Map<String, Object>> response = new ArrayList<>();
        for (CartItem item : items) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("id", item.getId());
            itemMap.put("productId", item.getProductId());
            itemMap.put("tenantId", item.getTenantId());
            itemMap.put("quantity", item.getQuantity());

            // ===== اطلاعات محصول (fresh from DB) =====
            Optional<Product> productOpt = productRepository.findById(item.getProductId());
            if (productOpt.isPresent()) {
                Product product = productOpt.get();
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("id", product.getId());
                productMap.put("name", product.getName());
                productMap.put("price", product.getPrice());
                productMap.put("stock", product.getStock());
                productMap.put("imageUrl", product.getImageUrl());
                productMap.put("category", product.getCategory());
                productMap.put("unit", product.getUnit());
                productMap.put("enabled", product.getEnabled());
                itemMap.put("product", productMap);
            } else {
                // اگه محصول پیدا نشد، snapshot رو برگردون
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("id", item.getProductId());
                productMap.put("name", item.getProductName());
                productMap.put("price", item.getProductPrice());
                productMap.put("imageUrl", item.getProductImageUrl());
                itemMap.put("product", productMap);
            }

            response.add(itemMap);
        }

        log.info("✅ {} آیتم برگشت داده شد.", response.size());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    //  ۲. تعداد آیتم‌های سبد
    //  GET /api/cart/count
    // ============================================================
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCartCount() {
        String userId = getCurrentUserId();
        long count = cartItemRepository.countByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    // ============================================================
    //  ۳. افزودن به سبد
    //  POST /api/cart/items
    //  Body: { productId, quantity, tenantId }
    // ============================================================
    @PostMapping("/items")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestBody Map<String, Object> body
    ) {
        String userId = getCurrentUserId();
        log.info("📥 افزودن به سبد | userId: {} | body: {}", userId, body);

        Map<String, Object> response = new HashMap<>();

        try {
            // ===== استخراج پارامترها =====
            Object productIdObj = body.get("productId");
            Object quantityObj = body.get("quantity");
            Object tenantIdObj = body.get("tenantId");

            if (productIdObj == null) {
                response.put("success", false);
                response.put("message", "شناسه محصول الزامی است.");
                return ResponseEntity.badRequest().body(response);
            }

            String productId = productIdObj.toString().trim();
            int quantity = quantityObj != null
                    ? ((Number) quantityObj).intValue()
                    : 1;

            if (quantity <= 0) {
                response.put("success", false);
                response.put("message", "تعداد باید بیشتر از صفر باشد.");
                return ResponseEntity.badRequest().body(response);
            }

            // ===== دریافت محصول =====
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "محصول با شناسه '" + productId + "' پیدا نشد."
                    ));

            // ===== تعیین tenantId =====
            String tenantId;
            if (tenantIdObj != null && !tenantIdObj.toString().trim().isEmpty()) {
                tenantId = tenantIdObj.toString().trim();
            } else {
                tenantId = product.getTenantId();
            }

            // ===== چک موجودی =====
            if (product.getStock() != null && product.getStock() < quantity) {
                response.put("success", false);
                response.put("message",
                        "موجودی کافی نیست. موجودی فعلی: " + product.getStock());
                return ResponseEntity.ok(response);
            }

            // ===== بررسی وجود آیتم در سبد =====
            Optional<CartItem> existingOpt =
                    cartItemRepository.findByUserIdAndProductId(userId, productId);

            CartItem cartItem;
            if (existingOpt.isPresent()) {
                // آپدیت تعداد
                cartItem = existingOpt.get();
                cartItem.setQuantity(cartItem.getQuantity() + quantity);
                cartItem.setUpdatedAt(LocalDateTime.now());
                log.info("♻️ آیتم موجود بود. تعداد جدید: {}", cartItem.getQuantity());
            } else {
                // ایجاد آیتم جدید
                cartItem = new CartItem();
                cartItem.setUserId(userId);
                cartItem.setTenantId(tenantId);
                cartItem.setProductId(productId);
                cartItem.setQuantity(quantity);
                cartItem.setProductName(product.getName());
                cartItem.setProductPrice(product.getPrice());
                cartItem.setProductImageUrl(product.getImageUrl());
                cartItem.setAddedAt(LocalDateTime.now());
                cartItem.setUpdatedAt(LocalDateTime.now());
                log.info("➕ آیتم جدید اضافه شد.");
            }

            CartItem saved = cartItemRepository.save(cartItem);

            // ===== پاسخ =====
            long totalCount = cartItemRepository.countByUserId(userId);

            response.put("success", true);
            response.put("message", "✅ محصول به سبد اضافه شد.");
            response.put("cartItemCount", totalCount);
            response.put("item", Map.of(
                    "id", saved.getId(),
                    "productId", saved.getProductId(),
                    "tenantId", saved.getTenantId(),
                    "quantity", saved.getQuantity()
            ));

            return ResponseEntity.ok(response);

        } catch (ResourceNotFoundException e) {
            log.error("❌ {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ خطا در افزودن به سبد:", e);
            response.put("success", false);
            response.put("message", "خطای سرور: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۴. به‌روزرسانی تعداد آیتم
    //  PUT /api/cart/items/{productId}
    //  Body: { quantity: 2 } یا { delta: 1 } یا { delta: -1 }
    // ============================================================
    @PutMapping("/items/{productId}")
    public ResponseEntity<Map<String, Object>> updateCartItem(
            @PathVariable String productId,
            @RequestBody Map<String, Object> body
    ) {
        String userId = getCurrentUserId();
        log.info("📝 به‌روزرسانی سبد | userId: {} | productId: {} | body: {}",
                userId, productId, body);

        Map<String, Object> response = new HashMap<>();

        try {
            CartItem cartItem = cartItemRepository
                    .findByUserIdAndProductId(userId, productId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "این محصول در سبد شما نیست."
                    ));

            // ===== حالت ۱: delta (افزایش/کاهش) =====
            if (body.containsKey("delta")) {
                int delta = ((Number) body.get("delta")).intValue();
                int newQty = cartItem.getQuantity() + delta;

                if (newQty <= 0) {
                    cartItemRepository.delete(cartItem);
                    response.put("success", true);
                    response.put("message", "محصول از سبد حذف شد.");
                    response.put("deleted", true);
                    return ResponseEntity.ok(response);
                }

                cartItem.setQuantity(newQty);
            }
            // ===== حالت ۲: quantity (مقدار دقیق) =====
            else if (body.containsKey("quantity")) {
                int newQty = ((Number) body.get("quantity")).intValue();

                if (newQty <= 0) {
                    cartItemRepository.delete(cartItem);
                    response.put("success", true);
                    response.put("message", "محصول از سبد حذف شد.");
                    response.put("deleted", true);
                    return ResponseEntity.ok(response);
                }

                cartItem.setQuantity(newQty);
            } else {
                response.put("success", false);
                response.put("message", "پارامتر quantity یا delta الزامی است.");
                return ResponseEntity.ok(response);
            }

            cartItem.setUpdatedAt(LocalDateTime.now());
            CartItem saved = cartItemRepository.save(cartItem);

            response.put("success", true);
            response.put("message", "✅ تعداد به‌روزرسانی شد.");
            response.put("item", Map.of(
                    "id", saved.getId(),
                    "productId", saved.getProductId(),
                    "quantity", saved.getQuantity()
            ));

            return ResponseEntity.ok(response);

        } catch (ResourceNotFoundException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ خطا:", e);
            response.put("success", false);
            response.put("message", "خطای سرور: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // ============================================================
    //  ۵. حذف یک آیتم
    //  DELETE /api/cart/items/{productId}
    // ============================================================
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<Void> removeFromCart(@PathVariable String productId) {
        String userId = getCurrentUserId();
        log.info("🗑️ حذف از سبد | userId: {} | productId: {}", userId, productId);

        cartItemRepository.deleteByUserIdAndProductId(userId, productId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    //  ۶. خالی کردن سبد
    //  DELETE /api/cart
    //  DELETE /api/cart?tenantId=BAKERY_1
    // ============================================================
    @DeleteMapping
    public ResponseEntity<Void> clearCart(
            @RequestParam(required = false) String tenantId
    ) {
        String userId = getCurrentUserId();
        log.info("🗑️ خالی کردن سبد | userId: {} | tenantId: {}", userId, tenantId);

        if (tenantId != null && !tenantId.trim().isEmpty()) {
            cartItemRepository.deleteByUserIdAndTenantId(userId, tenantId.trim());
        } else {
            cartItemRepository.deleteByUserId(userId);
        }

        return ResponseEntity.noContent().build();
    }
}