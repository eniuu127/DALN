# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: report.spec.ts >> Báo cáo thống kê và Excel — REPORT Excel >> REPORT-006 - Xuất Excel tổng hợp
- Location: tests\report.spec.ts:268:7

# Error details

```
Error: Xuất Excel HTTP 404

expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  35  | }
  36  | 
  37  | async function auth(request: APIRequestContext) {
  38  |   test.skip(
  39  |     !adminEmail || !adminPassword,
  40  |     'Chưa khai báo tài khoản ADMIN'
  41  |   );
  42  | 
  43  |   const response = await request.post(`${BASE}/api/auth/login`, {
  44  |     data: {
  45  |       email: adminEmail,
  46  |       password: adminPassword
  47  |     }
  48  |   });
  49  | 
  50  |   expect(response.ok(), 'Đăng nhập ADMIN thất bại').toBeTruthy();
  51  | 
  52  |   const body = await response.json();
  53  | 
  54  |   const token =
  55  |     body.token ??
  56  |     body.accessToken ??
  57  |     body.jwt ??
  58  |     body.data?.token;
  59  | 
  60  |   expect(token, 'Không tìm thấy JWT ADMIN').toBeTruthy();
  61  | 
  62  |   return { Authorization: `Bearer ${token}` };
  63  | }
  64  | 
  65  | async function get(
  66  |   request: APIRequestContext,
  67  |   path: string,
  68  |   from?: string,
  69  |   to?: string
  70  | ) {
  71  |   const headers = await auth(request);
  72  |   return request.get(url(path, from, to), { headers });
  73  | }
  74  | 
  75  | async function json(response: APIResponse) {
  76  |   expect(
  77  |     response.ok(),
  78  |     `API trả HTTP ${response.status()}: ${await response.text()}`
  79  |   ).toBeTruthy();
  80  | 
  81  |   return response.json();
  82  | }
  83  | 
  84  | function records(body: any): any[] {
  85  |   if (Array.isArray(body)) return body;
  86  | 
  87  |   for (const key of ['content', 'items', 'rows', 'orders', 'data']) {
  88  |     if (Array.isArray(body?.[key])) return body[key];
  89  |   }
  90  | 
  91  |   throw new Error('Không tìm thấy mảng dữ liệu trong phản hồi API');
  92  | }
  93  | 
  94  | function number(value: unknown) {
  95  |   if (typeof value === 'number') return value;
  96  |   return Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  97  | }
  98  | 
  99  | function dateOf(row: any) {
  100 |   const raw =
  101 |     row.createdAt ??
  102 |     row.orderDate ??
  103 |     row.date ??
  104 |     row.completedAt;
  105 | 
  106 |   return raw ? String(raw).slice(0, 10) : '';
  107 | }
  108 | 
  109 | function orderTotal(order: any) {
  110 |   return number(
  111 |     order.totalAmount ??
  112 |     order.finalAmount ??
  113 |     order.total ??
  114 |     order.totalPrice
  115 |   );
  116 | }
  117 | 
  118 | function orderStatus(order: any) {
  119 |   return String(
  120 |     order.status ??
  121 |     order.orderStatus ??
  122 |     ''
  123 |   ).toUpperCase();
  124 | }
  125 | 
  126 | async function excel(
  127 |   request: APIRequestContext,
  128 |   from?: string,
  129 |   to?: string
  130 | ) {
  131 |   const endpoint = required(API.export, 'xuất Excel');
  132 |   const response = await get(request, endpoint, from, to);
  133 | 
  134 |   expect(response.ok(), `Xuất Excel HTTP ${response.status()}`)
> 135 |     .toBeTruthy();
      |      ^ Error: Xuất Excel HTTP 404
  136 | 
  137 |   const buffer = await response.body();
  138 | 
  139 |   expect(buffer.length).toBeGreaterThan(100);
  140 | 
  141 |   const workbook = XLSX.read(buffer, {
  142 |     type: 'buffer',
  143 |     cellDates: true
  144 |   });
  145 | 
  146 |   expect(workbook.SheetNames.length).toBeGreaterThan(0);
  147 | 
  148 |   return {
  149 |     workbook,
  150 |     sheets: workbook.SheetNames.map(name => ({
  151 |       name,
  152 |       rows: XLSX.utils.sheet_to_json<any>(
  153 |         workbook.Sheets[name],
  154 |         { defval: '' }
  155 |       )
  156 |     }))
  157 |   };
  158 | }
  159 | 
  160 | test.describe('Báo cáo thống kê và Excel — REPORT Excel', () => {
  161 | 
  162 |   test('REPORT-001 - Lọc báo cáo theo ngày', async ({ request }) => {
  163 |     const endpoint = required(API.orders, 'danh sách đơn hàng');
  164 | 
  165 |     const from = '2026-01-01';
  166 |     const to = '2026-12-31';
  167 | 
  168 |     const body = await json(await get(request, endpoint, from, to));
  169 |     const orders = records(body);
  170 | 
  171 |     test.skip(orders.length === 0, 'Khoảng ngày chưa có đơn mẫu');
  172 | 
  173 |     for (const order of orders) {
  174 |       const date = dateOf(order);
  175 |       expect(date, 'Đơn hàng thiếu ngày').toBeTruthy();
  176 |       expect(date >= from && date <= to).toBeTruthy();
  177 |     }
  178 |   });
  179 | 
  180 |   test('REPORT-002 - Ngày bắt đầu sau ngày kết thúc', async ({ request }) => {
  181 |     const endpoint = required(API.summary, 'thống kê tổng hợp');
  182 | 
  183 |     const response = await get(
  184 |       request,
  185 |       endpoint,
  186 |       '2026-12-31',
  187 |       '2026-01-01'
  188 |     );
  189 | 
  190 |     expect(
  191 |       [400, 422],
  192 |       'API phải từ chối khoảng ngày không hợp lệ'
  193 |     ).toContain(response.status());
  194 |   });
  195 | 
  196 |   test('REPORT-003 - Thống kê doanh thu', async ({ request }) => {
  197 |     const endpoint = required(API.orders, 'danh sách đơn hàng');
  198 | 
  199 |     const body = await json(await get(request, endpoint));
  200 |     const orders = records(body);
  201 | 
  202 |     test.skip(orders.length === 0, 'Chưa có dữ liệu đơn hàng');
  203 | 
  204 |     const completed = orders.filter(order =>
  205 |       ['COMPLETED', 'DELIVERED'].includes(orderStatus(order))
  206 |     );
  207 | 
  208 |     const cancelled = orders.filter(order =>
  209 |       ['CANCELLED', 'CANCELED'].includes(orderStatus(order))
  210 |     );
  211 | 
  212 |     test.skip(
  213 |       !completed.length || !cancelled.length,
  214 |       'Cần cả đơn hoàn thành và đã hủy để đối chiếu'
  215 |     );
  216 | 
  217 |     const expected = completed.reduce(
  218 |       (sum, order) => sum + orderTotal(order),
  219 |       0
  220 |     );
  221 | 
  222 |     const summary = await json(
  223 |       await get(request, required(API.summary, 'tổng doanh thu'))
  224 |     );
  225 | 
  226 |     const revenue = summary.totalRevenue ?? summary.revenue;
  227 | 
  228 |     expect(revenue, 'Không có trường doanh thu').toBeDefined();
  229 |     expect(number(revenue)).toBe(expected);
  230 |   });
  231 | 
  232 |   test('REPORT-004 - Top sản phẩm bán chạy', async ({ request }) => {
  233 |     const endpoint = required(API.products, 'top sản phẩm');
  234 |     const rows = records(await json(await get(request, endpoint)));
  235 | 
```