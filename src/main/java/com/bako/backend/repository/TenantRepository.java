package com.bako.backend.repository;

import com.bako.backend.model.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends MongoRepository<Tenant, String> {

    // ============================================================
    //  جستجوهای پایه
    // ============================================================
    Optional<Tenant> findByName(String name);

    Optional<Tenant> findByPhone(String phone);

    Boolean existsByName(String name);

    // ============================================================
    //  جستجو بر اساس زیردامنه
    // ============================================================
    Optional<Tenant> findBySubdomain(String subdomain);

    Boolean existsBySubdomain(String subdomain);

    // ============================================================
    //  لیست نانوایی‌های فعال (برای صفحه مشتری)
    // ============================================================
    List<Tenant> findByEnabledTrueOrderByCreatedAtDesc();

    List<Tenant> findByEnabledTrueAndIsOpenTrueOrderByCreatedAtDesc();

    List<Tenant> findByStatusOrderByCreatedAtDesc(String status);

    // ============================================================
    //  جستجو با نام (case-insensitive)
    // ============================================================
    @Query("{ 'name': { $regex: ?0, $options: 'i' }, 'enabled': true }")
    List<Tenant> searchByNameEnabled(String namePattern);

    // ============================================================
    //  جستجو بر اساس وضعیت درگاه پرداخت
    // ============================================================
    List<Tenant> findByZarinpalEnabledTrue();

    List<Tenant> findByZarinpalEnabledTrueAndEnabledTrue();

    // ============================================================
    //  جستجو بر اساس وضعیت تعرفه پیک
    // ============================================================
    List<Tenant> findByTariffActiveTrue();

    List<Tenant> findByTariffActiveTrueAndEnabledTrue();

    // ============================================================
    //  اشتراک‌های منقضی
    // ============================================================
    @Query("{ 'subscriptionExpiry': { $lt: ?0 } }")
    List<Tenant> findExpiredSubscriptions(java.time.LocalDateTime now);

    @Query("{ 'subscriptionExpiry': { $lt: ?0 }, 'status': 'ACTIVE' }")
    List<Tenant> findActiveExpiredSubscriptions(java.time.LocalDateTime now);

    // ============================================================
    //  🆕 شمارش‌های آماری سوپر ادمین
    // ============================================================

    /** تعداد نانوایی‌ها با وضعیت مشخص */
    long countByStatus(String status);

    /** تعداد نانوایی‌های فعال (enabled = true) */
    long countByEnabledTrue();

    /** تعداد نانوایی‌ها با درگاه پرداخت فعال */
    long countByZarinpalEnabledTrue();

    /** تعداد نانوایی‌ها با وضعیت و enabled مشخص */
    long countByStatusAndEnabledTrue(String status);
}