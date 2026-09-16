package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.Notification;
import com.bako.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ============================================================
    //  ایجاد اعلان جدید
    // ============================================================
    public Notification createNotification(
            String recipientType,
            String recipientId,
            String type,
            String title,
            String message,
            String orderId
    ) {
        if (recipientId == null || recipientId.trim().isEmpty()) {
            log.warn("⚠️ تلاش برای ایجاد اعلان بدون recipientId — نوع: {}", recipientType);
            return null;
        }

        Notification n = new Notification();
        n.setRecipientType(recipientType);
        n.setRecipientId(recipientId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setOrderId(orderId);
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());

        Notification saved = notificationRepository.save(n);
        log.info("🔔 اعلان جدید برای {} '{}': {}", recipientType, recipientId, title);
        return saved;
    }

    // ============================================================
    //  لیست همه اعلان‌های یه گیرنده
    // ============================================================
    public List<Notification> getNotifications(String recipientType, String recipientId) {
        return notificationRepository
                .findByRecipientTypeAndRecipientIdOrderByCreatedAtDesc(
                        recipientType, recipientId);
    }

    // ============================================================
    //  تعداد خوانده‌نشده‌ها
    // ============================================================
    public long getUnreadCount(String recipientType, String recipientId) {
        return notificationRepository
                .countByRecipientTypeAndRecipientIdAndReadFalse(
                        recipientType, recipientId);
    }

    // ============================================================
    //  علامت‌گذاری یه اعلان به عنوان خوانده‌شده
    // ============================================================
    public Notification markAsRead(String id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("اعلان یافت نشد."));
        if (!Boolean.TRUE.equals(n.getRead())) {
            n.setRead(true);
            n.setReadAt(LocalDateTime.now());
            notificationRepository.save(n);
        }
        return n;
    }

    // ============================================================
    //  علامت‌گذاری همه اعلان‌های یه گیرنده
    // ============================================================
    public int markAllAsRead(String recipientType, String recipientId) {
        List<Notification> unread = notificationRepository
                .findByRecipientTypeAndRecipientIdAndReadFalseOrderByCreatedAtDesc(
                        recipientType, recipientId);
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(n -> {
            n.setRead(true);
            n.setReadAt(now);
        });
        notificationRepository.saveAll(unread);
        return unread.size();
    }
}