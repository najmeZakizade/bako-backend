package com.bako.backend.repository;

import com.bako.backend.model.Address;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends MongoRepository<Address, String> {

    /** همه آدرس‌های یک کاربر — پیش‌فرض اول، بعد جدیدترین */
    List<Address> findByUserIdOrderByIsDefaultDescCreatedAtDesc(String userId);

    /** یه آدرس خاص از یه کاربر خاص */
    Optional<Address> findByIdAndUserId(String id, String userId);

    /** حذف همه آدرس‌های یه کاربر */
    void deleteByUserId(String userId);

    /** شمارش آدرس‌های کاربر */
    long countByUserId(String userId);
}