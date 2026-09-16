package com.bako.backend.controller;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Product;
import com.bako.backend.service.FileStorageService;
import com.bako.backend.service.ProductService;
import com.bako.backend.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final FileStorageService fileStorageService;

    // ===== مقدار پیش‌فرض برای تست (در صورت خالی بودن SecurityContext) =====
    @Value("${app.test.tenant-id:BAKERY_1}")
    private String defaultTenantId;

    // ===== متد کمکی برای دریافت tenantId =====
    private String getCurrentTenantId() {
        String tenantId = SecurityUtils.getCurrentTenantId();
        if (tenantId == null) {
            log.warn("⚠️ هیچ کاربری لاگین نیست. از tenantId پیش‌فرض '{}' استفاده می‌شود.", defaultTenantId);
            return defaultTenantId;
        }
        return tenantId;
    }

    // ============================================================
    //  🆕 متد کمکی — انتخاب tenantId با اولویت پارامتر درخواست
    //  - اگه tenantId در query string باشه → همون (برای مشتری)
    //  - وگرنه → از کاربر لاگین‌شده (برای صاحب نانوایی)
    // ============================================================
    private String resolveTenantId(String requestedTenantId) {
        if (requestedTenantId != null && !requestedTenantId.trim().isEmpty()) {
            return requestedTenantId.trim();
        }
        return getCurrentTenantId();
    }

    // ==========================================
    //  ۰. آپلود تصویر محصول (POST multipart)
    //  ⚠️ این متد باید بالای getById باشد تا با {id} تداخل نکند
    // ==========================================
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        log.info("📥 درخواست آپلود تصویر: name={}, size={} bytes",
                file != null ? file.getOriginalFilename() : "null",
                file != null ? file.getSize() : 0);

        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "فایلی انتخاب نشده است."));
            }

            String url = fileStorageService.storeFile(file, "products");

            if (url == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "خطا در ذخیره فایل."));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("imageUrl", url);
            response.put("message", "✅ تصویر با موفقیت آپلود شد.");
            response.put("fileName", file.getOriginalFilename());
            response.put("size", file.getSize());

            log.info("✅ تصویر آپلود شد: {}", url);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("❌ خطای اعتبارسنجی: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ خطا در آپلود تصویر: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "خطا در آپلود تصویر: " + e.getMessage()));
        }
    }

    // ============================================================
    //  ۱. دریافت محصولات (GET)
    //  🆕 حالا پشتیبانی از tenantId و فیلترها در query string
    //
    //  نمونه‌ها:
    //    GET /api/products
    //    GET /api/products?tenantId=BAKERY_1
    //    GET /api/products?tenantId=BAKERY_1&category=نان
    //    GET /api/products?tenantId=BAKERY_1&search=باگت
    //    GET /api/products?tenantId=BAKERY_1&enabled=true
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts(
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) Boolean featured
    ) {
        // ===== تعیین tenantId نهایی =====
        String finalTenantId = resolveTenantId(tenantId);

        log.info("📋 درخواست محصولات | tenantId: {}, category: {}, search: {}, enabled: {}",
                finalTenantId, category, search, enabled);

        List<Product> products;

        // ============================================================
        //  حالت ۱: جستجو با نام (search)
        // ============================================================
        if (search != null && !search.trim().isEmpty()) {
            products = productService.searchByName(search.trim(), finalTenantId);
        }
        // ============================================================
        //  حالت ۲: فیلتر بر اساس دسته‌بندی
        // ============================================================
        else if (category != null && !category.trim().isEmpty()) {
            products = productService.getProductsByCategory(category.trim(), finalTenantId);

            // اگه enabled هم داده شده بود، فیلتر کن
            if (Boolean.TRUE.equals(enabled)) {
                products = products.stream()
                        .filter(p -> Boolean.TRUE.equals(p.getEnabled()))
                        .toList();
            }
        }
        // ============================================================
        //  حالت ۳: همه محصولات نانوایی
        // ============================================================
        else {
            products = productService.getAllProducts(finalTenantId);

            // فیلتر enabled
            if (Boolean.TRUE.equals(enabled)) {
                products = products.stream()
                        .filter(p -> Boolean.TRUE.equals(p.getEnabled()))
                        .toList();
            }

            // فیلتر featured
            if (Boolean.TRUE.equals(featured)) {
                products = products.stream()
                        .filter(p -> Boolean.TRUE.equals(p.getFeatured()))
                        .toList();
            }
        }

        log.info("✅ {} محصول برای نانوایی {} برگشت داده شد.", products.size(), finalTenantId);
        return ResponseEntity.ok(products);
    }

    // ============================================================
    //  ۲. جستجوی محصول با نام (GET)
    //  🆕 حالا tenantId اختیاری از query string
    // ============================================================
    @GetMapping("/search")
    public ResponseEntity<List<Product>> searchByName(
            @RequestParam String name,
            @RequestParam(required = false) String tenantId
    ) {
        String finalTenantId = resolveTenantId(tenantId);
        List<Product> products = productService.searchByName(name, finalTenantId);
        log.info("🔍 {} محصول با نام '{}' در نانوایی {} یافت شد.", products.size(), name, finalTenantId);
        return ResponseEntity.ok(products);
    }

    // ==========================================
    //  ۳. دریافت یک محصول با ID (GET)
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        Product product = productService.getProductOrThrow(id, tenantId);
        return ResponseEntity.ok(product);
    }

    // ============================================================
    //  ۴. دریافت محصولات بر اساس دسته‌بندی (GET)
    //  🆕 حالا tenantId اختیاری از query string
    // ============================================================
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Product>> getByCategory(
            @PathVariable String category,
            @RequestParam(required = false) String tenantId
    ) {
        String finalTenantId = resolveTenantId(tenantId);
        List<Product> products = productService.getProductsByCategory(category, finalTenantId);
        return ResponseEntity.ok(products);
    }

    // ==========================================
    //  ۵. اضافه کردن محصول جدید (POST)
    // ==========================================
    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody Product product) {
        String tenantId = getCurrentTenantId();
        product.setTenantId(tenantId);

        // اگه تصویر داده نشده بود، تصویر پیش‌فرض بذار
        if (product.getImageUrl() == null || product.getImageUrl().trim().isEmpty()) {
            product.setImageUrl("/images/default-bread.png");
        }

        Product saved = productService.createProduct(product);
        log.info("➕ محصول جدید '{}' در نانوایی {} ایجاد شد.", saved.getName(), tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ==========================================
    //  ۶. ویرایش محصول (PUT)
    // ==========================================
    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable String id, @Valid @RequestBody Product product) {
        String tenantId = getCurrentTenantId();

        if (!tenantId.equals(product.getTenantId())) {
            throw new ResourceNotFoundException("شما مجاز به ویرایش محصول در این نانوایی نیستید.");
        }

        Product updated = productService.updateProduct(id, product, tenantId);
        log.info("✏️ محصول با شناسه {} در نانوایی {} به‌روزرسانی شد.", id, tenantId);
        return ResponseEntity.ok(updated);
    }

    // ==========================================
    //  ۷. حذف محصول (DELETE)
    // ==========================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String tenantId = getCurrentTenantId();
        productService.deleteProduct(id, tenantId);
        log.info("🗑️ محصول با شناسه {} از نانوایی {} حذف شد.", id, tenantId);
        return ResponseEntity.noContent().build();
    }
}