package com.bako.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * آدرس مشتری — هر آدرس یه document جداگانه در collection «addresses»
 * با userId به کاربر مربوط می‌شود.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "addresses")
public class Address {

    @Id
    private String id;

    /** شناسه کاربر صاحب آدرس */
    @Indexed
    private String userId;

    /** عنوان: خانه / محل کار / سایر */
    private String title;

    /** آدرس متنی */
    private String fullAddress;

    /** عرض جغرافیایی */
    private Double latitude;

    /** طول جغرافیایی */
    private Double longitude;

    /** شماره تماس تحویل‌گیرنده (اختیاری) */
    private String phone;

    /** آدرس پیش‌فرض */
    private Boolean isDefault = false;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}