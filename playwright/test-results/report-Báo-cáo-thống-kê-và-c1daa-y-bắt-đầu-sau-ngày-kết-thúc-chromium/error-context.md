# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: report.spec.ts >> Báo cáo thống kê và Excel — REPORT Excel >> REPORT-002 - Ngày bắt đầu sau ngày kết thúc
- Location: tests\report.spec.ts:180:7

# Error details

```
Error: API phải từ chối khoảng ngày không hợp lệ

expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [400, 422]
```

# Test source

```ts
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
  135 |     .toBeTruthy();
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
> 193 |     ).toContain(response.status());
      |       ^ Error: API phải từ chối khoảng ngày không hợp lệ
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
  236 |     test.skip(rows.length < 2, 'Cần ít nhất hai sản phẩm');
  237 | 
  238 |     const quantities = rows.map(row =>
  239 |       number(row.totalSold ?? row.soldQuantity ?? row.quantitySold)
  240 |     );
  241 | 
  242 |     quantities.forEach(q => expect(Number.isFinite(q)).toBeTruthy());
  243 | 
  244 |     for (let i = 1; i < quantities.length; i++) {
  245 |       expect(quantities[i - 1]).toBeGreaterThanOrEqual(quantities[i]);
  246 |     }
  247 |   });
  248 | 
  249 |   test('REPORT-005 - Top khách hàng', async ({ request }) => {
  250 |     const endpoint = required(API.customers, 'top khách hàng');
  251 |     const rows = records(await json(await get(request, endpoint)));
  252 | 
  253 |     test.skip(rows.length < 2, 'Cần ít nhất hai khách hàng');
  254 | 
  255 |     const totals = rows.map(row =>
  256 |       number(row.totalSpent ?? row.totalAmount ?? row.totalPurchase)
  257 |     );
  258 | 
  259 |     totals.forEach(total =>
  260 |       expect(Number.isFinite(total)).toBeTruthy()
  261 |     );
  262 | 
  263 |     for (let i = 1; i < totals.length; i++) {
  264 |       expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
  265 |     }
  266 |   });
  267 | 
  268 |   test('REPORT-006 - Xuất Excel tổng hợp', async ({ request }) => {
  269 |     const result = await excel(request);
  270 | 
  271 |     const allRows = result.sheets.flatMap(sheet => sheet.rows);
  272 | 
  273 |     expect(allRows.length, 'File Excel chưa có dữ liệu')
  274 |       .toBeGreaterThan(0);
  275 | 
  276 |     expect(
  277 |       Object.keys(allRows[0]).length,
  278 |       'File Excel không có các cột dữ liệu'
  279 |     ).toBeGreaterThan(0);
  280 |   });
  281 | 
  282 |   test('REPORT-007 - Excel theo bộ lọc ngày', async ({ request }) => {
  283 |     const from = '2026-01-01';
  284 |     const to = '2026-12-31';
  285 | 
  286 |     const result = await excel(request, from, to);
  287 | 
  288 |     const rows = result.sheets.flatMap(sheet => sheet.rows);
  289 | 
  290 |     const dates = rows
  291 |       .map(row => row['Ngày đặt'] ?? row['Ngày'] ?? row['Order Date'])
  292 |       .filter(Boolean)
  293 |       .map(value => {
```