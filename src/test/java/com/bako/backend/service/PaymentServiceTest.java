package com.bako.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * تست‌های PaymentService
 *
 * هدف: اطمینان از درست کار کردن ارتباط با درگاه زرین‌پال
 * استراتژی: MockRestServiceServer — یعنی هیچ درخواست واقعی به زرین‌پال نمی‌ره
 */
@DisplayName("تست‌های PaymentService")
class PaymentServiceTest {

    private PaymentService paymentService;
    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;

    private static final String SANDBOX_URL = "https://sandbox.zarinpal.com/pg";
    private static final String PROD_URL    = "https://payment.zarinpal.com/pg";
    private static final String CALLBACK_URL = "http://localhost:5173/payment/callback";

    @BeforeEach
    void setUp() {
        // ⭐️ یه RestTemplate جدید می‌سازیم تا بتونیم mockش کنیم
        restTemplate = new RestTemplate();

        // ⭐️ سرور mock رو به این RestTemplate وصل می‌کنیم
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        // ⭐️ PaymentService رو دستی می‌سازیم (چون constructor خودش RestTemplate می‌سازه)
        paymentService = new PaymentService();

        // ⭐️ RestTemplate رو override می‌کنیم با نسخه mock
        ReflectionTestUtils.setField(paymentService, "restTemplate", restTemplate);

        // ⭐️ callbackUrl رو هم set می‌کنیم
        ReflectionTestUtils.setField(paymentService, "callbackUrl", CALLBACK_URL);
    }

    // =================================================================
    //  بخش ۱: اعتبارسنجی ورودی‌ها
    // =================================================================
    @Nested
    @DisplayName("۱. اعتبارسنجی ورودی‌ها")
    class ValidationTests {

        @Test
        @DisplayName("requestPayment با merchantId=null → fail برمی‌گردونه")
        void request_with_null_merchant_should_fail() {
            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 100_000L, "test", null, true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("درگاه");
            // تایید اینکه هیچ درخواست HTTP نرفت
            mockServer.verify();
        }

        @Test
        @DisplayName("requestPayment با merchantId خالی → fail")
        void request_with_empty_merchant_should_fail() {
            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 100_000L, "test", "   ", true);

            assertThat(result.get("success")).isEqualTo(false);
            mockServer.verify();
        }

        @Test
        @DisplayName("requestPayment با amount=null → fail")
        void request_with_null_amount_should_fail() {
            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", null, "test", "valid-merchant-id", true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("مبلغ");
            mockServer.verify();
        }

        @Test
        @DisplayName("requestPayment با amount=0 → fail")
        void request_with_zero_amount_should_fail() {
            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 0L, "test", "valid-merchant-id", true);

            assertThat(result.get("success")).isEqualTo(false);
            mockServer.verify();
        }

        @Test
        @DisplayName("requestPayment با amount منفی → fail")
        void request_with_negative_amount_should_fail() {
            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", -1000L, "test", "valid-merchant-id", true);

            assertThat(result.get("success")).isEqualTo(false);
            mockServer.verify();
        }

        @Test
        @DisplayName("verifyPayment با authority=null → fail")
        void verify_with_null_authority_should_fail() {
            Map<String, Object> result = paymentService.verifyPayment(
                    null, 100_000L, "valid-merchant-id", true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("شناسه");
            mockServer.verify();
        }

        @Test
        @DisplayName("verifyPayment با authority خالی → fail")
        void verify_with_empty_authority_should_fail() {
            Map<String, Object> result = paymentService.verifyPayment(
                    "   ", 100_000L, "valid-merchant-id", true);

            assertThat(result.get("success")).isEqualTo(false);
            mockServer.verify();
        }
    }

    // =================================================================
    //  بخش ۲: requestPayment موفق
    // =================================================================
    @Nested
    @DisplayName("۲. requestPayment موفق")
    class RequestPaymentSuccessTests {

        @Test
        @DisplayName("پاسخ موفق از درگاه → authority و paymentUrl برمی‌گرده")
        void successful_request_should_return_authority_and_url() {
            // Arrange
            String jsonResponse = """
                {
                  "data": {
                    "authority": "A00000000000000000000000000000123456",
                    "code": 100
                  }
                }
                """;

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andExpect(method(HttpMethod.POST))
                    .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

            // Act
            Map<String, Object> result = paymentService.requestPayment(
                    "order-123", 50_000L, "تست سفارش", "12345678-1234-1234-1234-123456789012", true);

            // Assert
            assertThat(result.get("success")).isEqualTo(true);
            assertThat(result.get("authority")).isEqualTo("A00000000000000000000000000000123456");
            assertThat((String) result.get("paymentUrl"))
                    .startsWith(SANDBOX_URL)
                    .contains("A00000000000000000000000000000123456");

            mockServer.verify();
        }

        @Test
        @DisplayName("sandbox=true → از URL sandbox استفاده می‌کنه")
        void sandbox_true_should_use_sandbox_url() {
            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andRespond(withSuccess(
                            "{\"data\":{\"authority\":\"A123456789012345678901234567890123456\"}}",
                            MediaType.APPLICATION_JSON));

            paymentService.requestPayment("order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", true);

            mockServer.verify();
        }

        @Test
        @DisplayName("sandbox=false → از URL production استفاده می‌کنه")
        void sandbox_false_should_use_production_url() {
            mockServer.expect(requestTo(PROD_URL + "/v4/payment/request.json"))
                    .andRespond(withSuccess(
                            "{\"data\":{\"authority\":\"A123456789012345678901234567890123456\"}}",
                            MediaType.APPLICATION_JSON));

            paymentService.requestPayment("order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", false);

            mockServer.verify();
        }

        @Test
        @DisplayName("merchantId درخواست به درگاه فرستاده می‌شه")
        void merchant_id_should_be_sent_to_gateway() {
            String merchantId = "my-test-merchant-1234-5678";

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(jsonPath("$.merchant_id").value(merchantId))
                    .andExpect(jsonPath("$.amount").value(50_000))
                    .andRespond(withSuccess(
                            "{\"data\":{\"authority\":\"A123456789012345678901234567890123456\"}}",
                            MediaType.APPLICATION_JSON));

            paymentService.requestPayment("order-1", 50_000L, "test", merchantId, true);

            mockServer.verify();
        }
    }

    // =================================================================
    //  بخش ۳: requestPayment با خطا
    // =================================================================
    @Nested
    @DisplayName("۳. requestPayment با خطا")
    class RequestPaymentErrorTests {

        @Test
        @DisplayName("پاسخ خالی از درگاه → fail")
        void empty_response_should_fail() {
            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", true);

            assertThat(result.get("success")).isEqualTo(false);
            mockServer.verify();
        }

        @Test
        @DisplayName("پاسخ درگاه با errors → پیام خطا برمی‌گرده")
        void gateway_errors_should_be_extracted() {
            String errResponse = """
                {
                  "errors": [
                    {"code": -9, "message": "Validation error"}
                  ]
                }
                """;

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andRespond(withSuccess(errResponse, MediaType.APPLICATION_JSON));

            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("Validation error");
        }

        @Test
        @DisplayName("خطای HTTP 400 از درگاه → fail")
        void http_400_should_fail_gracefully() {
            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andRespond(withBadRequest());

            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("HTTP");
        }

        @Test
        @DisplayName("خطای HTTP 500 از درگاه → fail")
        void http_500_should_fail_gracefully() {
            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/request.json"))
                    .andRespond(withServerError());

            Map<String, Object> result = paymentService.requestPayment(
                    "order-1", 10_000L, "test",
                    "12345678-1234-1234-1234-123456789012", true);

            assertThat(result.get("success")).isEqualTo(false);
        }
    }

    // =================================================================
    //  بخش ۴: verifyPayment
    // =================================================================
    @Nested
    @DisplayName("۴. verifyPayment")
    class VerifyPaymentTests {

        @Test
        @DisplayName("verify موفق → refId برمی‌گرده")
        void successful_verify_should_return_ref_id() {
            String jsonResponse = """
                {
                  "data": {
                    "code": 100,
                    "ref_id": 123456789
                  }
                }
                """;

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/verify.json"))
                    .andExpect(method(HttpMethod.POST))
                    .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

            Map<String, Object> result = paymentService.verifyPayment(
                    "A00000000000000000000000000000123456",
                    50_000L,
                    "12345678-1234-1234-1234-123456789012",
                    true);

            assertThat(result.get("success")).isEqualTo(true);
            assertThat(result.get("refId")).isEqualTo("123456789");
            mockServer.verify();
        }

        @Test
        @DisplayName("verify با خطای درگاه → fail")
        void verify_with_gateway_error_should_fail() {
            String errResponse = """
                {
                  "errors": [
                    {"code": -21, "message": "Transaction not found"}
                  ]
                }
                """;

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/verify.json"))
                    .andRespond(withSuccess(errResponse, MediaType.APPLICATION_JSON));

            Map<String, Object> result = paymentService.verifyPayment(
                    "A00000000000000000000000000000123456",
                    50_000L,
                    "12345678-1234-1234-1234-123456789012",
                    true);

            assertThat(result.get("success")).isEqualTo(false);
            assertThat((String) result.get("message")).contains("Transaction not found");
        }

        @Test
        @DisplayName("verify authority و amount رو به درگاه می‌فرسته")
        void verify_should_send_authority_and_amount() {
            String authority = "A00000000000000000000000000000123456";
            Long amount = 75_000L;

            mockServer.expect(requestTo(SANDBOX_URL + "/v4/payment/verify.json"))
                    .andExpect(jsonPath("$.authority").value(authority))
                    .andExpect(jsonPath("$.amount").value(amount))
                    .andRespond(withSuccess(
                            "{\"data\":{\"code\":100,\"ref_id\":999}}",
                            MediaType.APPLICATION_JSON));

            paymentService.verifyPayment(authority, amount,
                    "12345678-1234-1234-1234-123456789012", true);

            mockServer.verify();
        }
    }
}