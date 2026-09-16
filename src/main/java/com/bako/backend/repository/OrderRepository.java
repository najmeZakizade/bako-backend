package com.bako.backend.repository;

import com.bako.backend.model.Order;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {

    // ============================================================
    //  سفارشات یک نانوایی
    // ============================================================
    List<Order> findByTenantId(String tenantId);

    List<Order> findByTenantIdAndStatus(String tenantId, String status);

    Optional<Order> findByIdAndTenantId(String id, String tenantId);

    List<Order> findByTenantIdAndPhone(String tenantId, String phone);

    // ============================================================
    //  سفارشات یک مشتری (سراسری — بدون فیلتر نانوایی)
    // ============================================================
    List<Order> findByPhone(String phone);

    // ============================================================
    //  شمارش
    // ============================================================
    long countByTenantId(String tenantId);

    long countByTenantIdAndStatus(String tenantId, String status);

    // ============================================================
    //  🆕 متدهای آماری سوپر ادمین
    // ============================================================

    /** تعداد سفارشات بعد از تاریخ مشخص */
    long countByOrderDateAfter(LocalDateTime date);

    /** تعداد سفارشات یک نانوایی بعد از تاریخ مشخص */
    long countByTenantIdAndOrderDateAfter(String tenantId, LocalDateTime date);

    /** تعداد سفارشات با وضعیت پرداخت مشخص */
    long countByPaymentStatus(String paymentStatus);

    // ============================================================
    //  Aggregation ها — توجه: همه List برمی‌گردونن
    //  (Spring Data MongoDB با Map تنها مشکل داره)
    // ============================================================

    /**
     * جمع کل درآمد از سفارشات پرداخت‌شده
     * خروجی: [{ _id: null, total: 123456 }]
     */
    @Aggregation(pipeline = {
            "{ '$match': { 'paymentStatus': 'PAID' } }",
            "{ '$group': { '_id': null, 'total': { '$sum': '$totalPrice' } } }"
    })
    List<Map<String, Object>> aggregateTotalRevenue();

    /**
     * جمع درآمد یک نانوایی خاص
     */
    @Aggregation(pipeline = {
            "{ '$match': { 'tenantId': ?0, 'paymentStatus': 'PAID' } }",
            "{ '$group': { '_id': null, 'total': { '$sum': '$totalPrice' } } }"
    })
    List<Map<String, Object>> aggregateRevenueByTenant(String tenantId);

    /**
     * آمار روزانه درآمد
     * خروجی: [{ _id: "2025-01-15", revenue: ..., orderCount: ... }]
     */
    @Aggregation(pipeline = {
            "{ '$match': { " +
                    "'orderDate': { '$gte': ?0 }, " +
                    "'paymentStatus': 'PAID' " +
                    "} }",
            "{ '$group': { " +
                    "'_id': { '$dateToString': { 'format': '%Y-%m-%d', 'date': '$orderDate' } }, " +
                    "'revenue': { '$sum': '$totalPrice' }, " +
                    "'orderCount': { '$sum': 1 } " +
                    "} }",
            "{ '$sort': { '_id': 1 } }"
    })
    List<Map<String, Object>> aggregateDailyRevenue(LocalDateTime from);

    /**
     * آمار درآمد به تفکیک نانوایی
     * خروجی: [{ _id: "tenantId1", revenue: ..., orderCount: ... }]
     */
    @Aggregation(pipeline = {
            "{ '$match': { 'paymentStatus': 'PAID' } }",
            "{ '$group': { " +
                    "'_id': '$tenantId', " +
                    "'revenue': { '$sum': '$totalPrice' }, " +
                    "'orderCount': { '$sum': 1 } " +
                    "} }",
            "{ '$sort': { 'revenue': -1 } }"
    })
    List<Map<String, Object>> aggregateRevenueGroupedByTenant();
}