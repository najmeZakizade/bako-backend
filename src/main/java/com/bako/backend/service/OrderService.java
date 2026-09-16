package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.CartItem;
import com.bako.backend.model.Courier;
import com.bako.backend.model.Order;
import com.bako.backend.repository.CourierRepository;
import com.bako.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final CourierRepository courierRepository;
    private final DeliveryService deliveryService;
    private final NotificationService notificationService;

    // ============================================================
    //  خواندن سفارشات
    // ============================================================

    public List<Order> getAllOrders(String tenantId) {
        return orderRepository.findByTenantId(tenantId);
    }

    public List<Order> getOrdersByStatus(String status, String tenantId) {
        return orderRepository.findByTenantIdAndStatus(tenantId, status);
    }

    public Order getOrderById(String id, String tenantId) {
        return orderRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "سفارش با شناسه '" + id + "' در این نانوایی پیدا نشد."));
    }

    public Order getOrderByIdForCustomer(String id, String customerPhone) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "سفارش با شناسه '" + id + "' پیدا نشد."));

        if (customerPhone == null || !customerPhone.equals(order.getPhone())) {
            throw new ResourceNotFoundException("این سفارش به شما تعلق ندارد.");
        }
        return order;
    }

    public List<Order> getOrdersByPhone(String phone, String tenantId) {
        return orderRepository.findByTenantIdAndPhone(tenantId, phone);
    }

    public List<Order> getOrdersByPhone(String phone) {
        return orderRepository.findByPhone(phone);
    }

    // ============================================================
    //  ثبت سفارش جدید + اعلان به نانوایی
    // ============================================================

    @Transactional
    public Order createOrder(Order order) {
        String tenantId = order.getTenantId();

        // ===== کاهش موجودی =====
        for (CartItem item : order.getItems()) {
            try {
                productService.decreaseStock(item.getProductId(), item.getQuantity(), tenantId);
            } catch (RuntimeException e) {
                throw new RuntimeException("موجودی کافی نیست: " + e.getMessage());
            }
        }

        order.setOrderDate(LocalDateTime.now());
        order.setStatus("PENDING");

        if ("PICKUP".equals(order.getDeliveryMethod())) {
            order.setCustomerReceived(true);
            order.setCustomerReceivedAt(LocalDateTime.now());
        } else if (order.getCustomerReceived() == null) {
            order.setCustomerReceived(false);
        }

        Order saved = orderRepository.save(order);

        // 🔔 اعلان به نانوایی
        try {
            notificationService.createNotification(
                    "BAKERY",
                    tenantId,
                    "ORDER_CREATED",
                    "🛒 سفارش جدید ثبت شد",
                    String.format("سفارش #%s از طرف «%s» به مبلغ %s ریال",
                            String.valueOf(saved.getId()).length() > 6
                                    ? String.valueOf(saved.getId()).substring(String.valueOf(saved.getId()).length() - 6)
                                    : saved.getId(),
                            saved.getCustomerName() != null ? saved.getCustomerName() : "ناشناس",
                            saved.getTotalPrice() != null ? saved.getTotalPrice() : 0),
                    saved.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان نانوایی: {}", e.getMessage());
        }

        log.info("📦 سفارش جدید با شناسه {} برای نانوایی {} ثبت شد.", saved.getId(), tenantId);
        return saved;
    }

    // ============================================================
    //  تغییر وضعیت + اعلان به مشتری
    // ============================================================

    public Order updateOrderStatus(String id, String status, String tenantId) {
        Order order = getOrderById(id, tenantId);
        order.setStatus(status);
        Order saved = orderRepository.save(order);

        // 🔔 اعلان به مشتری
        try {
            String statusLabel = getStatusLabel(status);
            notificationService.createNotification(
                    "CUSTOMER",
                    saved.getPhone(),
                    "ORDER_STATUS_CHANGED",
                    "📋 وضعیت سفارش شما تغییر کرد",
                    String.format("سفارش #%s شما اکنون «%s» است.",
                            shortId(saved.getId()), statusLabel),
                    saved.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان مشتری: {}", e.getMessage());
        }

        return saved;
    }

    public void cancelOrder(String id, String tenantId) {
        Order order = getOrderById(id, tenantId);
        order.setStatus("CANCELLED");
        orderRepository.save(order);

        try {
            notificationService.createNotification(
                    "CUSTOMER",
                    order.getPhone(),
                    "ORDER_STATUS_CHANGED",
                    "❌ سفارش شما لغو شد",
                    String.format("سفارش #%s شما لغو شد.", shortId(order.getId())),
                    order.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان: {}", e.getMessage());
        }
    }

    public void deleteOrder(String id, String tenantId) {
        Order order = getOrderById(id, tenantId);
        orderRepository.delete(order);
    }

    // ============================================================
    //  تخصیص پیک + اعلان به مشتری
    // ============================================================

    @Transactional
    public Order assignCourier(String orderId, String courierId, String tenantId) {
        Order order = getOrderById(orderId, tenantId);

        if ("DELIVERED".equals(order.getStatus())) {
            throw new IllegalStateException("این سفارش تحویل داده شده و قابل تغییر نیست.");
        }
        if ("CANCELLED".equals(order.getStatus())) {
            throw new IllegalStateException("این سفارش لغو شده و قابل تغییر نیست.");
        }

        Courier courier = courierRepository.findByIdAndTenantId(courierId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "پیک با شناسه '" + courierId + "' پیدا نشد."));

        if (!courier.isEnabled()) {
            throw new IllegalStateException("پیک غیرفعال است.");
        }

        Long deliveryPrice;
        Long commission;
        Long payout;

        if (order.getDeliveryPrice() != null && order.getDeliveryPrice() > 0) {
            deliveryPrice = order.getDeliveryPrice();
            Map<String, Object> cost = deliveryService.calculateDeliveryCost(
                    tenantId, order.getDestinationLat(), order.getDestinationLng(), order.getTotalPrice());
            if (cost.containsKey("error")) {
                commission = Math.round(deliveryPrice * 0.20);
                payout = deliveryPrice - commission;
            } else {
                commission = ((Number) cost.get("bakeryCommission")).longValue();
                payout = ((Number) cost.get("courierShare")).longValue();
            }
        } else {
            if (order.getDestinationLat() == null || order.getDestinationLng() == null) {
                throw new IllegalStateException("مختصات مقصد ثبت نشده است.");
            }
            Map<String, Object> cost = deliveryService.calculateDeliveryCost(
                    tenantId, order.getDestinationLat(), order.getDestinationLng(), order.getTotalPrice());
            if (cost.containsKey("error")) {
                throw new IllegalStateException((String) cost.get("message"));
            }
            deliveryPrice = ((Number) cost.get("price")).longValue();
            commission = ((Number) cost.get("bakeryCommission")).longValue();
            payout = ((Number) cost.get("courierShare")).longValue();
            if (order.getDeliveryDistance() == null && cost.get("distance") != null) {
                order.setDeliveryDistance((int) Math.round(((Number) cost.get("distance")).doubleValue()));
            }
        }

        order.setCourierId(courier.getId());
        order.setCourierName(courier.getFullName());
        order.setCourierPhone(courier.getPhone());
        order.setCourierVehicleType(courier.getVehicleType());
        order.setCourierVehiclePlate(courier.getVehiclePlate());
        order.setCourierAssignedAt(LocalDateTime.now());
        order.setDeliveryPrice(deliveryPrice);
        order.setCourierCommission(commission);
        order.setCourierPayout(payout);

        if ("PENDING".equals(order.getStatus()) || "CONFIRMED".equals(order.getStatus())) {
            order.setStatus("PREPARING");
        }

        Order saved = orderRepository.save(order);

        // 🔔 اعلان به مشتری
        try {
            notificationService.createNotification(
                    "CUSTOMER",
                    saved.getPhone(),
                    "COURIER_ASSIGNED",
                    "🛵 پیک سفارش شما تعیین شد",
                    String.format("پیک «%s» برای ارسال سفارش #%s تعیین شد.",
                            courier.getFullName() != null ? courier.getFullName() : "—",
                            shortId(saved.getId())),
                    saved.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان مشتری: {}", e.getMessage());
        }

        return saved;
    }

    @Transactional
    public Order unassignCourier(String orderId, String tenantId) {
        Order order = getOrderById(orderId, tenantId);

        if (order.getCourierId() == null || order.getCourierId().isEmpty()) {
            throw new IllegalStateException("این سفارش پیکی ندارد.");
        }
        if ("DELIVERED".equals(order.getStatus())) {
            throw new IllegalStateException("سفارش تحویل داده شده و قابل تغییر نیست.");
        }

        order.setCourierId(null);
        order.setCourierName(null);
        order.setCourierPhone(null);
        order.setCourierVehicleType(null);
        order.setCourierVehiclePlate(null);
        order.setCourierAssignedAt(null);
        order.setCourierCommission(null);
        order.setCourierPayout(null);

        if ("PREPARING".equals(order.getStatus())) {
            order.setStatus("CONFIRMED");
        }
        return orderRepository.save(order);
    }

    // ============================================================
    //  علامت‌گذاری تحویل داده‌شده + اعلان به مشتری
    // ============================================================

    @Transactional
    public Order markAsDelivered(String orderId, String tenantId) {
        Order order = getOrderById(orderId, tenantId);
        order.setStatus("DELIVERED");
        Order saved = orderRepository.save(order);

        try {
            notificationService.createNotification(
                    "CUSTOMER",
                    saved.getPhone(),
                    "ORDER_DELIVERED",
                    "✅ سفارش شما تحویل داده شد",
                    String.format("سفارش #%s با موفقیت تحویل داده شد. لطفاً دریافت خود را تأیید کنید.",
                            shortId(saved.getId())),
                    saved.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان مشتری: {}", e.getMessage());
        }

        return saved;
    }

    // ============================================================
    //  تأیید دریافت توسط مشتری + اعلان به نانوایی
    // ============================================================

    @Transactional
    public Order markCustomerReceived(String orderId, String customerPhone) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("سفارش یافت نشد."));

        if (customerPhone == null || !customerPhone.equals(order.getPhone())) {
            throw new ResourceNotFoundException("این سفارش به شما تعلق ندارد.");
        }

        if (Boolean.TRUE.equals(order.getCustomerReceived())) {
            return order;
        }

        order.setCustomerReceived(true);
        order.setCustomerReceivedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);

        // 🔔 اعلان به نانوایی
        try {
            notificationService.createNotification(
                    "BAKERY",
                    saved.getTenantId(),
                    "ORDER_RECEIVED",
                    "✅ مشتری دریافت سفارش را تأیید کرد",
                    String.format("مشتری «%s» دریافت سفارش #%s را تأیید کرد.",
                            saved.getCustomerName() != null ? saved.getCustomerName() : "—",
                            shortId(saved.getId())),
                    saved.getId()
            );
        } catch (Exception e) {
            log.warn("⚠️ خطا در ایجاد اعلان نانوایی: {}", e.getMessage());
        }

        return saved;
    }

    // ============================================================
    //  Helper
    // ============================================================
    private String shortId(String id) {
        if (id == null) return "—";
        return id.length() > 6 ? id.substring(id.length() - 6) : id;
    }

    private String getStatusLabel(String status) {
        if (status == null) return "—";
        switch (status) {
            case "PENDING":    return "در انتظار";
            case "CONFIRMED":  return "تأیید شده";
            case "PREPARING":  return "در حال آماده‌سازی";
            case "READY":      return "آماده تحویل";
            case "DELIVERED":  return "تحویل شد";
            case "CANCELLED":  return "لغو شده";
            default:           return status;
        }
    }
}