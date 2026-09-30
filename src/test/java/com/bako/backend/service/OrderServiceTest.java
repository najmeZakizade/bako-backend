package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.CartItem;
import com.bako.backend.model.Courier;
import com.bako.backend.model.Order;
import com.bako.backend.repository.CourierRepository;
import com.bako.backend.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * تست‌های OrderService
 *
 * هدف: محافظت از قلب تجاری پروژه — جریان سفارش
 * نکات مهم:
 *   - multi-tenant isolation (هر نانوایی فقط سفارش‌های خودش رو می‌بینه)
 *   - assignCourier با منطق پیچیده‌ی commission
 *   - state machine معتبر
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("تست‌های OrderService")
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductService productService;
    @Mock private CourierRepository courierRepository;
    @Mock private DeliveryService deliveryService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private OrderService orderService;

    private static final String TENANT_ID = "tenant-1";
    private static final String OTHER_TENANT = "tenant-2";
    private static final String PHONE = "09123456789";
    private static final String ORDER_ID = "order-1";
    private static final String COURIER_ID = "courier-1";

    private Order sampleOrder;
    private Courier sampleCourier;

    @BeforeEach
    void setUp() {
        CartItem item = new CartItem();
        item.setProductId("prod-1");
        item.setQuantity(2);

        sampleOrder = new Order();
        sampleOrder.setId(ORDER_ID);
        sampleOrder.setTenantId(TENANT_ID);
        sampleOrder.setPhone(PHONE);
        sampleOrder.setCustomerName("علی رضایی");
        sampleOrder.setAddress("تهران، خیابان آزادی");
        sampleOrder.setDeliveryMethod("DELIVERY");
        sampleOrder.setStatus("PENDING");
        sampleOrder.setTotalPrice(20000L);
        sampleOrder.setItems(List.of(item));
        sampleOrder.setCustomerReceived(false);

        sampleCourier = new Courier();
        sampleCourier.setId(COURIER_ID);
        sampleCourier.setTenantId(TENANT_ID);
        sampleCourier.setFullName("رضا پیک");
        sampleCourier.setPhone("09987654321");
        sampleCourier.setVehicleType("MOTORCYCLE");
        sampleCourier.setVehiclePlate("12A345");
        sampleCourier.setEnabled(true);
    }

    // =================================================================
    //  بخش ۱: خواندن سفارشات
    // =================================================================
    @Nested
    @DisplayName("۱. خواندن سفارشات")
    class ReadTests {

        @Test
        @DisplayName("getAllOrders → لیست سفارشات نانوایی")
        void get_all_orders() {
            when(orderRepository.findByTenantId(TENANT_ID))
                    .thenReturn(List.of(sampleOrder));

            List<Order> result = orderService.getAllOrders(TENANT_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getTenantId()).isEqualTo(TENANT_ID);
        }

        @Test
        @DisplayName("getOrdersByStatus → فیلتر توسط status")
        void get_orders_by_status() {
            when(orderRepository.findByTenantIdAndStatus(TENANT_ID, "PENDING"))
                    .thenReturn(List.of(sampleOrder));

            List<Order> result = orderService.getOrdersByStatus("PENDING", TENANT_ID);

            assertThat(result).hasSize(1);
            verify(orderRepository).findByTenantIdAndStatus(TENANT_ID, "PENDING");
        }

        @Test
        @DisplayName("getOrderById با tenantId → پیدا می‌کنه")
        void get_order_by_id_and_tenant() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));

            Order result = orderService.getOrderById(ORDER_ID, TENANT_ID);

            assertThat(result.getId()).isEqualTo(ORDER_ID);
        }

        @Test
        @DisplayName("🚨 getOrderById با tenant اشتباه → استثنا (multi-tenant isolation)")
        void get_order_wrong_tenant_should_throw() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, OTHER_TENANT))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.getOrderById(ORDER_ID, OTHER_TENANT))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("پیدا نشد");
        }

        @Test
        @DisplayName("getOrderById (بدون tenant) → super admin می‌تونه همه رو ببینه")
        void super_admin_can_see_any_order() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            Order result = orderService.getOrderById(ORDER_ID);

            assertThat(result.getId()).isEqualTo(ORDER_ID);
        }

        @Test
        @DisplayName("getOrdersByPhone(tenant) → سفارش‌های یه شماره تو یه نانوایی")
        void get_orders_by_phone_and_tenant() {
            when(orderRepository.findByTenantIdAndPhone(TENANT_ID, PHONE))
                    .thenReturn(List.of(sampleOrder));

            List<Order> result = orderService.getOrdersByPhone(PHONE, TENANT_ID);

            assertThat(result).hasSize(1);
        }
    }

    // =================================================================
    //  بخش ۲: مالکیت سفارش (مشتری)
    // =================================================================
    @Nested
    @DisplayName("۲. مالکیت سفارش مشتری")
    class OwnershipTests {

        @Test
        @DisplayName("getOrderByIdForCustomer با phone درست → OK")
        void customer_can_see_own_order() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            Order result = orderService.getOrderByIdForCustomer(ORDER_ID, PHONE);

            assertThat(result.getId()).isEqualTo(ORDER_ID);
        }

        @Test
        @DisplayName("🚨 getOrderByIdForCustomer با phone اشتباه → استثنا")
        void customer_cannot_see_others_order() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.getOrderByIdForCustomer(ORDER_ID, "09999999999"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("تعلق ندارد");
        }

        @Test
        @DisplayName("🚨 getOrderByIdForCustomer با phone نال → استثنا")
        void null_phone_should_throw() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.getOrderByIdForCustomer(ORDER_ID, null))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =================================================================
    //  بخش ۳: ثبت سفارش جدید
    // =================================================================
    @Nested
    @DisplayName("۳. ثبت سفارش جدید")
    class CreateOrderTests {

        @Test
        @DisplayName("createOrder → status=PENDING و orderDate ست می‌شه")
        void create_sets_status_and_date() {
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.createOrder(sampleOrder);

            assertThat(result.getStatus()).isEqualTo("PENDING");
            assertThat(result.getOrderDate()).isNotNull();
        }

        @Test
        @DisplayName("createOrder → برای هر آیتم decreaseStock صدا زده می‌شه")
        void create_decreases_stock_for_each_item() {
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.createOrder(sampleOrder);

            verify(productService, times(1))
                    .decreaseStock("prod-1", 2, TENANT_ID);
        }

        @Test
        @DisplayName("🚨 createOrder وقتی موجودی کافی نیست → استثنا و save صدا زده نمی‌شه")
        void create_throws_when_stock_insufficient() {
            doThrow(new RuntimeException("موجودی کافی نیست"))
                    .when(productService).decreaseStock(anyString(), anyInt(), anyString());

            assertThatThrownBy(() -> orderService.createOrder(sampleOrder))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("موجودی کافی نیست");

            verify(orderRepository, never()).save(any());
        }

        @Test
        @DisplayName("createOrder با PICKUP → customerReceived=true")
        void create_pickup_sets_received_true() {
            sampleOrder.setDeliveryMethod("PICKUP");
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.createOrder(sampleOrder);

            assertThat(result.getCustomerReceived()).isTrue();
            assertThat(result.getCustomerReceivedAt()).isNotNull();
        }

        @Test
        @DisplayName("createOrder با DELIVERY → customerReceived=false")
        void create_delivery_sets_received_false() {
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.createOrder(sampleOrder);

            assertThat(result.getCustomerReceived()).isFalse();
        }

        @Test
        @DisplayName("createOrder → اعلان به نانوایی فرستاده می‌شه")
        void create_sends_bakery_notification() {
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.createOrder(sampleOrder);

            verify(notificationService).createNotification(
                    eq("BAKERY"), eq(TENANT_ID), eq("ORDER_CREATED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }
    }

    // =================================================================
    //  بخش ۴: تغییر وضعیت / لغو / حذف
    // =================================================================
    @Nested
    @DisplayName("۴. تغییر وضعیت و حذف")
    class UpdateStatusTests {

        @Test
        @DisplayName("updateOrderStatus → status عوض می‌شه")
        void update_status() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.updateOrderStatus(ORDER_ID, "CONFIRMED", TENANT_ID);

            assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        }

        @Test
        @DisplayName("updateOrderStatus → اعلان به مشتری")
        void update_status_sends_notification() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.updateOrderStatus(ORDER_ID, "PREPARING", TENANT_ID);

            verify(notificationService).createNotification(
                    eq("CUSTOMER"), eq(PHONE), eq("ORDER_STATUS_CHANGED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }

        @Test
        @DisplayName("cancelOrder → status=CANCELLED + اعلان به مشتری")
        void cancel_order() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.cancelOrder(ORDER_ID, TENANT_ID);

            assertThat(sampleOrder.getStatus()).isEqualTo("CANCELLED");
            verify(notificationService).createNotification(
                    eq("CUSTOMER"), eq(PHONE), eq("ORDER_STATUS_CHANGED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }

        @Test
        @DisplayName("deleteOrder → delete صدا زده می‌شه")
        void delete_order() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));

            orderService.deleteOrder(ORDER_ID, TENANT_ID);

            verify(orderRepository).delete(sampleOrder);
        }
    }

    // =================================================================
    //  بخش ۵: تخصیص پیک (پیچیده‌ترین)
    // =================================================================
    @Nested
    @DisplayName("۵. تخصیص پیک")
    class AssignCourierTests {

        @Test
        @DisplayName("🚨 سفارش DELIVERED → استثنا")
        void cannot_assign_to_delivered() {
            sampleOrder.setStatus("DELIVERED");
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("تحویل داده شده");
        }

        @Test
        @DisplayName("🚨 سفارش CANCELLED → استثنا")
        void cannot_assign_to_cancelled() {
            sampleOrder.setStatus("CANCELLED");
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("لغو شده");
        }

        @Test
        @DisplayName("🚨 پیک ناموجود → استثنا")
        void throws_when_courier_not_found() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(courierRepository.findByIdAndTenantId(COURIER_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("🚨 پیک غیرفعال → استثنا")
        void throws_when_courier_disabled() {
            sampleCourier.setEnabled(false);
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(courierRepository.findByIdAndTenantId(COURIER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleCourier));

            assertThatThrownBy(() ->
                    orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("غیرفعال");
        }

        @Test
        @DisplayName("تخصیص پیک → snapshot اطلاعات پیک ذخیره می‌شه")
        void assigns_courier_snapshot() {
            sampleOrder.setDeliveryPrice(15000L);
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(courierRepository.findByIdAndTenantId(COURIER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleCourier));
            when(deliveryService.calculateDeliveryCost(any(), any(), any(), any()))
                    .thenReturn(Map.of(
                            "bakeryCommission", 3000L,
                            "courierShare", 12000L
                    ));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID);

            assertThat(result.getCourierId()).isEqualTo(COURIER_ID);
            assertThat(result.getCourierName()).isEqualTo("رضا پیک");
            assertThat(result.getCourierPhone()).isEqualTo("09987654321");
            assertThat(result.getCourierVehicleType()).isEqualTo("MOTORCYCLE");
            assertThat(result.getCourierVehiclePlate()).isEqualTo("12A345");
            assertThat(result.getCourierAssignedAt()).isNotNull();
            assertThat(result.getCourierCommission()).isEqualTo(3000L);
            assertThat(result.getCourierPayout()).isEqualTo(12000L);
        }

        @Test
        @DisplayName("تخصیص پیک → status به PREPARING تغییر می‌کنه")
        void assign_sets_status_preparing() {
            sampleOrder.setDeliveryPrice(15000L);
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(courierRepository.findByIdAndTenantId(COURIER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleCourier));
            when(deliveryService.calculateDeliveryCost(any(), any(), any(), any()))
                    .thenReturn(Map.of("bakeryCommission", 3000L, "courierShare", 12000L));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID);

            assertThat(result.getStatus()).isEqualTo("PREPARING");
        }

        @Test
        @DisplayName("تخصیص پیک → اعلان به مشتری")
        void assign_sends_notification() {
            sampleOrder.setDeliveryPrice(15000L);
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(courierRepository.findByIdAndTenantId(COURIER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleCourier));
            when(deliveryService.calculateDeliveryCost(any(), any(), any(), any()))
                    .thenReturn(Map.of("bakeryCommission", 3000L, "courierShare", 12000L));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.assignCourier(ORDER_ID, COURIER_ID, TENANT_ID);

            verify(notificationService).createNotification(
                    eq("CUSTOMER"), eq(PHONE), eq("COURIER_ASSIGNED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }
    }

    // =================================================================
    //  بخش ۶: حذف پیک از سفارش
    // =================================================================
    @Nested
    @DisplayName("۶. حذف پیک از سفارش")
    class UnassignCourierTests {

        @Test
        @DisplayName("🚨 سفارشی که پیک نداره → استثنا")
        void throws_when_no_courier() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.unassignCourier(ORDER_ID, TENANT_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("پیکی ندارد");
        }

        @Test
        @DisplayName("حذف پیک → همه فیلدهای پیک null می‌شن")
        void clears_courier_data() {
            sampleOrder.setCourierId(COURIER_ID);
            sampleOrder.setCourierName("رضا");
            sampleOrder.setStatus("PREPARING");
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.unassignCourier(ORDER_ID, TENANT_ID);

            assertThat(result.getCourierId()).isNull();
            assertThat(result.getCourierName()).isNull();
            assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        }
    }

    // =================================================================
    //  بخش ۷: markAsDelivered
    // =================================================================
    @Nested
    @DisplayName("۷. علامت‌گذاری تحویل")
    class MarkDeliveredTests {

        @Test
        @DisplayName("markAsDelivered → status=DELIVERED + اعلان")
        void mark_delivered() {
            when(orderRepository.findByIdAndTenantId(ORDER_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.markAsDelivered(ORDER_ID, TENANT_ID);

            assertThat(result.getStatus()).isEqualTo("DELIVERED");
            verify(notificationService).createNotification(
                    eq("CUSTOMER"), eq(PHONE), eq("ORDER_DELIVERED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }
    }

    // =================================================================
    //  بخش ۸: تأیید دریافت توسط مشتری
    // =================================================================
    @Nested
    @DisplayName("۸. تأیید دریافت سفارش")
    class MarkReceivedTests {

        @Test
        @DisplayName("🚨 phone اشتباه → استثنا")
        void throws_when_phone_wrong() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            assertThatThrownBy(() ->
                    orderService.markCustomerReceived(ORDER_ID, "09999999999"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("تعلق ندارد");
        }

        @Test
        @DisplayName("تأیید دریافت → customerReceived=true")
        void marks_received() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.markCustomerReceived(ORDER_ID, PHONE);

            assertThat(result.getCustomerReceived()).isTrue();
            assertThat(result.getCustomerReceivedAt()).isNotNull();
        }

        @Test
        @DisplayName("تأیید تکراری → idempotent (save مجدد صدا زده نمی‌شه)")
        void idempotent_when_already_received() {
            sampleOrder.setCustomerReceived(true);
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));

            Order result = orderService.markCustomerReceived(ORDER_ID, PHONE);

            assertThat(result.getCustomerReceived()).isTrue();
            verify(orderRepository, never()).save(any());
        }

        @Test
        @DisplayName("تأیید دریافت → اعلان به نانوایی")
        void sends_bakery_notification() {
            when(orderRepository.findById(ORDER_ID))
                    .thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            orderService.markCustomerReceived(ORDER_ID, PHONE);

            verify(notificationService).createNotification(
                    eq("BAKERY"), eq(TENANT_ID), eq("ORDER_RECEIVED"),
                    anyString(), anyString(), eq(ORDER_ID));
        }
    }
}