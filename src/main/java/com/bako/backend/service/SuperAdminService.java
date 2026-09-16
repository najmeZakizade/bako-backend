package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Order;
import com.bako.backend.model.Product;
import com.bako.backend.model.Tenant;
import com.bako.backend.model.User;
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
public class SuperAdminService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    // ============================================================
    //  📊 داشبورد — آمار کلی
    // ============================================================
    public Map<String, Object> getDashboardStats() {
        log.info("═══════════ 📊 شروع محاسبه آمار داشبورد ═══════════");
        Map<String, Object> stats = new HashMap<>();

        List<Tenant> allTenants = tenantRepository.findAll();
        long totalTenants = allTenants.size();
        long activeTenants = allTenants.stream()
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .count();
        long tenantsWithPayment = allTenants.stream()
                .filter(t -> Boolean.TRUE.equals(t.getZarinpalEnabled()))
                .count();

        long totalUsers = userRepository.count();
        long totalProducts = productRepository.count();

        List<Order> allOrders = orderRepository.findAll();
        long totalOrders = allOrders.size();

        double totalRevenue = 0.0;
        for (Order o : allOrders) {
            if ("PAID".equals(o.getPaymentStatus()) && o.getTotalPrice() != null) {
                totalRevenue += o.getTotalPrice();
            }
        }

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
    //  👥 کاربران
    // ============================================================
    public List<Map<String, Object>> getAllUsersFiltered(
            String search, String role, String tenantId, Boolean enabled) {

        List<User> all = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User u : all) {
            if (role != null && !role.isEmpty() && !role.equals(u.getRole())) continue;
            if (tenantId != null && !tenantId.isEmpty()
                    && !tenantId.equals(u.getTenantId())) continue;
            if (enabled != null && enabled != u.isEnabled()) continue;
            if (search != null && !search.isEmpty()) {
                String s = search.toLowerCase();
                boolean match =
                        (u.getUsername() != null && u.getUsername().toLowerCase().contains(s))
                                || (u.getFullName() != null && u.getFullName().toLowerCase().contains(s))
                                || (u.getPhone() != null && u.getPhone().contains(s))
                                || (u.getEmail() != null && u.getEmail().toLowerCase().contains(s));
                if (!match) continue;
            }
            result.add(sanitizeUser(u));
        }

        result.sort(Comparator.comparing(
                m -> String.valueOf(m.get("username")),
                Comparator.nullsLast(String::compareToIgnoreCase)));
        return result;
    }

    public Map<String, Object> updateUserRole(String userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد"));
        user.setRole(newRole);
        User saved = userRepository.save(user);
        log.info("🎯 نقش کاربر '{}' به '{}' تغییر یافت", saved.getUsername(), newRole);
        return sanitizeUser(saved);
    }

    public Map<String, Object> updateUserTenant(String userId, String tenantId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد"));
        if (tenantId != null && !tenantId.isEmpty()) {
            tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));
        }
        user.setTenantId(tenantId == null || tenantId.isEmpty() ? null : tenantId);
        User saved = userRepository.save(user);
        return sanitizeUser(saved);
    }

    public Map<String, Object> toggleUserEnabled(String userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد"));
        user.setEnabled(enabled);
        User saved = userRepository.save(user);
        return sanitizeUser(saved);
    }

    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد"));
        if ("SUPER_ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("حذف سوپر ادمین مجاز نیست");
        }
        userRepository.delete(user);
    }

    // ============================================================
    //  💰 همه تراکنش‌ها
    // ============================================================
    public List<Map<String, Object>> getAllTransactions(
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
        for (Order o : pageData) result.add(sanitizeOrder(o));
        return result;
    }

    // ============================================================
    //  🆕 ویرایش ساده نانوایی (فقط ۵ فیلد)
    // ============================================================
    public Map<String, Object> updateTenant(String id, Map<String, Object> body) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("نانوایی یافت نشد"));

        // ===== ۱. نام (الزامی + یکتا) =====
        if (body.containsKey("name")) {
            String name = String.valueOf(body.get("name")).trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("نام نانوایی الزامی است");
            }
            Optional<Tenant> dup = tenantRepository.findByName(name);
            if (dup.isPresent() && !dup.get().getId().equals(id)) {
                throw new IllegalArgumentException("این نام قبلاً برای نانوایی دیگری استفاده شده است");
            }
            tenant.setName(name);
        }

        // ===== ۲. آدرس =====
        if (body.containsKey("address")) {
            Object v = body.get("address");
            tenant.setAddress(v != null ? String.valueOf(v).trim() : null);
        }

        // ===== ۳. تلفن =====
        if (body.containsKey("phone")) {
            Object v = body.get("phone");
            tenant.setPhone(v != null ? String.valueOf(v).trim() : null);
        }

        // ===== ۴. فعال / غیرفعال =====
        if (body.containsKey("enabled")) {
            Object v = body.get("enabled");
            if (v instanceof Boolean) {
                tenant.setEnabled((Boolean) v);
            }
        }

        // ===== ۵. درگاه پرداخت =====
        if (body.containsKey("zarinpalEnabled")) {
            Object v = body.get("zarinpalEnabled");
            if (v instanceof Boolean) {
                tenant.setZarinpalEnabled((Boolean) v);
            }
        }

        tenant.setUpdatedAt(LocalDateTime.now());
        Tenant saved = tenantRepository.save(tenant);

        log.info("✏️ نانوایی '{}' به‌روزرسانی شد", saved.getName());

        Map<String, Object> result = new HashMap<>();
        result.put("id", saved.getId());
        result.put("name", saved.getName());
        result.put("address", saved.getAddress());
        result.put("phone", saved.getPhone());
        result.put("enabled", saved.getEnabled());
        result.put("zarinpalEnabled", saved.getZarinpalEnabled());
        result.put("productCount", saved.getProductCount());
        return result;
    }

    // ============================================================
    //  🔬 دیباگ
    // ============================================================
    public Map<String, Object> getDebugInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("rawCounts", Map.of(
                "users", userRepository.count(),
                "tenants", tenantRepository.count(),
                "products", productRepository.count(),
                "orders", orderRepository.count()));
        return info;
    }

    // ============================================================
    //  Helper methods
    // ============================================================
    private Map<String, Object> sanitizeUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("fullName", user.getFullName());
        map.put("phone", user.getPhone());
        map.put("email", user.getEmail());
        map.put("role", user.getRole());
        map.put("availableRoles", user.getAvailableRoles());
        map.put("tenantId", user.getTenantId());
        map.put("enabled", user.isEnabled());
        return map;
    }

    private Map<String, Object> sanitizeOrder(Order o) {
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
        return map;
    }
}