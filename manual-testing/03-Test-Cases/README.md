# Test Cases – Hệ thống quản lý thời trang

## 1. Giới thiệu

Thư mục `03-Test-Cases` lưu trữ bộ Test Case phục vụ kiểm thử thủ công (Manual Testing) cho dự án **Hệ thống quản lý thời trang**.

Các Test Case được thiết kế nhằm kiểm tra chức năng, dữ liệu đầu vào, giao diện và các luồng nghiệp vụ chính của hệ thống. Mỗi trường hợp kiểm thử được xây dựng với các bước thực hiện, kết quả mong đợi và thông tin ghi nhận kết quả thực tế.

## 2. Phạm vi kiểm thử

Bộ kiểm thử gồm **177 Test Case thuộc 14 nhóm chức năng**, bao gồm:

| STT | Nhóm chức năng | Số Test Case |
|---|---|---:|
| 1 | Đăng ký tài khoản | 11 |
| 2 | Đăng nhập và quản lý phiên | 12 |
| 3 | Danh mục và tìm kiếm sản phẩm | 14 |
| 4 | Chi tiết sản phẩm và biến thể | 12 |
| 5 | Quản lý giỏ hàng | 14 |
| 6 | Voucher và khuyến mãi | 14 |
| 7 | Đặt hàng và thanh toán | 16 |
| 8 | Quản lý đơn hàng và trạng thái | 14 |
| 9 | Đánh giá sản phẩm | 12 |
| 10 | Chatbot tìm kiếm sản phẩm | 12 |
| 11 | Quản trị sản phẩm | 16 |
| 12 | Quản lý biến thể và tồn kho | 10 |
| 13 | Quản lý khuyến mãi (Admin) | 10 |
| 14 | Banner và giao diện | 10 |
| **Tổng** | | **177** |

## 3. Phương pháp thiết kế Test Case

- **Phương pháp kiểm thử:** Manual Testing kết hợp Black-box Testing.
- **Phân vùng tương đương (Equivalence Partitioning):** Kiểm tra các nhóm dữ liệu hợp lệ và không hợp lệ.
- **Phân tích giá trị biên (Boundary Value Analysis):** Kiểm tra dữ liệu tại và xung quanh giới hạn cho phép.
- **Kiểm thử theo kịch bản (Scenario-based Testing):** Kiểm tra luồng nghiệp vụ chính và các tình huống ngoại lệ.

## 4. Cấu trúc và kết quả kiểm thử

Bộ Test Case được quản lý bằng Microsoft Excel, bao gồm các thông tin: nhóm chức năng, mã Test Case, mô tả, dữ liệu kiểm thử, các bước thực hiện, kết quả mong đợi, kết quả thực tế và trạng thái kiểm thử.

**Tổng hợp trạng thái trong bộ Test Case:**

| Trạng thái | Số lượng |
|---|---:|
| Pass (Đạt) | 140 |
| Fail (Không đạt) | 15 |
| Not Tested (Chưa kiểm thử) | 22 |
| **Tổng** | **177** |

Các trường hợp không đạt và chưa thực hiện được ghi nhận để phục vụ việc rà soát, kiểm thử lại và đánh giá kết quả.

## 5. Tài liệu

- [**Xem bộ Test Case (PDF)**](./CV_TestCase_ĐALN.pdf) – Bản PDF phục vụ xem trực tiếp trên GitHub.
- [**Xem bộ Test Case (Excel)**](./CV_TestCase_ĐALN.xlsx) – File Excel chứa các trường hợp kiểm thử và kết quả thực thi.

Bộ Test Case được xây dựng theo phạm vi kiểm thử đã xác định trong Test Plan, làm cơ sở cho hoạt động thực thi và tổng hợp kết quả kiểm thử hệ thống.
