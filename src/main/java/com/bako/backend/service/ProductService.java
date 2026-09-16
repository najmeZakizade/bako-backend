package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Product;
import com.bako.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> getAllProducts(String tenantId) {
        return productRepository.findByTenantId(tenantId);
    }

    public Optional<Product> getProductById(String id, String tenantId) {
        return productRepository.findByIdAndTenantId(id, tenantId);
    }

    public Product getProductOrThrow(String id, String tenantId) {
        return getProductById(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "محصول با شناسه '" + id + "' در این نانوایی پیدا نشد."));
    }

    public List<Product> searchByName(String name, String tenantId) {
        return productRepository.findByTenantIdAndNameContainingIgnoreCase(tenantId, name);
    }

    public List<Product> getProductsByCategory(String category, String tenantId) {
        return productRepository.findByTenantIdAndCategory(tenantId, category);
    }

    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    public Product updateProduct(String id, Product updatedProduct, String tenantId) {
        Product existing = getProductOrThrow(id, tenantId);
        existing.setName(updatedProduct.getName());
        existing.setDescription(updatedProduct.getDescription());
        existing.setPrice(updatedProduct.getPrice());
        existing.setStock(updatedProduct.getStock());
        existing.setCategory(updatedProduct.getCategory());
        existing.setImageUrl(updatedProduct.getImageUrl());
        return productRepository.save(existing);
    }

    public void deleteProduct(String id, String tenantId) {
        Product product = getProductOrThrow(id, tenantId);
        productRepository.delete(product);
        log.info("🗑️ محصول با شناسه {} از نانوایی {} حذف شد.", id, tenantId);
    }

    // ===== کاهش موجودی به مقدار مشخص (برای سفارش‌ها) =====
    public void decreaseStock(String productId, int quantity, String tenantId) {
        Product product = getProductOrThrow(productId, tenantId);

        if (product.getStock() < quantity) {
            throw new RuntimeException("موجودی محصول '" + product.getName() + "' کافی نیست. موجودی فعلی: " + product.getStock());
        }

        product.setStock(product.getStock() - quantity);
        productRepository.save(product);
        log.info("📉 موجودی محصول {} از {} به {} کاهش یافت.",
                product.getName(), product.getStock() + quantity, product.getStock());
    }

    // ===== کاهش یک واحد (برای استفاده در جاهای دیگر) =====
    public boolean decreaseStockByOne(String productId, String tenantId) {
        Product product = getProductOrThrow(productId, tenantId);
        if (product.getStock() > 0) {
            product.setStock(product.getStock() - 1);
            productRepository.save(product);
            return true;
        }
        return false;
    }

    public void increaseStock(String productId, int amount, String tenantId) {
        Product product = getProductOrThrow(productId, tenantId);
        product.setStock(product.getStock() + amount);
        productRepository.save(product);
    }
}
