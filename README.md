# JODOK – Fashion E-Commerce Website

**Đồ án chuyên ngành | Website thương mại điện tử thời trang**

[![Java](https://img.shields.io/badge/Java-17-orange)](https://www.java.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.14-6DB33F)](https://spring.io/projects/spring-boot)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1)](https://www.mysql.com/)
[![Playwright](https://img.shields.io/badge/Testing-Playwright-2EAD33)](https://playwright.dev/)
[![JUnit 5](https://img.shields.io/badge/Testing-JUnit_5-25A162)](https://junit.org/junit5/)

## Giới thiệu dự án

**JODOK** là hệ thống thương mại điện tử thời trang được xây dựng nhằm mô phỏng quy trình mua sắm và quản lý bán hàng trực tuyến.

Hệ thống hỗ trợ tìm kiếm sản phẩm, quản lý giỏ hàng, áp dụng mã giảm giá, đặt hàng, thanh toán và quản lý đơn hàng. Ngoài ra, dự án tích hợp chatbot AI hỗ trợ tư vấn sản phẩm và tương tác mua sắm.

### Các chức năng chính

- **Người dùng:** Đăng ký, đăng nhập và xác thực tài khoản.
- **Sản phẩm:** Xem chi tiết, tìm kiếm, lọc theo danh mục và lựa chọn biến thể sản phẩm.
- **Giỏ hàng:** Thêm, cập nhật số lượng và xóa sản phẩm.
- **Đặt hàng:** Áp dụng voucher, tính toán đơn hàng và thanh toán COD/PayOS.
- **Quản trị:** Quản lý sản phẩm, danh mục, thương hiệu, voucher và thống kê bán hàng.
- **AI Chatbot:** Tư vấn sản phẩm, hỗ trợ mua sắm, đặt hàng và theo dõi đơn hàng.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 17, Spring Boot |
| Web Interface | Thymeleaf, HTML, CSS, JavaScript |
| Database | MySQL, Spring Data JPA |
| Authentication | Spring Security, JWT |
| Payment | PayOS |
| AI Chatbot | Groq API, JODOK Agent |
| UI Automation | Playwright, TypeScript |
| Unit Testing | JUnit 5, Mockito |
| Version Control | Git, GitHub |

---

## Software Testing

### 1. Manual Testing

Thực hành kiểm thử thủ công nhằm xác minh các chức năng chính của hệ thống đáp ứng yêu cầu nghiệp vụ.

**Nội dung thực hiện:**

- Phân tích yêu cầu và xác định các luồng nghiệp vụ cần kiểm thử.
- Lập kế hoạch kiểm thử và thiết kế Test Case.
- Xây dựng các kịch bản Positive Testing, Negative Testing và Boundary Value Testing.
- Kiểm thử chức năng theo dữ liệu đầu vào và kết quả mong đợi.
- Ghi nhận, phân loại và theo dõi lỗi trong quá trình kiểm thử.

**Phạm vi kiểm thử:**

Đăng ký/Đăng nhập, Sản phẩm & Biến thể, Tìm kiếm, Giỏ hàng, Voucher, Đặt hàng, Thanh toán và Quản trị.

### 2. UI Automation Testing – Playwright

Sử dụng **Playwright với TypeScript** để xây dựng các test script tự động kiểm tra giao diện web và những luồng nghiệp vụ quan trọng.

**Các nhóm chức năng đã xây dựng mã kiểm thử:**

| Test Suite | Nội dung |
|---|---|
| `dang-ky.spec.ts` | Đăng ký tài khoản |
| `dang-nhap.spec.ts` | Đăng nhập và xác thực |
| `tim-kiem.spec.ts` | Tìm kiếm sản phẩm |
| `chi-tiet-san-pham.spec.ts` | Chi tiết sản phẩm |
| `variant.spec.ts` | Biến thể sản phẩm |
| `gio-hang.spec.ts` | Giỏ hàng |
| `dat-hang.spec.ts` | Đặt hàng |
| `voucher.spec.ts` | Áp dụng mã giảm giá |
| `admin-product.spec.ts` | Quản lý sản phẩm |
| `admin-voucher.spec.ts` | Quản lý voucher |
| `report.spec.ts` | Thống kê và xuất báo cáo |
| `chatbot-security.spec.ts` | Kiểm tra bảo vệ API key |
| `chatbot-timeout.spec.ts` | Xử lý lỗi phản hồi chatbot |

**Kỹ thuật đã thực hành:**

- Sử dụng Locator để tương tác với các thành phần giao diện.
- Thực hiện thao tác click, fill và điều hướng trang.
- Sử dụng Assertions để xác minh kết quả mong đợi.
- Kiểm thử dữ liệu hợp lệ và không hợp lệ.
- Tái sử dụng hàm hỗ trợ trong test scripts.
- Kiểm tra HTTP response và một số hành vi API.
- Cấu hình tự động lưu screenshot, trace và video khi test thất bại.
- Tạo báo cáo kiểm thử dạng HTML.

Một số kịch bản có điều kiện bỏ qua (`skip`) do phụ thuộc dữ liệu, cấu hình hoặc chức năng chưa được đối chiếu đầy đủ.

**Mã nguồn:** [Playwright Automation Tests](./playwright/tests)

### 3. Unit Testing – JUnit 5 & Mockito

Xây dựng bộ kiểm thử tự động bằng **Java, JUnit 5 và Mockito** nhằm xác minh logic xử lý tại tầng Service.

Các Repository và thành phần phụ thuộc được mock để kiểm thử nghiệp vụ độc lập với cơ sở dữ liệu thật.

Bộ mã nguồn hiện có **67 phương thức `@Test` thuộc 6 lớp kiểm thử**.

| Test Class | Số test | Chức năng |
|---|---:|---|
| `AuthFunctionTest.java` | 15 | Đăng ký, đăng nhập |
| `CatalogFunctionTest.java` | 11 | Danh mục, thương hiệu |
| `ProductFunctionTest.java` | 10 | Quản lý sản phẩm |
| `VoucherFunctionTest.java` | 7 | Kiểm tra voucher |
| `OrderPricingFunctionTest.java` | 6 | Phí vận chuyển, tổng tiền |
| `AgentChatbotFlowTest.java` | 18 | Luồng chatbot và đặt hàng |
| **Tổng** | **67** | |

**Kỹ thuật đã thực hành:**

- Sử dụng JUnit 5 để tổ chức test và xác minh kết quả bằng Assertions.
- Sử dụng Mockito để mô phỏng các Dependency.
- Kiểm tra các điều kiện hợp lệ, không hợp lệ và xử lý ngoại lệ.
- Xác minh các tương tác với Repository bằng `verify()`.
- Kiểm thử logic tính giá, voucher, tồn kho và đơn hàng.
- Kiểm thử nhiều bước trong quy trình chatbot hỗ trợ mua sắm.

**Mã nguồn:** [Java Unit Tests](./src/test/java/com/dacs/fashion/service)

### 4. Chatbot Workflow Testing

Bộ kiểm thử chatbot tập trung vào các luồng tương tác giữa người dùng, AI Agent và các chức năng nghiệp vụ của hệ thống.

**Một số kịch bản nổi bật:**

- Tìm kiếm và lựa chọn sản phẩm qua nhiều lượt hội thoại.
- Lựa chọn đúng kích thước, màu sắc và số lượng.
- Thêm sản phẩm vào giỏ hàng và áp dụng voucher.
- Yêu cầu xác nhận trước khi tạo hoặc hủy đơn hàng.
- Kiểm tra trạng thái thanh toán.
- Ngăn tạo đơn trùng trong tình huống xác nhận đồng thời ở môi trường kiểm thử.
- Kiểm tra quyền truy cập theo tài khoản.
- Xử lý timeout và lỗi dịch vụ AI.

Các luồng service được kiểm thử với Repository mô phỏng; chưa thay thế cho kiểm thử tích hợp trên toàn bộ môi trường thực tế.

---

## Cấu trúc mã nguồn và kiểm thử

```text
DALN/
├── .mvn/                       # Maven Wrapper
├── playwright/
│   ├── tests/                  # Playwright test scripts
│   │   └── helpers/            # Reusable test helpers
│   ├── playwright.config.js    # Test configuration
│   └── package.json
├── src/
│   ├── main/                   # Application source code
│   └── test/
│       ├── java/               # JUnit 5 & Mockito tests
│       └── js/                 # Chatbot JavaScript tests
├── pom.xml                     # Maven dependencies
├── mvnw
├── mvnw.cmd
└── README.md
```

## Chạy kiểm thử tự động

### Java Unit Tests

Tại thư mục gốc dự án, thực thi:

```bash
./mvnw test
```

Trên Windows:

```powershell
.\mvnw.cmd test
```

### Playwright UI Tests

Trước tiên, khởi động ứng dụng JODOK tại `http://localhost:8080` và chuẩn bị tài khoản/dữ liệu kiểm thử theo yêu cầu của các test.

```bash
cd playwright
npm install
npx playwright install chromium
npx playwright test
```

Xem báo cáo HTML:

```bash
npx playwright show-report
```

**Lưu ý:** Một số test cần tài khoản, dữ liệu mẫu, biến môi trường hoặc API được cấu hình riêng. Không phải tất cả test đều sẵn sàng chạy độc lập trên môi trường mới.

---

## Kết quả thực hành

Thông qua dự án, các kỹ năng kiểm thử đã được thực hành gồm:

- Phân tích yêu cầu và xác định phạm vi kiểm thử.
- Thiết kế và tổ chức các trường hợp kiểm thử theo nghiệp vụ.
- Viết test script với Playwright và TypeScript.
- Viết Unit Test bằng JUnit 5 và Mockito.
- Sử dụng Assertions và Mocking để kiểm tra kết quả.
- Thực hành kiểm thử hồi quy và xử lý các tình huống ngoại lệ.
- Quản lý mã nguồn và lưu trữ minh chứng kiểm thử trên GitHub.

Các test script đang được tiếp tục hoàn thiện. Số lượng test trong repository không đồng nghĩa với số lượng test đã chạy thành công.

## Định hướng phát triển

- Hoàn thiện và ổn định các test script Playwright.
- Tăng khả năng tái sử dụng mã kiểm thử và dữ liệu test.
- Bổ sung báo cáo kết quả và độ bao phủ kiểm thử.
- Thực hành API Automation Testing.
- Tích hợp chạy kiểm thử tự động với GitHub Actions.

---
