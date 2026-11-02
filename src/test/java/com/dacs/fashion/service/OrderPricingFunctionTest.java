package com.dacs.fashion.service;

import com.dacs.fashion.entity.Voucher;
import com.dacs.fashion.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderPricingFunctionTest {
    VoucherService vouchers;OrderService service;
    @BeforeEach void setup(){
        vouchers=mock(VoucherService.class);
        service=new OrderService(mock(OrderRepository.class),mock(UserRepository.class),mock(CartRepository.class),mock(CartItemRepository.class),mock(ProductVariantRepository.class),mock(PaymentRepository.class),vouchers,mock(SaleEventService.class));
    }
    void money(String expected,BigDecimal actual){assertEquals(0,new BigDecimal(expected).compareTo(actual));}
    @Test void order001_phiShipDonDuoi999Nghin(){var p=service.calculatePricing(new BigDecimal("200000"),null);money("30000",p.shipping());money("230000",p.total());}
    @Test void order002_mienShipTu999Nghin(){var p=service.calculatePricing(new BigDecimal("999000"),null);money("0",p.shipping());money("999000",p.total());}
    @Test void order003_khongApMaKhiDeTrong(){var p=service.calculatePricing(new BigDecimal("300000"),"  ");money("0",p.discount());verifyNoInteractions(vouchers);}
    @Test void order004_apDungVoucher(){var v=new Voucher();when(vouchers.validateVoucher("SALE10",new BigDecimal("300000"))).thenReturn(v);when(vouchers.calculateDiscount(v,new BigDecimal("300000"))).thenReturn(new BigDecimal("30000"));var p=service.calculatePricing(new BigDecimal("300000"),"SALE10");money("30000",p.discount());money("300000",p.total());}
    @Test void order005_khongChoTongTienAm(){var v=new Voucher();when(vouchers.validateVoucher("BIG",new BigDecimal("10000"))).thenReturn(v);when(vouchers.calculateDiscount(v,new BigDecimal("10000"))).thenReturn(new BigDecimal("60000"));money("0",service.calculatePricing(new BigDecimal("10000"),"BIG").total());}
    @Test void order006_voucherKhongHopLe(){when(vouchers.validateVoucher("BAD",new BigDecimal("300000"))).thenThrow(new RuntimeException("Voucher không tồn tại"));assertThrows(RuntimeException.class,()->service.calculatePricing(new BigDecimal("300000"),"BAD"));}
}
