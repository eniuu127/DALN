package com.dacs.fashion.service;

import com.dacs.fashion.dto.ProductDTO;
import com.dacs.fashion.entity.Category;
import com.dacs.fashion.entity.Product;
import com.dacs.fashion.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProductFunctionTest {
    ProductRepository products;CategoryRepository categories;ProductService service;
    @BeforeEach void setup(){
        products=mock(ProductRepository.class);categories=mock(CategoryRepository.class);
        service=new ProductService(products,categories,mock(BrandRepository.class),mock(OrderItemRepository.class),mock(CartItemRepository.class),mock(ProductImageRepository.class),mock(ProductVariantRepository.class),mock(ProductViewRepository.class));
    }
    Product product(String status){var p=new Product();p.setStatus(status);p.setProductName("Áo thun");return p;}
    ProductDTO dto(){var d=new ProductDTO();d.setCategoryId(1L);d.setProductName("Áo thun nam");d.setBasePrice(new BigDecimal("200000"));return d;}
    @Test void product001_chiHienThiSanPhamDangBan(){when(products.findAll()).thenReturn(List.of(product("ACTIVE"),product("INACTIVE")));assertEquals(1,service.getAll().size());}
    @Test void product002_adminXemTatCaSanPham(){when(products.findAll()).thenReturn(List.of(product("ACTIVE"),product("INACTIVE")));assertEquals(2,service.getAllForAdmin().size());}
    @Test void product003_xemChiTietSanPham(){when(products.findById(1L)).thenReturn(Optional.of(product("ACTIVE")));assertEquals("Áo thun",service.getById(1L).getProductName());}
    @Test void product004_sanPhamNgungBan(){when(products.findById(1L)).thenReturn(Optional.of(product("INACTIVE")));assertThrows(RuntimeException.class,()->service.getById(1L));}
    @Test void product005_sanPhamKhongTonTai(){assertThrows(RuntimeException.class,()->service.getById(999L));}
    @Test void product006_timKiemSanPham(){when(products.findByProductNameContaining("áo")).thenReturn(List.of(product("ACTIVE"),product("INACTIVE")));assertEquals(1,service.search("áo").size());}
    @Test void product007_locTheoDanhMuc(){when(products.findByCategory_CategoryId(1L)).thenReturn(List.of(product("ACTIVE"),product("INACTIVE")));assertEquals(1,service.getByCategory(1L).size());}
    @Test void product008_themSanPham(){when(categories.findById(1L)).thenReturn(Optional.of(new Category()));when(products.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("Áo thun nam",service.create(dto()).getProductName());}
    @Test void product009_danhMucKhongTonTai(){assertThrows(RuntimeException.class,()->service.create(dto()));verify(products,never()).save(any());}
    @Test void product010_suaSanPham(){when(products.findById(1L)).thenReturn(Optional.of(product("ACTIVE")));when(categories.findById(1L)).thenReturn(Optional.of(new Category()));when(products.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("Áo thun nam",service.update(1L,dto()).getProductName());}
}
