package com.bako.backend.repository;

import com.bako.backend.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // ===== جستجوی محصولات بر اساس نانوایی =====
    List<Product> findByTenantId(String tenantId);

    // ===== جستجوی محصول با نام و نانوایی =====
    List<Product> findByTenantIdAndNameContainingIgnoreCase(String tenantId, String name);

    // ===== جستجوی محصولات بر اساس دسته‌بندی و نانوایی =====
    List<Product> findByTenantIdAndCategory(String tenantId, String category);

    // ===== جستجوی یک محصول با شناسه و نانوایی =====
    Optional<Product> findByIdAndTenantId(String id, String tenantId);

    // ===== جستجوی محصول با _id به صورت رشته و نانوایی =====
    @Query("{ '_id': ?0, 'tenantId': ?1 }")
    Optional<Product> findByIdAsStringAndTenantId(String id, String tenantId);

    // ============================================================
    //  🆕 متدهای جدید — بر اساس فیلدهای نمایش
    // ============================================================

    // ===== محصولات فعال یک نانوایی =====
    List<Product> findByTenantIdAndEnabledTrue(String tenantId);

    // ===== محصولات فعال یک نانوایی — مرتب‌شده بر اساس ترتیب نمایش =====
    List<Product> findByTenantIdAndEnabledTrueOrderByDisplayOrderAsc(String tenantId);

    // ===== محصولات یک نانوایی — مرتب‌شده بر اساس ترتیب نمایش =====
    List<Product> findByTenantIdOrderByDisplayOrderAsc(String tenantId);

    // ===== محصولات فعال یک نانوایی در یک دسته‌بندی =====
    List<Product> findByTenantIdAndCategoryAndEnabledTrue(String tenantId, String category);

    // ===== محصولات ویژه (featured) یک نانوایی =====
    List<Product> findByTenantIdAndFeaturedTrueAndEnabledTrue(String tenantId);

    // ===== جستجوی محصولات فعال یک نانوایی با نام =====
    @Query("{ 'tenantId': ?0, 'name': { $regex: ?1, $options: 'i' }, 'enabled': true }")
    List<Product> searchByTenantAndName(String tenantId, String namePattern);

    // ===== شمارش محصولات یک نانوایی =====
    long countByTenantId(String tenantId);

    // ===== شمارش محصولات فعال یک نانوایی =====
    long countByTenantIdAndEnabledTrue(String tenantId);

    // ============================================================
    //  🆕 متدهای تجمیعی (Cross-Tenant) — برای صفحه محصولات مشتری
    //  این متدها بین همه نانوایی‌ها جستجو می‌کنند
    // ============================================================

    // ===== همه محصولات فعال همه نانوایی‌ها =====
    List<Product> findByEnabledTrue();

    // ===== همه محصولات فعال یک دسته (سراسری) =====
    List<Product> findByEnabledTrueAndCategory(String category);

    // ===== جستجوی همه محصولات فعال با نام (سراسری، case-insensitive) =====
    List<Product> findByEnabledTrueAndNameContainingIgnoreCase(String name);

    // ===== جستجوی محصولات فعال در یک دسته با نام (سراسری) =====
    List<Product> findByEnabledTrueAndCategoryAndNameContainingIgnoreCase(String category, String name);
}