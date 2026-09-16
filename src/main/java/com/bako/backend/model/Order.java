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

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "orders")
public class Order {

    @Id
    private String id;

    @NotBlank(message = "شناسه نانوایی الزامی است.")
    private String tenantId;

    private String customerName;

    @NotBlank(message = "شماره تلفن الزامی است.")
    @Size(min = 10, max = 11, message = "شماره تلفن باید ۱۰ یا ۱۱ رقم باشد.")
    private String phone;

    @NotBlank(message = "آدرس الزامی است.")
    @Size(min = 5, max = 200, message = "آدرس باید بین ۵ تا ۲۰۰ کاراکتر باشد.")
    private String address;

    private String deliveryMethod;     // PICKUP | DELIVERY
    private Long deliveryPrice;

    @NotNull(message = "آیتم‌های سفارش الزامی است.")
    private List<CartItem> items;

    @NotNull(message = "مبلغ کل الزامی است.")
    @Min(value = 0, message = "مبلغ کل نمی‌تواند منفی باشد.")
    private Long totalPrice;

    private String status;              // PENDING | CONFIRMED | PREPARING | READY | DELIVERED | CANCELLED
    private LocalDateTime orderDate;

    private Double destinationLat;
    private Double destinationLng;
    private Integer deliveryDistance;

    private Double originLat;
    private Double originLng;
    private String deliveryNotes;

    // ============================================================
    //  اطلاعات پیک (snapshot در لحظه تخصیص)
    // ============================================================
    private String courierId;
    private String courierName;
    private String courierPhone;
    private String courierVehicleType;
    private String courierVehiclePlate;

    private LocalDateTime courierAssignedAt;

    private Long courierCommission;
    private Long courierPayout;

    private String courierNotes;

    // ============================================================
    //  اطلاعات پرداخت
    // ============================================================
    private String paymentMethod;          // CASH | POS | GATEWAY
    private String paymentStatus;          // PENDING | PAID | FAILED | REFUNDED
    private String paymentAuthority;
    private String paymentRefId;
    private LocalDateTime paidAt;

    // ============================================================
    //  🆕 تأیید دریافت توسط مشتری
    //  - پیش‌فرض: false (دریافت نکردم)
    //  - بعد از کلیک مشتری: true (دریافت کردم)
    //  - بعد از true دیگه قابل تغییر نیست
    // ============================================================
    private Boolean customerReceived = false;

    private LocalDateTime customerReceivedAt;
}