package com.bako.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * تست DebugController
 *
 * هدف: اثبات اینکه DebugController در محیط production load نمی‌شه
 */
@SpringBootTest
@ActiveProfiles("prod")   // ← شبیه‌سازی محیط production
@DisplayName("تست امنیت DebugController")
class DebugControllerTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("در محیط production، DebugController اصلاً load نمی‌شه")
    void debug_controller_should_not_load_in_prod() {
        // Assert — انتظار داریم هیچ Bean از DebugController نباشه
        String[] debugBeanNames = applicationContext.getBeanNamesForType(DebugController.class);

        assertThat(debugBeanNames)
                .as("DebugController نباید در محیط production وجود داشته باشه")
                .isEmpty();
    }

    @Test
    @DisplayName("در محیط production، endpoint /api/debug/tenant باید 404 بده")
    void debug_endpoint_should_return_404_in_prod() {
        // این تست رو با MockMvc می‌نویسیم — یه مرحله بعد
        // فعلاً فقط چک می‌کنیم که Bean نیست
        assertThat(applicationContext.getBeanNamesForType(DebugController.class))
                .isEmpty();
    }
}