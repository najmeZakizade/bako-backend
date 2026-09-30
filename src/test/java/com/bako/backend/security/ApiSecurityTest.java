package com.bako.backend.security;

import com.bako.backend.model.User;
import com.bako.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * تست‌های امنیت API
 *
 * هدف: اثبات اینکه قوانین SecurityConfig درست اعمال می‌شن
 *  ۱. مسیرهای عمومی بدون توکن کار می‌کنن
 *  ۲. مسیرهای محافظت‌شده بدون توکن 401 می‌دن
 *  ۳. کاربر با نقش اشتباه 403 می‌گیره
 *  ۴. ثبت‌نام نمی‌تونه نقش SUPER_ADMIN بسازه (باگ امنیتی که رفع کردیم)
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("تست‌های امنیت API")
class ApiSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    private static final String TEST_PREFIX = "test_sec_";

    // ============================================================
    //  پاک‌سازی: بعد از هر تست، فقط کاربران تستی رو حذف کن
    // ============================================================
    @AfterEach
    void cleanUpTestUsers() {
        userRepository.findAll().stream()
                .filter(u -> u.getUsername() != null && u.getUsername().startsWith(TEST_PREFIX))
                .forEach(userRepository::delete);
    }

    private String uniqueUsername() {
        return TEST_PREFIX + UUID.randomUUID().toString().substring(0, 8);
    }

    private String uniquePhone() {
        long suffix = Math.abs(System.nanoTime() % 100_000_000L);
        return String.format("09%09d", suffix);
    }

    // =================================================================
    //  بخش ۱: مسیرهای عمومی
    // =================================================================
    @Nested
    @DisplayName("۱. مسیرهای عمومی — بدون توکن")
    class PublicEndpoints {

        @Test
        @DisplayName("POST /api/auth/login بدون توکن → 401 (نه 403)")
        void login_should_be_reachable_without_token() throws Exception {
            // 401 یعنی درخواست به Controller رسید ولی اعتبارنامه اشتباه بود
            // 403 یعنی Spring Security جلوش رو گرفت — که نباید اتفاق بیفته
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"nobody\",\"password\":\"nothing\"}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/bakeries بدون توکن → دسترسی آزاد")
        void list_bakeries_should_be_public() throws Exception {
            mockMvc.perform(get("/api/bakeries"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("باید 200 یا هر کد موفق باشه — نه 401/403")
                                .isNotIn(401, 403);
                    });
        }

        @Test
        @DisplayName("GET /api/products بدون توکن → دسترسی آزاد")
        void list_products_should_be_public() throws Exception {
            mockMvc.perform(get("/api/products"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status).isNotIn(401, 403);
                    });
        }
    }

    // =================================================================
    //  بخش ۲: مسیرهای محافظت‌شده — بدون توکن
    // =================================================================
    @Nested
    @DisplayName("۲. مسیرهای محافظت‌شده بدون توکن → باید 401 بدن")
    class ProtectedEndpointsWithoutAuth {

        @Test
        @DisplayName("GET /api/super-admin/users بدون توکن → 401")
        void super_admin_users_requires_auth() throws Exception {
            mockMvc.perform(get("/api/super-admin/users"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/cart/items بدون توکن → 401")
        void cart_items_requires_auth() throws Exception {
            mockMvc.perform(get("/api/cart/items"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/orders/my بدون توکن → 401")
        void my_orders_requires_auth() throws Exception {
            mockMvc.perform(get("/api/orders/my"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/monitoring/dashboard/stats بدون توکن → 401")
        void monitoring_requires_auth() throws Exception {
            mockMvc.perform(get("/api/monitoring/dashboard/stats"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =================================================================
    //  بخش ۳: نقش اشتباه → باید 403 بده
    // =================================================================
    @Nested
    @DisplayName("۳. کاربر با نقش اشتباه → باید 403 بگیره")
    class WrongRoleGets403 {

        @Test
        @WithMockUser(username = "customer_user", roles = "CUSTOMER")
        @DisplayName("CUSTOMER نمی‌تونه به /api/super-admin/users دست بزنه")
        void customer_cannot_access_super_admin() throws Exception {
            mockMvc.perform(get("/api/super-admin/users"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "customer_user", roles = "CUSTOMER")
        @DisplayName("CUSTOMER نمی‌تونه به /api/monitoring دست بزنه")
        void customer_cannot_access_monitoring() throws Exception {
            mockMvc.perform(get("/api/monitoring/dashboard/stats"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "owner_user", roles = "BAKERY_OWNER")
        @DisplayName("BAKERY_OWNER نمی‌تونه به /api/super-admin دست بزنه")
        void bakery_owner_cannot_access_super_admin() throws Exception {
            mockMvc.perform(get("/api/super-admin/users"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "staff_user", roles = "STAFF")
        @DisplayName("STAFF نمی‌تونه به /api/super-admin دست بزنه")
        void staff_cannot_access_super_admin() throws Exception {
            mockMvc.perform(get("/api/super-admin/users"))
                    .andExpect(status().isForbidden());
        }
    }

    // =================================================================
    //  بخش ۴: نقش درست → باید دسترسی بگیره
    // =================================================================
    @Nested
    @DisplayName("۴. کاربر با نقش درست → باید دسترسی بگیره")
    class CorrectRoleGetsAccess {

        @Test
        @WithMockUser(username = "admin", roles = "SUPER_ADMIN")
        @DisplayName("SUPER_ADMIN می‌تونه به /api/super-admin/users دسترسی داشته باشه")
        void super_admin_can_access_super_admin() throws Exception {
            mockMvc.perform(get("/api/super-admin/users"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("نباید 401 یا 403 باشه — کاربر مجازه")
                                .isNotIn(401, 403);
                    });
        }

        @Test
        @WithMockUser(username = "monitor_user", roles = "MONITOR")
        @DisplayName("MONITOR می‌تونه به /api/monitoring دسترسی داشته باشه")
        void monitor_can_access_monitoring() throws Exception {
            mockMvc.perform(get("/api/monitoring/dashboard/stats"))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("MONITOR باید دسترسی داشته باشه")
                                .isNotIn(401, 403);
                    });
        }
    }

    // =================================================================
    //  بخش ۵: 🔴 باگ امنیتی که رفع کردیم — تست escalate
    // =================================================================
    @Nested
    @DisplayName("۵. ثبت‌نام نمی‌تونه SUPER_ADMIN بسازه")
    class RegisterCannotEscalate {

        @Test
        @DisplayName("درخواست ثبت‌نام با role=SUPER_ADMIN → کاربر CUSTOMER ساخته می‌شه")
        void register_with_super_admin_role_creates_customer() throws Exception {
            // Arrange
            String username = uniqueUsername();
            String phone = uniquePhone();

            String body = objectMapper.writeValueAsString(Map.of(
                    "username", username,
                    "password", "password123",
                    "phone", phone,
                    "fullName", "Hacker Attempt",
                    "role", "SUPER_ADMIN"   // ← تلاش برای escalate!
            ));

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value("CUSTOMER"));

            // تایید نهایی: تو DB هم CUSTOMER ذخیره شده
            User savedUser = userRepository.findByUsername(username).orElseThrow();
            assertThat(savedUser.getRole())
                    .as("نقش باید CUSTOMER باشه، نه SUPER_ADMIN")
                    .isEqualTo("CUSTOMER");
            assertThat(savedUser.getAvailableRoles())
                    .as("لیست نقش‌های مجاز فقط CUSTOMER داره")
                    .containsExactly("CUSTOMER");
        }

        @Test
        @DisplayName("درخواست ثبت‌نام با role=BAKERY_OWNER → کاربر CUSTOMER ساخته می‌شه")
        void register_with_bakery_owner_role_creates_customer() throws Exception {
            String username = uniqueUsername();
            String phone = uniquePhone();

            String body = objectMapper.writeValueAsString(Map.of(
                    "username", username,
                    "password", "password123",
                    "phone", phone,
                    "fullName", "Attempt Owner",
                    "role", "BAKERY_OWNER"
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value("CUSTOMER"));

            User savedUser = userRepository.findByUsername(username).orElseThrow();
            assertThat(savedUser.getRole()).isEqualTo("CUSTOMER");
        }

        @Test
        @DisplayName("درخواست ثبت‌نام بدون role → کاربر CUSTOMER ساخته می‌شه")
        void register_without_role_defaults_to_customer() throws Exception {
            String username = uniqueUsername();
            String phone = uniquePhone();

            String body = objectMapper.writeValueAsString(Map.of(
                    "username", username,
                    "password", "password123",
                    "phone", phone,
                    "fullName", "Normal User"
                    // role اصلاً فرستاده نمی‌شه
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value("CUSTOMER"));
        }
    }
}