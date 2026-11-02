import { test, expect, type APIRequestContext } from '@playwright/test';
const enabled = process.env.JODOK_RUN_ADMIN_WRITES === '1';
async function auth(request: APIRequestContext) {
  test.skip(!enabled,'Chưa bật JODOK_RUN_ADMIN_WRITES=1 trên database test');
  const email=process.env.JODOK_ADMIN_EMAIL, password=process.env.JODOK_ADMIN_PASSWORD;
  test.skip(!email||!password,'Cần tài khoản ADMIN qua biến môi trường');
  const r=await request.post('/api/auth/login',{data:{email,password}});
  expect(r.ok(),await r.text()).toBeTruthy();
  return {Authorization:`Bearer ${(await r.json()).token}`};
}
async function categories(request:APIRequestContext) {
  const r=await request.get('/api/products?all=true'); expect(r.ok()).toBeTruthy();
  const list=await r.json();const p=list.find((x:any)=>x.category?.categoryId);
  test.skip(!p,'Cần sản phẩm có danh mục trong database test');
  return {categoryId:p.category.categoryId,brandId:p.brand?.brandId??null};
}
const fixture=(refs:any)=>({...refs,productName:`E2E PRODUCT ${Date.now()}`,description:'Sản phẩm phục vụ kiểm thử',basePrice:150000,status:'INACTIVE'});


async function ownProduct(request:APIRequestContext,h:Record<string,string>, overrides:Record<string,unknown>={}) {
  const d={...fixture(await categories(request)),...overrides};
  const r=await request.post('/api/products',{headers:h,data:d});
  expect([200,201],`Tạo sản phẩm fixture: ${await r.text()}`).toContain(r.status());
  const saved=await r.json(); expect(saved.productId).toBeTruthy();
  return {id:saved.productId as number, data:d};
}
async function deleteOwn(request:APIRequestContext,h:Record<string,string>,id:number){
  const r=await request.delete(`/api/products/${id}`,{headers:h});
  expect(r.ok(),`Dọn fixture ${id}: ${await r.text()}`).toBeTruthy();
}
async function ownVariant(request:APIRequestContext,h:Record<string,string>,id:number,size:string,color:string){
 const d={productId:id,size,color,stock:2,price:150000,status:'ACTIVE',sku:`E2E-PROD-${Date.now()}-${Math.round(Math.random()*1e6)}`};
 const r=await request.post('/api/variants',{headers:h,data:d});
 expect([200,201],`Tạo biến thể: ${await r.text()}`).toContain(r.status());
 return (await r.json()).variantId as number;
}
async function imageCreate(request:APIRequestContext,h:Record<string,string>,productId:number,imageUrl:string,color:string|null=null){
 const r=await request.post('/api/product-images',{headers:h,data:{productId,imageUrl,color,isMain:true}});
 expect([200,201],`Tạo ảnh: ${await r.text()}`).toContain(r.status()); return (await r.json()).imageId as number;
}

test.describe('Quản trị sản phẩm — ADMINPROD Excel',()=>{
  test('ADMINPROD-001 - Thêm sản phẩm hợp lệ',async({request})=>{const h=await auth(request);const x=await ownProduct(request,h);try{const imageId=await imageCreate(request,h,x.id,'https://placehold.co/400x500/png');const variantId=await ownVariant(request,h,x.id,'S','Đen');const r=await request.get('/api/products?all=true');expect((await r.json()).some((p:any)=>p.productId===x.id)).toBeTruthy();const imgResponse=await request.get(`/api/product-images/product/${x.id}`,{headers:h});expect(imgResponse.ok(),`GET ảnh: HTTP ${imgResponse.status()} - ${await imgResponse.text()}`).toBeTruthy();const imgs=await imgResponse.json();expect(Array.isArray(imgs),'API danh sách ảnh phải trả mảng JSON').toBeTruthy();expect(imgs.some((i:any)=>i.imageId===imageId)).toBeTruthy();const vs=await (await request.get(`/api/variants/product/${x.id}`)).json(); // INACTIVE không hiện theo API public, kiểm tra API chi tiết biến thể
const rv=await request.get(`/api/variants/${variantId}`,{headers:h});expect(rv.ok(),`GET biến thể: HTTP ${rv.status()} - ${await rv.text()}`).toBeTruthy();}finally{await deleteOwn(request,h,x.id);}});
  test('ADMINPROD-002 - Thiếu tên sản phẩm',async({request})=>{const h=await auth(request);const data={...fixture(await categories(request)),productName:''};const r=await request.post('/api/products',{headers:h,data});expect([400,422]).toContain(r.status());});
  test('ADMINPROD-003 - Thiếu ảnh bắt buộc',async()=>{test.skip(true,'Cần test form ảnh sản phẩm trên giao diện admin');});
  test('ADMINPROD-004 - Giá âm',async({request})=>{const h=await auth(request);const r=await request.post('/api/products',{headers:h,data:{...fixture(await categories(request)),basePrice:-10000}});expect([400,422]).toContain(r.status());});
  test('ADMINPROD-005 - Giá bằng 0',async({request})=>{const h=await auth(request);const x=await ownProduct(request,h,{basePrice:0});try{const list=await(await request.get('/api/products?all=true')).json();expect(Number(list.find((p:any)=>p.productId===x.id)?.basePrice)).toBe(0);}finally{await deleteOwn(request,h,x.id);}});
  test('ADMINPROD-006 - Thiếu danh mục',async({request})=>{const h=await auth(request);const r=await request.post('/api/products',{headers:h,data:{...fixture({categoryId:null,brandId:null})}});expect([400,422]).toContain(r.status());});
  test('ADMINPROD-007 - Ảnh TXT',async()=>{test.skip(true,'Cần selector upload ảnh admin và chính sách MIME');});
  test('ADMINPROD-008 - Ảnh quá lớn',async()=>{test.skip(true,'Cần xác định cấu hình giới hạn upload');});
  test('ADMINPROD-009 - Thêm 4 biến thể S/M',async()=>{test.skip(true,'Cần luồng form admin thêm nhiều biến thể và ảnh');});
  test('ADMINPROD-010 - Sửa tên giá mô tả',async({request})=>{const h=await auth(request);const x=await ownProduct(request,h);try{const d={...x.data,productName:'E2E ĐÃ SỬA',description:'Mô tả đã sửa',basePrice:180000};const r=await request.put(`/api/products/${x.id}`,{headers:h,data:d});expect(r.ok(),await r.text()).toBeTruthy();const list=await(await request.get('/api/products?all=true')).json();const found=list.find((z:any)=>z.productId===x.id);expect(found.productName).toBe(d.productName);expect(found.description).toBe(d.description);expect(Number(found.basePrice)).toBe(180000);}finally{await deleteOwn(request,h,x.id);}});
  test('ADMINPROD-011 - Sửa ảnh',async()=>{test.skip(true,'Cần luồng upload và xóa ảnh thực tế');});
  test('ADMINPROD-012 - Ẩn sản phẩm',async({request})=>{const h=await auth(request);const x=await ownProduct(request,h,{status:'ACTIVE'});try{const r=await request.put(`/api/products/${x.id}`,{headers:h,data:{...x.data,status:'INACTIVE'}});expect(r.ok(),await r.text()).toBeTruthy();const publicList=await(await request.get('/api/products')).json();expect(publicList.some((z:any)=>z.productId===x.id)).toBeFalsy();const adminList=await(await request.get('/api/products?all=true')).json();expect(adminList.find((z:any)=>z.productId===x.id)?.status).toBe('INACTIVE');}finally{await deleteOwn(request,h,x.id);}});
  test('ADMINPROD-013 - Xóa sản phẩm có đơn',async()=>{test.skip(true,'Không xóa dữ liệu đơn lịch sử đang có; cần fixture đơn riêng');});
  test('ADMINPROD-014 - Ảnh JPG PNG WebP',async()=>{test.skip(true,'Cần fixture 3 ảnh hợp lệ và form upload');});
  test('ADMINPROD-015 - Chọn thương hiệu',async({request})=>{const h=await auth(request);const refs=await categories(request);test.skip(!refs.brandId,'Chưa có sản phẩm liên kết thương hiệu trong DB test');const x=await ownProduct(request,h,{brandId:refs.brandId});try{const list=await(await request.get('/api/products?all=true')).json();expect(list.find((z:any)=>z.productId===x.id)?.brand?.brandId).toBe(refs.brandId);}finally{await deleteOwn(request,h,x.id);}});
  test('ADMINPROD-016 - Khách thường vào quản trị sản phẩm',async({request})=>{
    const email=process.env.JODOK_TEST_EMAIL,password=process.env.JODOK_TEST_PASSWORD;
    test.skip(!email||!password,'Cần tài khoản khách JODOK_TEST_EMAIL/PASSWORD');
    const r=await request.post('/api/auth/login',{data:{email,password}});expect(r.ok()).toBeTruthy();
    const h={Authorization:`Bearer ${(await r.json()).token}`};
    const res=await request.post('/api/products',{headers:h,data:{productName:'E2E FORBIDDEN',categoryId:-999,basePrice:1000,status:'INACTIVE'}});
    expect([401,403],`HTTP ${res.status()}, endpoint phải chặn USER trước khi xử lý payload`).toContain(res.status());
  });
});
