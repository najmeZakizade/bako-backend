package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Courier;
import com.bako.backend.repository.CourierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourierService {

    private final CourierRepository courierRepository;

    public List<Courier> getAllCouriers(String tenantId) {
        return courierRepository.findByTenantId(tenantId);
    }

    public Courier getCourierById(String id, String tenantId) {
        return courierRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("پیک یافت نشد."));
    }

    public Courier createCourier(Courier courier) {
        courier.setEnabled(true);
        courier.setCreatedAt(LocalDateTime.now());
        courier.setUpdatedAt(LocalDateTime.now());
        log.info("🛵 پیک جدید ثبت شد: {}", courier.getFullName());
        return courierRepository.save(courier);
    }

    public Courier updateCourier(String id, Courier updatedCourier, String tenantId) {
        Courier existing = getCourierById(id, tenantId);

        existing.setFullName(updatedCourier.getFullName());
        existing.setPhone(updatedCourier.getPhone());
        existing.setVehicleType(updatedCourier.getVehicleType());
        existing.setVehiclePlate(updatedCourier.getVehiclePlate());
        existing.setNationalId(updatedCourier.getNationalId());
        existing.setAddress(updatedCourier.getAddress());
        existing.setUpdatedAt(LocalDateTime.now());

        log.info("✏️ پیک {} به‌روزرسانی شد.", id);
        return courierRepository.save(existing);
    }

    public void deleteCourier(String id, String tenantId) {
        Courier courier = getCourierById(id, tenantId);
        courierRepository.delete(courier);
        log.info("🗑️ پیک {} حذف شد.", id);
    }

    public Courier enableCourier(String id, String tenantId) {
        Courier courier = getCourierById(id, tenantId);
        courier.setEnabled(true);
        courier.setUpdatedAt(LocalDateTime.now());
        return courierRepository.save(courier);
    }

    public Courier disableCourier(String id, String tenantId) {
        Courier courier = getCourierById(id, tenantId);
        courier.setEnabled(false);
        courier.setUpdatedAt(LocalDateTime.now());
        return courierRepository.save(courier);
    }
}