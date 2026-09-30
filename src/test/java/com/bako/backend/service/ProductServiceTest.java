package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Product;
import com.bako.backend.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * تست‌های ProductService
 *
 * هدف: محافظت از مدیریت محصولات و موجودی — بخش حیاتی عملیات نانوایی
 *
 * نکات کلیدی:
 *   - multi-tenant isolation
 *   - افزایش/کاهش موجودی (به‌ویژه با مقادیر منفی!)
 *   - CRUD کامل
 *   - جستجو
 *
 * ⭐️ نکته‌ی آموزشی:
 *   در ۴ تست اخیر، دیگه `when(productRepository.findByIdAndTenantId(...))` رو
 *   mock نمی‌کنیم چون ProductService قبل از هر DB call، ورودی رو اعتبارسنجی می‌کنه.
 *   این یعنی "Fail Fast" — ورودی نامعتبر اصلاً به DB نمی‌رسه.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("تست‌های ProductService")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    private static final String TENANT_ID = "tenant-1";
    private static final String OTHER_TENANT = "tenant-2";
    private static final String PRODUCT_ID = "product-1";

    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        sampleProduct = new Product();
        sampleProduct.setId(PRODUCT_ID);
        sampleProduct.setTenantId(TENANT_ID);
        sampleProduct.setName("سنگک");
        sampleProduct.setPrice(10_000.0);
        sampleProduct.setStock(50);
        sampleProduct.setCategory("نان");
        sampleProduct.setEnabled(true);
    }

    // =================================================================
    //  بخش ۱: خواندن محصولات
    // =================================================================
    @Nested
    @DisplayName("۱. خواندن محصولات")
    class ReadTests {

        @Test
        @DisplayName("getAllProducts → لیست محصولات نانوایی")
        void get_all_products() {
            when(productRepository.findByTenantId(TENANT_ID))
                    .thenReturn(List.of(sampleProduct));

            List<Product> result = productService.getAllProducts(TENANT_ID);

            assertThat(result).hasSize(1);
            verify(productRepository).findByTenantId(TENANT_ID);
        }

        @Test
        @DisplayName("getAllProducts نانوایی خالی → لیست خالی")
        void get_all_empty() {
            when(productRepository.findByTenantId(OTHER_TENANT))
                    .thenReturn(List.of());

            List<Product> result = productService.getAllProducts(OTHER_TENANT);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("getProductById با tenant درست → Optional پر")
        void get_by_id_with_correct_tenant() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));

            Optional<Product> result = productService.getProductById(PRODUCT_ID, TENANT_ID);

            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(PRODUCT_ID);
        }

        @Test
        @DisplayName("🚨 getProductById با tenant اشتباه → Optional خالی (multi-tenant isolation)")
        void get_by_id_wrong_tenant_returns_empty() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, OTHER_TENANT))
                    .thenReturn(Optional.empty());

            Optional<Product> result = productService.getProductById(PRODUCT_ID, OTHER_TENANT);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("getProductOrThrow با محصول موجود → محصول برمی‌گرده")
        void get_or_throw_found() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));

            Product result = productService.getProductOrThrow(PRODUCT_ID, TENANT_ID);

            assertThat(result.getName()).isEqualTo("سنگک");
        }

        @Test
        @DisplayName("🚨 getProductOrThrow نبود → ResourceNotFoundException")
        void get_or_throw_not_found() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    productService.getProductOrThrow(PRODUCT_ID, TENANT_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("پیدا نشد");
        }
    }

    // =================================================================
    //  بخش ۲: جستجو
    // =================================================================
    @Nested
    @DisplayName("۲. جستجو و فیلتر")
    class SearchTests {

        @Test
        @DisplayName("searchByName → نتیجه از repository")
        void search_by_name() {
            when(productRepository.findByTenantIdAndNameContainingIgnoreCase(TENANT_ID, "سنگ"))
                    .thenReturn(List.of(sampleProduct));

            List<Product> result = productService.searchByName("سنگ", TENANT_ID);

            assertThat(result).hasSize(1);
            verify(productRepository).findByTenantIdAndNameContainingIgnoreCase(TENANT_ID, "سنگ");
        }

        @Test
        @DisplayName("getProductsByCategory → نتیجه از repository")
        void get_by_category() {
            when(productRepository.findByTenantIdAndCategory(TENANT_ID, "نان"))
                    .thenReturn(List.of(sampleProduct));

            List<Product> result = productService.getProductsByCategory("نان", TENANT_ID);

            assertThat(result).hasSize(1);
        }
    }

    // =================================================================
    //  بخش ۳: ایجاد و به‌روزرسانی
    // =================================================================
    @Nested
    @DisplayName("۳. ایجاد و به‌روزرسانی")
    class CreateUpdateTests {

        @Test
        @DisplayName("createProduct → save صدا زده می‌شه")
        void create_product() {
            when(productRepository.save(sampleProduct)).thenReturn(sampleProduct);

            Product result = productService.createProduct(sampleProduct);

            assertThat(result.getId()).isEqualTo(PRODUCT_ID);
            verify(productRepository).save(sampleProduct);
        }

        @Test
        @DisplayName("updateProduct → فیلدها به‌روز می‌شن")
        void update_product() {
            Product updated = new Product();
            updated.setName("بربری");
            updated.setPrice(15_000.0);
            updated.setStock(30);
            updated.setCategory("نان");
            updated.setImageUrl("new.jpg");

            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Product result = productService.updateProduct(PRODUCT_ID, updated, TENANT_ID);

            assertThat(result.getName()).isEqualTo("بربری");
            assertThat(result.getPrice()).isEqualTo(15_000.0);
            assertThat(result.getStock()).isEqualTo(30);
        }

        @Test
        @DisplayName("🚨 updateProduct برای محصول یه نانوایی دیگه → استثنا")
        void update_wrong_tenant_throws() {
            Product updated = new Product();
            updated.setName("بربری");

            when(productRepository.findByIdAndTenantId(PRODUCT_ID, OTHER_TENANT))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    productService.updateProduct(PRODUCT_ID, updated, OTHER_TENANT))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(productRepository, never()).save(any());
        }
    }

    // =================================================================
    //  بخش ۴: حذف
    // =================================================================
    @Nested
    @DisplayName("۴. حذف محصول")
    class DeleteTests {

        @Test
        @DisplayName("deleteProduct → delete صدا زده می‌شه")
        void delete_product() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));

            productService.deleteProduct(PRODUCT_ID, TENANT_ID);

            verify(productRepository).delete(sampleProduct);
        }

        @Test
        @DisplayName("🚨 deleteProduct یه نانوایی دیگه → استثنا")
        void delete_wrong_tenant_throws() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, OTHER_TENANT))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    productService.deleteProduct(PRODUCT_ID, OTHER_TENANT))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(productRepository, never()).delete(any());
        }
    }

    // =================================================================
    //  بخش ۵: کاهش موجودی (decreaseStock)
    // =================================================================
    @Nested
    @DisplayName("۵. کاهش موجودی (decreaseStock)")
    class DecreaseStockTests {

        @Test
        @DisplayName("کاهش نرمال: ۵۰ → ۴۵ با quantity=5")
        void normal_decrease() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            productService.decreaseStock(PRODUCT_ID, 5, TENANT_ID);

            assertThat(sampleProduct.getStock()).isEqualTo(45);
            verify(productRepository).save(sampleProduct);
        }

        @Test
        @DisplayName("کاهش کل موجودی: ۵۰ → ۰ با quantity=50")
        void decrease_all_stock() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            productService.decreaseStock(PRODUCT_ID, 50, TENANT_ID);

            assertThat(sampleProduct.getStock()).isEqualTo(0);
        }

        @Test
        @DisplayName("🚨 quantity > stock → استثنا و موجودی تغییر نمی‌کنه")
        void decrease_more_than_stock_throws() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));

            assertThatThrownBy(() ->
                    productService.decreaseStock(PRODUCT_ID, 100, TENANT_ID))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("کافی نیست");

            assertThat(sampleProduct.getStock()).isEqualTo(50);
            verify(productRepository, never()).save(any());
        }

        @Test
        @DisplayName("🚨 quantity=0 → استثنا (Fail Fast، بدون دسترسی به DB)")
        void decrease_zero_should_throw() {
            // ⭐️ اعتبارسنجی قبل از دسترسی به DB انجام می‌شه، پس mock لازم نیست

            assertThatThrownBy(() ->
                    productService.decreaseStock(PRODUCT_ID, 0, TENANT_ID))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("مثبت");

            verify(productRepository, never()).save(any());
            verify(productRepository, never()).findByIdAndTenantId(anyString(), anyString());
        }

        @Test
        @DisplayName("🚨🚨 quantity منفی → استثنا (باگ رفع شد)")
        void decrease_negative_should_throw_BUG_DEMO() {
            // این تست ثابت می‌کنه که باگ قبلی (زیاد شدن موجودی با عدد منفی) رفع شده
            // قبلاً: quantity=-10 → موجودی ۵۰ به ۶۰ می‌رفت! 🚨
            // الان: قبل از هر DB call، استثنا می‌ندازه

            assertThatThrownBy(() ->
                    productService.decreaseStock(PRODUCT_ID, -10, TENANT_ID))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("مثبت");

            verify(productRepository, never()).save(any());
            verify(productRepository, never()).findByIdAndTenantId(anyString(), anyString());
        }

        @Test
        @DisplayName("🚨 decreaseStock محصول یه نانوایی دیگه → استثنا")
        void decrease_wrong_tenant_throws() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, OTHER_TENANT))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    productService.decreaseStock(PRODUCT_ID, 5, OTHER_TENANT))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // =================================================================
    //  بخش ۶: کاهش یک واحدی
    // =================================================================
    @Nested
    @DisplayName("۶. کاهش یک واحدی (decreaseStockByOne)")
    class DecreaseByOneTests {

        @Test
        @DisplayName("موجودی > 0 → کاهش و return true")
        void decrease_by_one_success() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            boolean result = productService.decreaseStockByOne(PRODUCT_ID, TENANT_ID);

            assertThat(result).isTrue();
            assertThat(sampleProduct.getStock()).isEqualTo(49);
        }

        @Test
        @DisplayName("موجودی = 0 → false، موجودی تغییر نمی‌کنه")
        void decrease_by_one_when_zero() {
            sampleProduct.setStock(0);
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));

            boolean result = productService.decreaseStockByOne(PRODUCT_ID, TENANT_ID);

            assertThat(result).isFalse();
            assertThat(sampleProduct.getStock()).isEqualTo(0);
            verify(productRepository, never()).save(any());
        }
    }

    // =================================================================
    //  بخش ۷: افزایش موجودی (increaseStock)
    // =================================================================
    @Nested
    @DisplayName("۷. افزایش موجودی (increaseStock)")
    class IncreaseStockTests {

        @Test
        @DisplayName("افزایش نرمال: ۵۰ → ۶۰ با amount=10")
        void normal_increase() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            productService.increaseStock(PRODUCT_ID, 10, TENANT_ID);

            assertThat(sampleProduct.getStock()).isEqualTo(60);
        }

        @Test
        @DisplayName("🚨 amount=0 → استثنا (Fail Fast، بدون دسترسی به DB)")
        void increase_zero_should_throw() {
            // ⭐️ اعتبارسنجی قبل از دسترسی به DB انجام می‌شه

            assertThatThrownBy(() ->
                    productService.increaseStock(PRODUCT_ID, 0, TENANT_ID))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("مثبت");

            verify(productRepository, never()).save(any());
            verify(productRepository, never()).findByIdAndTenantId(anyString(), anyString());
        }

        @Test
        @DisplayName("🚨🚨 amount منفی → استثنا (باگ رفع شد)")
        void increase_negative_should_throw_BUG_DEMO() {
            // این تست ثابت می‌کنه که باگ قبلی (کم شدن موجودی با عدد منفی) رفع شده
            // قبلاً: amount=-20 → موجودی ۵۰ به ۳۰ می‌رفت! 🚨
            // الان: قبل از هر DB call، استثنا می‌ندازه

            assertThatThrownBy(() ->
                    productService.increaseStock(PRODUCT_ID, -20, TENANT_ID))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("مثبت");

            verify(productRepository, never()).save(any());
            verify(productRepository, never()).findByIdAndTenantId(anyString(), anyString());
        }

        @Test
        @DisplayName("افزایش بیش از حد زیاد (بازگرداندن موجودی) → مجازه")
        void large_increase_allowed() {
            when(productRepository.findByIdAndTenantId(PRODUCT_ID, TENANT_ID))
                    .thenReturn(Optional.of(sampleProduct));
            when(productRepository.save(any(Product.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            productService.increaseStock(PRODUCT_ID, 1000, TENANT_ID);

            assertThat(sampleProduct.getStock()).isEqualTo(1050);
        }
    }
}