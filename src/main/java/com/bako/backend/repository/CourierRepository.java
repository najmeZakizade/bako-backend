package com.bako.backend.repository;

import com.bako.backend.model.Courier;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourierRepository extends MongoRepository<Courier, String> {

    List<Courier> findByTenantId(String tenantId);

    List<Courier> findByTenantIdAndEnabled(String tenantId, boolean enabled);

    List<Courier> findByTenantIdAndFullNameContainingIgnoreCase(String tenantId, String fullName);

    // 👇 اضافه شد — برای چک امنیت (tenantId)
    Optional<Courier> findByIdAndTenantId(String id, String tenantId);
}