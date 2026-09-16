package com.bako.backend.service;

import com.bako.backend.exception.ResourceNotFoundException;
import com.bako.backend.model.User;
import com.bako.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers(String tenantId) {
        return userRepository.findByTenantId(tenantId);
    }

    public User getUserById(String id, String tenantId) {
        return userRepository.findById(id)
                .filter(user -> user.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * 🆕 چک وجود کاربر با شماره موبایل مشخص
     */
    public boolean existsByPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return false;
        }
        return Boolean.TRUE.equals(userRepository.existsByPhone(phone.trim()));
    }

    public User createUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEnabled(true);
        return userRepository.save(user);
    }

    public User updateUser(String id, User updatedUser, String tenantId) {
        User existing = getUserById(id, tenantId);
        existing.setUsername(updatedUser.getUsername());
        existing.setFullName(updatedUser.getFullName());
        existing.setPhone(updatedUser.getPhone());
        existing.setEmail(updatedUser.getEmail());
        existing.setRole(updatedUser.getRole());
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }
        return userRepository.save(existing);
    }

    public User enableUser(String id, String tenantId) {
        User user = getUserById(id, tenantId);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    public User disableUser(String id, String tenantId) {
        User user = getUserById(id, tenantId);
        user.setEnabled(false);
        return userRepository.save(user);
    }

    public void deleteUser(String id, String tenantId) {
        User user = getUserById(id, tenantId);
        userRepository.delete(user);
    }

    // ============================================================
    //  به‌روزرسانی نقش کاربر
    // ============================================================
    public User updateUserRole(String id, String newRole) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر با شناسه " + id + " یافت نشد."));
        user.setRole(newRole);
        log.info("🎯 نقش کاربر '{}' به '{}' تغییر یافت.", user.getUsername(), newRole);
        return userRepository.save(user);
    }

    // ============================================================
    //  متدهای پروفایل کاربر جاری
    // ============================================================

    public User getCurrentUserProfile(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("کاربر یافت نشد."));
    }

    public User updateCurrentUserProfile(String userId, Map<String, Object> body) {
        User user = getCurrentUserProfile(userId);

        if (body.containsKey("fullName")) {
            user.setFullName((String) body.get("fullName"));
        }
        if (body.containsKey("phone")) {
            user.setPhone((String) body.get("phone"));
        }
        if (body.containsKey("email")) {
            user.setEmail((String) body.get("email"));
        }

        log.info("✏️ پروفایل کاربر '{}' به‌روزرسانی شد.", user.getUsername());
        return userRepository.save(user);
    }
}