package com.bako.backend.service;

import com.bako.backend.model.Order;
import com.bako.backend.model.Product;
import com.bako.backend.model.Tenant;
import com.bako.backend.repository.OrderRepository;
import com.bako.backend.repository.ProductRepository;
import com.bako.backend.repository.TenantRepository;
import com.bako.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonitoringService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    // ============================================================
    //  📊 آمار داشبورد
    // ============================================================
    public Map<String, Object> getDashboardStats() {
        log.info("═══════════ 📊 شروع محاسبه آمار مانیتورینگ ═══════════");
        Map<String, Object> stats = new HashMap<>();

        List<Tenant> allTenants = tenantRepository.findAll();
        List<Order> allOrders = orderRepository.findAll();
        List<Product> allProducts = productRepository.findAll();

        long totalTenants = allTenants.size();
        long activeTenants = allTenants.stream()
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .count();
        long tenantsWithPayment = allTenants.stream()
                .filter(t -> Boolean.TRUE.equals(t.getZarinpalEnabled()))
                .count();

        long totalUsers = userRepository.count();
        long totalProducts = allProducts.size();
        long totalOrders = allOrders.size();

        // درآمد کل
        double totalRevenue = 0.0;
        for (Order o : allOrders) {
            if ("PAID".equals(o.getPaymentStatus()) && o.getTotalPrice() != null) {
                totalRevenue += o.getTotalPrice();
            }
        }

        // سفارشات ۳۰ روز اخیر
        LocalDateTime monthAgo = LocalDateTime.now().minusDays(30);
        long ordersLast30Days = 0;
        for (Order o : allOrders) {
            if (o.getOrderDate() != null && o.getOrderDate().isAfter(monthAgo)) {
                ordersLast30Days++;
            }
        }

        stats.put("totalTenants", totalTenants);
        stats.put("activeTenants", activeTenants);
        stats.put("tenantsWithPayment", tenantsWithPayment);
        stats.put("totalUsers", totalUsers);
        stats.put("totalProducts", totalProducts);
        stats.put("totalOrders", totalOrders);
        stats.put("totalRevenue", totalRevenue);
        stats.put("ordersLast30Days", ordersLast30Days);

        log.info("═══════════ ✅ پایان محاسبه ═══════════");
        return stats;
    }

    // ============================================================
    //  📈 نمودار درآمد روزانه
    // ============================================================
    public List<Map<String, Object>> getDailyRevenueTimeline(int days) {
        if (days <= 0) days = 7;
        LocalDateTime from = LocalDateTime.now().minusDays(days);

        List<Order> allOrders = orderRepository.findAll();
        Map<String, double[]> dailyMap = new TreeMap<>();

        for (Order o : allOrders) {
            if (!"PAID".equals(o.getPaymentStatus())) continue;
            if (o.getOrderDate() == null) continue;
            if (o.getOrderDate().isBefore(from)) continue;

            String dateKey = o.getOrderDate().toLocalDate().toString();
            dailyMap.computeIfAbsent(dateKey, k -> new double[2]);
            dailyMap.get(dateKey)[0] += (o.getTotalPrice() != null ? o.getTotalPrice() : 0);
            dailyMap.get(dateKey)[1] += 1;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : dailyMap.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            item.put("date", entry.getKey());
            item.put("revenue", entry.getValue()[0]);
            item.put("orderCount", (long) entry.getValue()[1]);
            result.add(item);
        }
        return result;
    }

    // ============================================================
    //  🏆 نانوایی‌های برتر
    // ============================================================
    public List<Map<String, Object>> getTopTenants(int limit) {
        if (limit <= 0) limit = 5;
        List<Order> allOrders = orderRepository.findAll();

        Map<String, double[]> tenantMap = new HashMap<>();
        for (Order o : allOrders) {
            if (!"PAID".equals(o.getPaymentStatus())) continue;
            if (o.getTenantId() == null) continue;
            tenantMap.computeIfAbsent(o.getTenantId(), k -> new double[2]);
            tenantMap.get(o.getTenantId())[0] += (o.getTotalPrice() != null ? o.getTotalPrice() : 0);
            tenantMap.get(o.getTenantId())[1] += 1;
        }

        List<Map.Entry<String, double[]>> sorted = new ArrayList<>(tenantMap.entrySet());
        sorted.sort((a, b) -> Double.compare(b.getValue()[0], a.getValue()[0]));

        List<Map<String, Object>> result = new ArrayList<>();
        int count = 0;
        for (Map.Entry<String, double[]> entry : sorted) {
            if (count >= limit) break;
            String tenantId = entry.getKey();
            Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
            Map<String, Object> item = new HashMap<>();
            item.put("tenantId", tenantId);
            item.put("tenantName", tenant != null ? tenant.getName() : "نامشخص");
            item.put("revenue", entry.getValue()[0]);
            item.put("orderCount", (long) entry.getValue()[1]);
            result.add(item);
            count++;
        }
        return result;
    }

    // ============================================================
    //  📊 درآمد به تفکیک نانوایی
    // ============================================================
    public List<Map<String, Object>> getRevenueByTenant() {
        return getTopTenants(Integer.MAX_VALUE);
    }

    // ============================================================
    //  🥇 پرفروش‌ترین محصولات
    // ============================================================
    public List<Map<String, Object>> getTopProducts(int limit) {
        if (limit <= 0) limit = 10;
        List<Product> allProducts = productRepository.findAll();
        allProducts.sort((a, b) -> {
            int aSold = a.getSoldCount() != null ? a.getSoldCount() : 0;
            int bSold = b.getSoldCount() != null ? b.getSoldCount() : 0;
            return Integer.compare(bSold, aSold);
        });

        List<Map<String, Object>> result = new ArrayList<>();
        int count = 0;
        for (Product p : allProducts) {
            if (count >= limit) break;
            Tenant tenant = tenantRepository.findById(p.getTenantId()).orElse(null);
            Map<String, Object> item = new HashMap<>();
            item.put("productId", p.getId());
            item.put("name", p.getName());
            item.put("tenantName", tenant != null ? tenant.getName() : "نامشخص");
            item.put("soldCount", p.getSoldCount() != null ? p.getSoldCount() : 0);
            item.put("price", p.getPrice());
            item.put("imageUrl", p.getImageUrl());
            result.add(item);
            count++;
        }
        return result;
    }

    // ============================================================
    //  💰 تراکنش‌ها
    // ============================================================
    public List<Map<String, Object>> getTransactions(
            String tenantId, String paymentStatus, int page, int size) {

        if (size <= 0) size = 20;
        if (page < 0) page = 0;

        List<Order> all = orderRepository.findAll();
        List<Order> filtered = new ArrayList<>();

        for (Order o : all) {
            if (tenantId != null && !tenantId.isEmpty()
                    && !tenantId.equals(o.getTenantId())) continue;
            if (paymentStatus != null && !paymentStatus.isEmpty()
                    && !paymentStatus.equals(o.getPaymentStatus())) continue;
            filtered.add(o);
        }

        filtered.sort((a, b) -> {
            LocalDateTime da = a.getOrderDate();
            LocalDateTime db = b.getOrderDate();
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return db.compareTo(da);
        });

        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, filtered.size());
        List<Order> pageData = fromIndex >= filtered.size()
                ? Collections.emptyList()
                : filtered.subList(fromIndex, toIndex);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Order o : pageData) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", o.getId());
            map.put("tenantId", o.getTenantId());
            map.put("customerName", o.getCustomerName());
            map.put("phone", o.getPhone());
            map.put("totalPrice", o.getTotalPrice());
            map.put("status", o.getStatus());
            map.put("paymentStatus", o.getPaymentStatus());
            map.put("paymentMethod", o.getPaymentMethod());
            map.put("orderDate", o.getOrderDate());
            map.put("deliveryMethod", o.getDeliveryMethod());
            result.add(map);
        }
        return result;
    }

    // ============================================================
    //  🔔 هشدارها (محاسبه لحظه‌ای — بدون ذخیره در دیتابیس)
    // ============================================================
    public Map<String, Object> getAlerts() {
        log.info("🔔 شروع محاسبه هشدارها...");

        List<Order> allOrders = orderRepository.findAll();
        List<Tenant> allTenants = tenantRepository.findAll();
        List<Product> allProducts = productRepository.findAll();

        // ===== ۱. سفارشات معلق (PENDING بیش از ۲ ساعت) =====
        LocalDateTime twoHoursAgo = LocalDateTime.now().minusHours(2);
        List<Map<String, Object>> pendingOrders = new ArrayList<>();
        for (Order o : allOrders) {
            if (!"PENDING".equals(o.getStatus())) continue;
            if (o.getOrderDate() == null) continue;
            if (!o.getOrderDate().isBefore(twoHoursAgo)) continue;

            long hours = java.time.Duration.between(o.getOrderDate(), LocalDateTime.now()).toHours();
            Tenant tenant = tenantRepository.findById(o.getTenantId()).orElse(null);

            Map<String, Object> item = new HashMap<>();
            item.put("orderId", o.getId());
            item.put("tenantName", tenant != null ? tenant.getName() : "نامشخص");
            item.put("customerName", o.getCustomerName());
            item.put("totalPrice", o.getTotalPrice());
            item.put("hoursWaiting", hours);
            item.put("orderDate", o.getOrderDate());
            pendingOrders.add(item);
        }

        // ===== ۲. تراکنش‌های ناموفق ۲۴ ساعت اخیر =====
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        List<Map<String, Object>> failedTransactions = new ArrayList<>();
        for (Order o : allOrders) {
            if (!"FAILED".equals(o.getPaymentStatus())) continue;
            if (o.getOrderDate() == null) continue;
            if (!o.getOrderDate().isAfter(oneDayAgo)) continue;

            Tenant tenant = tenantRepository.findById(o.getTenantId()).orElse(null);
            Map<String, Object> item = new HashMap<>();
            item.put("orderId", o.getId());
            item.put("tenantName", tenant != null ? tenant.getName() : "نامشخص");
            item.put("customerName", o.getCustomerName());
            item.put("totalPrice", o.getTotalPrice());
            item.put("orderDate", o.getOrderDate());
            failedTransactions.add(item);
        }

        // ===== ۳. نانوایی‌های فعال بدون درگاه پرداخت =====
        List<Map<String, Object>> tenantsWithoutPayment = new ArrayList<>();
        for (Tenant t : allTenants) {
            if (!"ACTIVE".equals(t.getStatus())) continue;
            if (Boolean.TRUE.equals(t.getZarinpalEnabled())) continue;

            long productCount = allProducts.stream()
                    .filter(p -> p.getTenantId() != null && p.getTenantId().equals(t.getId()))
                    .count();

            if (productCount == 0) continue; // اگه محصول هم نداره، هشدار نمی‌دیم

            Map<String, Object> item = new HashMap<>();
            item.put("tenantId", t.getId());
            item.put("tenantName", t.getName());
            item.put("productCount", productCount);
            item.put("hasMerchantId", t.getZarinpalMerchantId() != null
                    && !t.getZarinpalMerchantId().isEmpty());
            tenantsWithoutPayment.add(item);
        }

        // ===== ۴. محصولات با موجودی کم (< ۵) =====
        List<Map<String, Object>> lowStockProducts = new ArrayList<>();
        for (Product p : allProducts) {
            if (!Boolean.TRUE.equals(p.getEnabled())) continue;
            int stock = p.getStock() != null ? p.getStock() : 0;
            if (stock >= 5) continue;

            Tenant tenant = tenantRepository.findById(p.getTenantId()).orElse(null);
            Map<String, Object> item = new HashMap<>();
            item.put("productId", p.getId());
            item.put("name", p.getName());
            item.put("stock", stock);
            item.put("tenantName", tenant != null ? tenant.getName() : "نامشخص");
            lowStockProducts.add(item);
        }

        // ===== ۵. اشتراک‌های نزدیک انقضا (کمتر از ۷ روز) =====
        LocalDateTime sevenDaysLater = LocalDateTime.now().plusDays(7);
        List<Map<String, Object>> expiringSubscriptions = new ArrayList<>();
        for (Tenant t : allTenants) {
            if (t.getSubscriptionExpiry() == null) continue;
            if (!t.getSubscriptionExpiry().isBefore(sevenDaysLater)) continue;
            if (!t.getSubscriptionExpiry().isAfter(LocalDateTime.now())) continue;

            long daysLeft = java.time.Duration.between(
                    LocalDateTime.now(), t.getSubscriptionExpiry()).toDays();

            Map<String, Object> item = new HashMap<>();
            item.put("tenantId", t.getId());
            item.put("tenantName", t.getName());
            item.put("daysLeft", daysLeft);
            item.put("expiryDate", t.getSubscriptionExpiry());
            expiringSubscriptions.add(item);
        }

        // ===== ساخت پاسخ =====
        Map<String, Object> result = new HashMap<>();
        result.put("pendingOrders", pendingOrders);
        result.put("failedTransactions", failedTransactions);
        result.put("tenantsWithoutPayment", tenantsWithoutPayment);
        result.put("lowStockProducts", lowStockProducts);
        result.put("expiringSubscriptions", expiringSubscriptions);

        // شمارش کل
        Map<String, Object> counts = new HashMap<>();
        counts.put("pendingOrders", pendingOrders.size());
        counts.put("failedTransactions", failedTransactions.size());
        counts.put("tenantsWithoutPayment", tenantsWithoutPayment.size());
        counts.put("lowStockProducts", lowStockProducts.size());
        counts.put("expiringSubscriptions", expiringSubscriptions.size());
        counts.put("total",
                pendingOrders.size()
                        + failedTransactions.size()
                        + tenantsWithoutPayment.size()
                        + lowStockProducts.size()
                        + expiringSubscriptions.size());
        result.put("counts", counts);

        log.info("🔔 هشدارها: {} مورد", counts.get("total"));
        return result;
    }
}