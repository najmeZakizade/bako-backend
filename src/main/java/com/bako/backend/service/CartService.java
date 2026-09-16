package com.bako.backend.service;

import com.bako.backend.model.CartItem;
import com.bako.backend.model.Product;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.annotation.SessionScope;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@SessionScope
public class CartService {

    private final List<CartItem> items = new ArrayList<>();

    // ============================================================
    //  دریافت آیتم‌ها
    // ============================================================
    public List<CartItem> getItems() {
        return items;
    }

    public List<CartItem> getCartItems() {
        return items;
    }

    // ============================================================
    //  تعداد کل آیتم‌ها
    // ============================================================
    public int getTotalItems() {
        int total = 0;
        for (CartItem item : items) {
            if (item.getQuantity() != null) {
                total += item.getQuantity();
            }
        }
        return total;
    }

    public int getCartItemCount() {
        return getTotalItems();
    }

    // ============================================================
    //  جمع کل قیمت
    // ============================================================
    public long getTotalPrice() {
        double total = 0.0;
        for (CartItem item : items) {
            if (item.getProductPrice() != null && item.getQuantity() != null) {
                total += item.getProductPrice() * item.getQuantity();
            }
        }
        return Math.round(total);
    }

    // ============================================================
    //  افزودن محصول با شی Product
    // ============================================================
    public void addProduct(Product product) {
        if (product == null) {
            throw new IllegalArgumentException("محصول نمی‌تواند null باشد.");
        }

        addProduct(
                product.getId(),
                product.getName(),
                product.getPrice(),
                product.getImageUrl(),
                product.getTenantId()
        );
    }

    // ============================================================
    //  افزودن با ۳ پارامتر (سازگاری)
    // ============================================================
    public void addProduct(String productId, String name, Double price) {
        addProduct(productId, name, price, null, null);
    }

    // ============================================================
    //  افزودن با ۵ پارامتر
    // ============================================================
    public void addProduct(
            String productId,
            String name,
            Double price,
            String imageUrl,
            String tenantId
    ) {
        if (productId == null || productId.isEmpty()) {
            throw new IllegalArgumentException("شناسه محصول نمی‌تواند خالی باشد.");
        }

        Optional<CartItem> existing = items.stream()
                .filter(item -> productId.equals(item.getProductId()))
                .findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            Integer currentQty = item.getQuantity();
            item.setQuantity(currentQty == null ? 1 : currentQty + 1);
            if (imageUrl != null) item.setProductImageUrl(imageUrl);
            if (tenantId != null) item.setTenantId(tenantId);
            log.info("🔄 تعداد محصول {} افزایش یافت.", name);
        } else {
            CartItem newItem = new CartItem();
            newItem.setProductId(productId);
            newItem.setProductName(name);
            newItem.setProductPrice(price);
            newItem.setProductImageUrl(imageUrl);
            newItem.setTenantId(tenantId);
            newItem.setQuantity(1);
            items.add(newItem);
            log.info("➕ محصول {} به سبد خرید اضافه شد.", name);
        }
    }

    // ============================================================
    //  افزودن با productId و quantity
    // ============================================================
    public CartItem addToCart(String productId, int quantity) {
        Optional<CartItem> existing = items.stream()
                .filter(item -> productId.equals(item.getProductId()))
                .findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(quantity);
            return item;
        }
        throw new IllegalArgumentException(
                "محصول با شناسه " + productId + " در سبد وجود ندارد."
        );
    }

    // ============================================================
    //  به‌روزرسانی تعداد
    // ============================================================
    public CartItem updateQuantity(String productId, int quantity) {
        Optional<CartItem> existing = items.stream()
                .filter(item -> productId.equals(item.getProductId()))
                .findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            if (quantity <= 0) {
                items.remove(item);
                return null;
            }
            item.setQuantity(quantity);
            return item;
        }
        return null;
    }

    // ============================================================
    //  حذف
    // ============================================================
    public void removeProduct(String productId) {
        items.removeIf(item -> productId.equals(item.getProductId()));
    }

    // ============================================================
    //  خالی کردن
    // ============================================================
    public void clear() {
        items.clear();
    }
}