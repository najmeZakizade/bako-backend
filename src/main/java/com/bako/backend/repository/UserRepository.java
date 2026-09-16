package com.bako.backend.repository;

import com.bako.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    // ============================================================
    //  جستجوهای پایه
    // ============================================================
    Optional<User> findByUsername(String username);

    List<User> findByTenantId(String tenantId);

    List<User> findByTenantIdAndRole(String tenantId, String role);

    Optional<User> findByUsernameAndTenantId(String username, String tenantId);

    // ============================================================
    //  چک یکتایی شماره موبایل
    // ============================================================
    Optional<User> findByPhone(String phone);

    Boolean existsByPhone(String phone);

    // ============================================================
    //  🆕 شمارش‌ها و لیست‌های آماری سوپر ادمین
    // ============================================================

    /** تعداد کاربران با نقش مشخص */
    long countByRole(String role);

    /** تعداد کاربران فعال یک نانوایی */
    long countByTenantIdAndEnabledTrue(String tenantId);

    /** لیست کاربران فعال */
    List<User> findByEnabledTrue();
}