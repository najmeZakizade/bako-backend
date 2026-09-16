package com.bako.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /**
     * ذخیره فایل تصویر و برگرداندن URL نسبی
     * @return URL نسبی مثل "/uploads/products/abc-123.jpg"
     */
    public String storeFile(MultipartFile file, String subfolder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // چک نوع فایل
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("فقط فایل تصویری مجاز است.");
        }

        // چک حجم فایل (حداکثر ۵ مگابایت)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("حجم فایل نمی‌تواند بیشتر از ۵ مگابایت باشد.");
        }

        try {
            // ساخت مسیر پوشه
            Path uploadPath = Paths.get(uploadDir, subfolder).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            // ساخت نام یکتا
            String originalName = file.getOriginalFilename();
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            }
            if (extension.isEmpty() || !extension.matches("\\.(jpg|jpeg|png|gif|webp)")) {
                extension = ".jpg";
            }

            String uniqueName = UUID.randomUUID() + extension;

            // ذخیره فایل
            Path targetPath = uploadPath.resolve(uniqueName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String url = "/uploads/" + subfolder + "/" + uniqueName;
            log.info("📸 فایل ذخیره شد: {}", url);
            return url;

        } catch (IOException e) {
            log.error("❌ خطا در ذخیره فایل: {}", e.getMessage());
            throw new RuntimeException("خطا در ذخیره فایل: " + e.getMessage());
        }
    }

    /**
     * حذف فایل قدیمی (اختیاری)
     */
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/uploads/")) return;
        try {
            String relativePath = fileUrl.replace("/uploads/", "");
            Path filePath = Paths.get(uploadDir, relativePath).toAbsolutePath().normalize();
            Files.deleteIfExists(filePath);
            log.info("🗑️ فایل حذف شد: {}", fileUrl);
        } catch (IOException e) {
            log.warn("⚠️ خطا در حذف فایل: {}", e.getMessage());
        }
    }
}