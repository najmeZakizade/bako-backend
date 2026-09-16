package com.bako.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "cart_items")
public class CartItem {

    @Id
    private String id;

    /**
     * شناسه کاربر (یا مهمان)
     */
    @Indexed
    private String userId;

    /**
     * 🆕 شناسه نانوایی — برای فیلتر سفارش
     */
    @Indexed
    private String tenantId;

    /**
     * شناسه محصول
     */
    @Indexed
    private String productId;

    /**
     * تعداد
     */
    private Integer quantity;

    /**
     * 🆕 snapshot نام محصول (برای نمایش سریع)
     */
    private String productName;

    /**
     * 🆕 snapshot قیمت (برای نمایش سریع)
     */
    private Double productPrice;

    /**
     * 🆕 snapshot تصویر
     */
    private String productImageUrl;

    private LocalDateTime addedAt;

    private LocalDateTime updatedAt;
}