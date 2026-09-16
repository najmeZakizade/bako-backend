package com.bako.backend.config;

import com.bako.backend.model.User;
import com.bako.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("superadmin").isEmpty()) {
            User user = new User();
            user.setUsername("superadmin");
            user.setPassword(passwordEncoder.encode("superadmin123"));
            user.setRole("SUPER_ADMIN");
            user.setEnabled(true);
            userRepository.save(user);
            System.out.println("✅ سوپرادمین ایجاد شد.");
        }
    }
}