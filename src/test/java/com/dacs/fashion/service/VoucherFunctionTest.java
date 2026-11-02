package com.dacs.fashion.service;

import com.dacs.fashion.entity.Voucher;
import com.dacs.fashion.repository.VoucherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VoucherFunctionTest {
    VoucherRepository repo;VoucherService service;
    @BeforeEach void setup(){repo=mock(VoucherRepository.class);service=new VoucherService(repo);}
    Voucher voucher(String status, LocalDate end, BigDecimal min) {
        var v=new Voucher();v.setStatus(status);v.setEndDate(end);v.setMinOrderValue(min);return v;
    }
    @Test void voucher001_maHopLe(){var v=voucher("ACTIVE",LocalDate.now().plusDays(2),new BigDecimal("200000"));when(repo.findByCode("SALE10")).thenReturn(Optional.of(v));assertSame(v,service.validateVoucher("SALE10",new BigDecimal("300000")));}
    @Test void voucher002_khongTonTai(){assertThrows(RuntimeException.class,()->service.validateVoucher("SAICODE",new BigDecimal("300000")));}
    @Test void voucher003_biKhoa(){when(repo.findByCode("SALE10")).thenReturn(Optional.of(voucher("INACTIVE",null,BigDecimal.ZERO)));assertThrows(RuntimeException.class,()->service.validateVoucher("SALE10",new BigDecimal("300000")));}
    @Test void voucher004_hetHan(){when(repo.findByCode("SALE10")).thenReturn(Optional.of(voucher("ACTIVE",LocalDate.now().minusDays(1),BigDecimal.ZERO)));assertThrows(RuntimeException.class,()->service.validateVoucher("SALE10",new BigDecimal("300000")));}
    @Test void voucher005_chuaDuGiaTriToiThieu(){when(repo.findByCode("SALE10")).thenReturn(Optional.of(voucher("ACTIVE",null,new BigDecimal("500000"))));assertThrows(RuntimeException.class,()->service.validateVoucher("SALE10",new BigDecimal("300000")));}
    @Test void voucher006_giamTheoPhanTram(){var v=new Voucher();v.setDiscountType("PERCENT");v.setDiscountValue(new BigDecimal("10"));assertEquals(0,service.calculateDiscount(v,new BigDecimal("300000")).compareTo(new BigDecimal("30000")));}
    @Test void voucher007_giamTienCoDinh(){var v=new Voucher();v.setDiscountType("FIXED");v.setDiscountValue(new BigDecimal("50000"));assertEquals(0,service.calculateDiscount(v,new BigDecimal("300000")).compareTo(new BigDecimal("50000")));}
}
