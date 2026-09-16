package com.bako.backend.repository;

import com.bako.backend.model.CartItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends MongoRepository<CartItem, String> {

    // ============================================================
    //  سبد خرید کاربر
    // ============================================================
    List<CartItem> findByUserIdOrderByAddedAtAsc(String userId);

    List<CartItem> findByUserIdAndTenantIdOrderByAddedAtAsc(String userId, String tenantId);

    // ============================================================
    //  آیتم مشخص در سبد کاربر
    // ============================================================
    Optional<CartItem> findByUserIdAndProductId(String userId, String productId);

    Optional<CartItem> findByUserIdAndTenantIdAndProductId(
            String userId, String tenantId, String productId
    );

    // ============================================================
    //  شمارش
    // ============================================================
    long countByUserId(String userId);

    long countByUserIdAndTenantId(String userId, String tenantId);

    // ============================================================
    //  حذف
    // ============================================================
    void deleteByUserId(String userId);

    void deleteByUserIdAndTenantId(String userId, String tenantId);

    void deleteByUserIdAndProductId(String userId, String productId);

    // ============================================================
    //  محاسبه مجموع (با Query)
    // ============================================================
    @org.springframework.data.mongodb.repository.Query(
            value = "{ 'userId': ?0 }",
            fields = "{ 'quantity': 1 }"
    )
    List<CartItem> findQuantitiesByUserId(String userId);
}