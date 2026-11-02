# JODOK – Fashion E-Commerce Website

**Software Testing Portfolio | Đồ án liên ngành Công nghệ thông tin 2026**

![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.14-green)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue)
![Playwright](https://img.shields.io/badge/Automation-Playwright-green)
![JUnit](https://img.shields.io/badge/Unit_Testing-JUnit_5-red)

## 1. Giới thiệu

**JODOK** là hệ thống thương mại điện tử thời trang được phát triển bằng Java Spring Boot và MySQL, hỗ trợ quản lý sản phẩm, giỏ hàng, voucher, đặt hàng, thanh toán COD/PayOS và chatbot AI.

Dự án tập trung thực hành quy trình kiểm thử phần mềm, bao gồm **Manual Testing, UI Automation Testing và Unit Testing**.

## 2. Software Testing

### Manual Testing

- Phân tích yêu cầu và xây dựng tài liệu SRS, Test Plan.
- Thiết kế **177 Test Case thuộc 14 nhóm chức năng**.
- Thực hiện Functional Testing, UI Testing và Input Validation Testing.
- Áp dụng Equivalence Partitioning, Boundary Value Analysis và Scenario-based Testing.
- Ghi nhận kết quả kiểm thử và theo dõi lỗi.

**Kết quả theo tài liệu kiểm thử:**

| Pass | Fail | Not Tested |
|---:|---:|---:|
| 140 | 15 | 22 |

**Tỷ lệ Pass trên các Test Case đã thực thi:** 90,3%.

**Tài liệu:**
- [Requirement Analysis](./manual-testing/01-Requirement-Analysis/)
- [Test Plan](./manual-testing/02-Test-Plan/)
- [Test Cases](./manual-testing/03-Test-Cases/)

### UI Automation Testing – Playwright

- Xây dựng kịch bản kiểm thử tự động bằng **Playwright và TypeScript**.
- Kiểm thử đăng ký, đăng nhập, tìm kiếm, sản phẩm, giỏ hàng, voucher, đặt hàng và quản trị.
- Sử dụng Locators, Assertions và API Request để xác minh kết quả.
- Cấu hình HTML Report, Screenshot và Trace phục vụ phân tích lỗi.

Một số test còn phụ thuộc cấu hình môi trường hoặc đang được hoàn thiện.

**Mã nguồn:** [Playwright Tests](./playwright/tests/)

### Unit Testing – JUnit 5 & Mockito

- Xây dựng **67 phương thức kiểm thử thuộc 6 lớp Service Test** theo thống kê mã nguồn.
- Kiểm thử Authentication, Catalog, Product, Voucher, Order Pricing và Chatbot.
- Sử dụng JUnit Assertions và Mockito để kiểm tra logic nghiệp vụ, xử lý ngoại lệ và mô phỏng các thành phần phụ thuộc.

**Mã nguồn:** [Java Unit Tests](./src/test/java/com/dacs/fashion/service/)

## 3. Công nghệ và công cụ

| Nhóm | Công nghệ |
|---|---|
| Backend | Java, Spring Boot |
| Database | MySQL |
| Manual Testing | Excel, Postman, Chrome DevTools |
| Automation Testing | Playwright, TypeScript |
| Unit Testing | JUnit 5, Mockito |
| Version Control | Git, GitHub |

## 4. Repository

- **Source Code & Automation:** [DALN](https://github.com/eniuu127/DALN)
- **Manual Testing:** [Fashion Management System Testing](https://github.com/eniuu127/fashion-management-system-testing)

---

*Dự án phục vụ học tập và thực hành Software Testing*
