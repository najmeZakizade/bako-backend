package com.bako.backend.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @NotBlank(message = "شناسه نانوایی الزامی است.")
    @Indexed
    private String tenantId;

    @NotBlank(message = "نام محصول الزامی است.")
    @Size(min = 2, max = 100, message = "نام محصول باید بین ۲ تا ۱۰۰ کاراکتر باشد.")
    private String name;

    @Size(max = 500, message = "توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.")
    private String description;

    @NotNull(message = "قیمت الزامی است.")
    @Min(value = 0, message = "قیمت نمی‌تواند منفی باشد.")
    private Double price;

    @NotNull(message = "موجودی الزامی است.")
    @Min(value = 0, message = "موجودی نمی‌تواند منفی باشد.")
    private Integer stock;

    @NotBlank(message = "دسته‌بندی الزامی است.")
    private String category;

    private String imageUrl;

    // ============================================================
    //  🆕 فیلدهای اضافی برای نمایش
    // ============================================================

    /**
     * گالری تصاویر اضافی
     */
    private List<String> additionalImages;

    /**
     * واحد فروش: عدد | کیلو | بسته
     */
    private String unit = "عدد";

    /**
     * آیا محصول فعال است؟
     * اگه false باشه، در فروشگاه نمایش داده نمی‌شه
     */
    private Boolean enabled = true;

    /**
     * آیا محصول ویژه است؟
     * (برای نمایش در بخش ویژه)
     */
    private Boolean featured = false;

    /**
     * تعداد فروش رفته (برای مرتب‌سازی پرفروش‌ها)
     */
    private Integer soldCount = 0;

    /**
     * امتیاز محصول (میانگین)
     */
    private Double rating = 0.0;

    /**
     * تعداد امتیازهای ثبت‌شده
     */
    private Integer ratingCount = 0;

    /**
     * ترتیب نمایش در لیست
     * (کمتر = بالاتر)
     */
    private Integer displayOrder = 0;

    // ============================================================
    //  زمان‌ها
    // ============================================================
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}