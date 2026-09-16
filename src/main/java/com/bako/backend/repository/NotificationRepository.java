package com.bako.backend.repository;

import com.bako.backend.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // لیست اعلان‌های گیرنده — جدیدترین اول
    List<Notification> findByRecipientTypeAndRecipientIdOrderByCreatedAtDesc(
            String recipientType, String recipientId);

    // فقط خوانده‌نشده‌ها
    List<Notification> findByRecipientTypeAndRecipientIdAndReadFalseOrderByCreatedAtDesc(
            String recipientType, String recipientId);

    // شمارش خوانده‌نشده‌ها
    long countByRecipientTypeAndRecipientIdAndReadFalse(
            String recipientType, String recipientId);

    // حذف همه اعلان‌های یه گیرنده
    void deleteByRecipientTypeAndRecipientId(String recipientType, String recipientId);
}