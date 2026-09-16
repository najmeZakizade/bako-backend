package com.bako.backend.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "couriers")
public class Courier {

    @Id
    private String id;

    @NotBlank(message = "شناسه نانوایی الزامی است.")
    private String tenantId;

    @NotBlank(message = "نام کامل الزامی است.")
    @Size(min = 3, max = 100, message = "نام باید بین ۳ تا ۱۰۰ کاراکتر باشد.")
    private String fullName;

    @NotBlank(message = "شماره تماس الزامی است.")
    @Size(min = 10, max = 11, message = "شماره تماس باید ۱۰ یا ۱۱ رقم باشد.")
    private String phone;

    private String vehicleType;      // "MOTORCYCLE", "CAR", "BICYCLE"
    private String vehiclePlate;     // پلاک خودرو یا موتورسیکلت
    private String nationalId;       // کد ملی (اختیاری)
    private String address;          // آدرس سکونت (اختیاری)

    private boolean enabled = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}