package com.bako.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    /**
     * نوع گیرنده: CUSTOMER | BAKERY
     */
    @Indexed
    private String recipientType;

    /**
     * شناسه گیرنده:
     *  - برای CUSTOMER: شماره موبایل مشتری
     *  - برای BAKERY: شناسه نانوایی (tenantId)
     */
    @Indexed
    private String recipientId;

    /**
     * نوع اعلان:
     *  - ORDER_CREATED (برای نانوایی)
     *  - ORDER_STATUS_CHANGED (برای مشتری)
     *  - ORDER_DELIVERED (برای مشتری)
     *  - COURIER_ASSIGNED (برای مشتری)
     *  - ORDER_RECEIVED (برای نانوایی)
     */
    private String type;

    private String title;

    private String message;

    @Indexed
    private String orderId;

    @Indexed
    private Boolean read = false;

    private LocalDateTime createdAt;

    private LocalDateTime readAt;
}