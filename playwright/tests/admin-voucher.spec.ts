import { test, expect, type APIRequestContext } from '@playwright/test';

const enabled = process.env.JODOK_RUN_ADMIN_WRITES === '1';
const email = process.env.JODOK_ADMIN_EMAIL || '';
const password = process.env.JODOK_ADMIN_PASSWORD || '';
const seed = () => ({ code: `E2E-ADMIN-${Date.now()}-${Math.floor(Math.random()*100000)}`, discountType:'PERCENT', discountValue:10, minOrderValue:0, endDate:'2090-12-31', status:'ACTIVE' });
type V = ReturnType<typeof seed>;

async function headers(request: APIRequestContext) {
  test.skip(!enabled, 'Chưa bật JODOK_RUN_ADMIN_WRITES=1 trên database test');
  test.skip(!email || !password, 'Cần JODOK_ADMIN_EMAIL/JODOK_ADMIN_PASSWORD');
  const r = await request.post('/api/auth/login', { data: {email,password} });
  expect(r.ok(), `Không đăng nhập được ADMIN: HTTP ${r.status()}`).toBeTruthy();
  const body = await r.json();
  expect(body.token, 'Không nhận được JWT').toBeTruthy();
  return {Authorization: `Bearer ${body.token}`};
}
async function create(request: APIRequestContext, h: Record<string,string>, payload: V) {
  const r = await request.post('/api/vouchers', {headers:h,data:payload});
  expect(r.status(), `Tạo voucher: ${await r.text()}`).toBe(201);
  const body = await r.json();
  expect(body.voucherId).toBeTruthy();
  return body as V & {voucherId:number};
}
async function remove(request: APIRequestContext,h: Record<string,string>,id:number) {
  const r = await request.delete(`/api/vouchers/${id}`, {headers:h});
  expect(r.status()).toBe(204);
}
async function negative(request: APIRequestContext,h: Record<string,string>, payload:V) {
  const r=await request.post('/api/vouchers',{headers:h,data:payload});
  // Validation rejects bad payload. Do not treat 500 as PASS.
  expect(r.status(), `Phản hồi: ${await r.text()}`).toBe(400);
}

test.describe('Khuyến mãi quản trị — ADMINVOUCH Excel', () => {
  test('ADMINVOUCH-001 - Tạo voucher hợp lệ', async ({request}) => {
    const h=await headers(request); const v=await create(request,h,seed());
    try { const r=await request.get('/api/vouchers'); expect(r.ok()).toBeTruthy(); expect((await r.json()).some((x:any)=>x.voucherId===v.voucherId && x.code===v.code)).toBeTruthy(); }
    finally { await remove(request,h,v.voucherId); }
  });
  test('ADMINVOUCH-002 - Trùng mã voucher', async ({request}) => {
    const h=await headers(request); const v=await create(request,h,seed());
    try { await negative(request,h,{...seed(),code:v.code}); } finally {await remove(request,h,v.voucherId);}
  });
  test('ADMINVOUCH-003 - Ngày kết thúc trước bắt đầu', async () => { test.skip(true,'Voucher hiện dùng endDate; chưa có validation startDate/endDate trong controller'); });
  test('ADMINVOUCH-004 - Giá trị giảm âm',async({request})=>{const h=await headers(request);await negative(request,h,{...seed(),discountValue:-10});});
  test('ADMINVOUCH-005 - Phần trăm vượt 100',async({request})=>{const h=await headers(request);await negative(request,h,{...seed(),discountValue:120});});
  test('ADMINVOUCH-006 - Giới hạn lượt âm',async()=>{test.skip(true,'Chưa có trường maxUsage trong entity Voucher');});
  test('ADMINVOUCH-007 - Giảm tối đa âm',async()=>{test.skip(true,'Chưa có trường maxDiscount trong entity Voucher');});
  test('ADMINVOUCH-008 - Sửa voucher',async({request})=>{
    const h=await headers(request);const v=await create(request,h,seed());
    try {const r=await request.put(`/api/vouchers/${v.voucherId}`,{headers:h,data:{...v,minOrderValue:123456}});expect(r.ok(),await r.text()).toBeTruthy();const list=await (await request.get('/api/vouchers')).json();expect(list.find((x:any)=>x.voucherId===v.voucherId)?.minOrderValue).toBe(123456);}finally{await remove(request,h,v.voucherId);}
  });
  test('ADMINVOUCH-009 - Vô hiệu voucher',async({request})=>{
    const h=await headers(request);const v=await create(request,h,seed());
    try {const r=await request.put(`/api/vouchers/${v.voucherId}`,{headers:h,data:{...v,status:'INACTIVE'}});expect(r.ok(),await r.text()).toBeTruthy();expect((await r.json()).status).toBe('INACTIVE');}finally{await remove(request,h,v.voucherId);}
  });
  test('ADMINVOUCH-010 - Voucher hết hạn',async({request})=>{
    const h=await headers(request);const r=await request.post('/api/vouchers',{headers:h,data:{...seed(),endDate:'2020-01-01'}});
    expect(r.status(),await r.text()).toBe(400);
  });
});
