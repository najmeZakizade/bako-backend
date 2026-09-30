package com.bako.backend.security;

import com.bako.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;

@DisplayName("تست‌های JwtUtil (نسخه ۲ — با @Value)")
class JwtUtilTest {

    private JwtUtil jwtUtil;
    private User sampleUser;

    // ⭐️ این مقدار باید حداقل ۳۲ کاراکتر باشه
    private static final String TEST_SECRET =
            "bako-test-secret-key-for-jwt-hs256-min-32-chars-long-for-tests-only";
    private static final long TEST_EXPIRATION = 86400000L;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", TEST_EXPIRATION);
        jwtUtil.init();

        sampleUser = new User();
        sampleUser.setId("user-123");
        sampleUser.setUsername("09123456789");
        sampleUser.setRole("CUSTOMER");
        sampleUser.setTenantId("tenant-abc");
    }

    // =================================================================
    //  بخش ۱: راه‌اندازی و اعتبارسنجی secret
    // =================================================================
    @Nested
    @DisplayName("۱. راه‌اندازی و اعتبارسنجی secret")
    class InitTests {

        @Test
        @DisplayName("secret خالی → init() استثنا می‌ندازه")
        void empty_secret_should_throw() {
            JwtUtil util = new JwtUtil();
            ReflectionTestUtils.setField(util, "secret", "");
            ReflectionTestUtils.setField(util, "expirationMs", TEST_EXPIRATION);

            assertThatThrownBy(util::init)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("jwt.secret");
        }

        @Test
        @DisplayName("secret کوتاه‌تر از ۳۲ کاراکتر → init() استثنا می‌ندازه")
        void short_secret_should_throw() {
            JwtUtil util = new JwtUtil();
            ReflectionTestUtils.setField(util, "secret", "too-short");
            ReflectionTestUtils.setField(util, "expirationMs", TEST_EXPIRATION);

            assertThatThrownBy(util::init)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("۳۲");
        }
    }

    // =================================================================
    //  بخش ۲: تولید توکن
    // =================================================================
    @Nested
    @DisplayName("۲. تولید توکن")
    class GenerateTokenTests {

        @Test
        @DisplayName("توکن معتبر با ۳ بخش تولید می‌شه")
        void should_generate_valid_token() {
            String token = jwtUtil.generateToken(sampleUser);

            assertThat(token).isNotNull().isNotEmpty();
            assertThat(token.split("\\.")).hasSize(3);
        }

        @Test
        @DisplayName("توکن با role override ساخته می‌شه")
        void should_generate_with_custom_role() {
            String token = jwtUtil.generateToken(sampleUser, "STAFF");
            assertThat(jwtUtil.extractRole(token)).isEqualTo("STAFF");
        }
    }

    // =================================================================
    //  بخش ۳: استخراج claims
    // =================================================================
    @Nested
    @DisplayName("۳. استخراج اطلاعات")
    class ExtractClaimsTests {

        private String token;

        @BeforeEach
        void generate() {
            token = jwtUtil.generateToken(sampleUser);
        }

        @Test
        @DisplayName("username درست استخراج می‌شه")
        void extract_username() {
            assertThat(jwtUtil.extractUsername(token)).isEqualTo("09123456789");
        }

        @Test
        @DisplayName("role درست استخراج می‌شه")
        void extract_role() {
            assertThat(jwtUtil.extractRole(token)).isEqualTo("CUSTOMER");
        }

        @Test
        @DisplayName("tenantId درست استخراج می‌شه")
        void extract_tenant_id() {
            assertThat(jwtUtil.extractTenantId(token)).isEqualTo("tenant-abc");
        }

        @Test
        @DisplayName("userId درست استخراج می‌شه")
        void extract_user_id() {
            assertThat(jwtUtil.extractUserId(token)).isEqualTo("user-123");
        }

        @Test
        @DisplayName("tenantId نال → null برمی‌گرده")
        void null_tenant() {
            sampleUser.setTenantId(null);
            String t = jwtUtil.generateToken(sampleUser);
            assertThat(jwtUtil.extractTenantId(t)).isNull();
        }
    }

    // =================================================================
    //  بخش ۴: اعتبارسنجی
    // =================================================================
    @Nested
    @DisplayName("۴. اعتبارسنجی توکن")
    class ValidationTests {

        @Test
        @DisplayName("توکن سالم → معتبر")
        void valid_token() {
            String token = jwtUtil.generateToken(sampleUser);
            assertThat(jwtUtil.isTokenValid(token)).isTrue();
        }

        @Test
        @DisplayName("رشته بی‌ربط → نامعتبر")
        void garbage_string() {
            assertThat(jwtUtil.isTokenValid("not-a-token")).isFalse();
        }

        @Test
        @DisplayName("رشته خالی → نامعتبر")
        void empty_string() {
            assertThat(jwtUtil.isTokenValid("")).isFalse();
        }

        @Test
        @DisplayName("null → نامعتبر")
        void null_token() {
            assertThat(jwtUtil.isTokenValid(null)).isFalse();
        }

        @Test
        @DisplayName("توکن دستکاری‌شده → نامعتبر")
        void tampered_token() {
            String token = jwtUtil.generateToken(sampleUser);
            String tampered = token.substring(0, token.length() - 1) + "X";
            assertThat(jwtUtil.isTokenValid(tampered)).isFalse();
        }

        @Test
        @DisplayName("استخراج از توکن دستکاری‌شده → استثنا")
        void tampered_throws() {
            String token = jwtUtil.generateToken(sampleUser);
            String tampered = token + "junk";

            assertThatThrownBy(() -> jwtUtil.extractUsername(tampered))
                    .isInstanceOf(Exception.class);
        }
    }

    // =================================================================
    //  بخش ۵: ⭐️ کلیدی — کلید متفاوت = توکن نامعتبر
    // =================================================================
    @Nested
    @DisplayName("۵. امنیت کلید")
    class SecurityKeyTests {

        @Test
        @DisplayName("توکن ساخته‌شده با کلید متفاوت → توسط این کلید نامعتبر شناخته می‌شه")
        void token_from_different_key_should_be_invalid() {
            JwtUtil otherUtil = new JwtUtil();
            ReflectionTestUtils.setField(otherUtil, "secret",
                    "different-secret-key-for-jwt-hs256-min-32-chars-long-for-test");
            ReflectionTestUtils.setField(otherUtil, "expirationMs", TEST_EXPIRATION);
            otherUtil.init();

            String tokenFromOther = otherUtil.generateToken(sampleUser);

            assertThat(jwtUtil.isTokenValid(tokenFromOther)).isFalse();
        }

        @Test
        @DisplayName("⭐️ دو JwtUtil با secret یکسان، توکن‌های همدیگه رو قبول می‌کنن")
        void same_secret_should_accept_tokens() {
            JwtUtil otherUtil = new JwtUtil();
            ReflectionTestUtils.setField(otherUtil, "secret", TEST_SECRET);
            ReflectionTestUtils.setField(otherUtil, "expirationMs", TEST_EXPIRATION);
            otherUtil.init();

            String token = jwtUtil.generateToken(sampleUser);

            // این تست ثابت می‌کنه چرا @Value مهمه:
            // کلید از properties خونده می‌شه، پس دو instance با یه secret → یکسان
            assertThat(otherUtil.isTokenValid(token)).isTrue();
            assertThat(otherUtil.extractUsername(token)).isEqualTo("09123456789");
        }
    }
}