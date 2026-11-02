package com.dacs.fashion.service;

import com.dacs.fashion.dto.BrandDTO;
import com.dacs.fashion.dto.CategoryDTO;
import com.dacs.fashion.entity.Brand;
import com.dacs.fashion.entity.Category;
import com.dacs.fashion.repository.BrandRepository;
import com.dacs.fashion.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CatalogFunctionTest {
    CategoryRepository categories;
    BrandRepository brands;
    CategoryService categoryService;
    BrandService brandService;
    @BeforeEach void setup() {
        categories=mock(CategoryRepository.class);brands=mock(BrandRepository.class);
        categoryService=new CategoryService(categories);brandService=new BrandService(brands);
    }
    CategoryDTO categoryDto(Long parentId) {
        var d=new CategoryDTO();d.setCategoryName("Áo nam");d.setDescription("Thời trang nam");d.setStatus("ACTIVE");d.setParentId(parentId);return d;
    }
    BrandDTO brandDto() {var d=new BrandDTO();d.setBrandName("JODOK");d.setDescription("Nhãn hàng");return d;}
    @Test void category001_xemDanhSach(){when(categories.findAll()).thenReturn(List.of(new Category()));assertEquals(1,categoryService.getAll().size());}
    @Test void category002_themDanhMuc(){when(categories.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("Áo nam",categoryService.create(categoryDto(null)).getCategoryName());}
    @Test void category003_themDanhMucCon(){var parent=new Category();when(categories.findById(1L)).thenReturn(Optional.of(parent));when(categories.save(any())).thenAnswer(i->i.getArgument(0));assertSame(parent,categoryService.create(categoryDto(1L)).getParent());}
    @Test void category004_suaDanhMuc(){when(categories.findById(1L)).thenReturn(Optional.of(new Category()));when(categories.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("Áo nam",categoryService.update(1L,categoryDto(null)).getCategoryName());}
    @Test void category005_khongTimThayDanhMuc(){assertThrows(RuntimeException.class,()->categoryService.getById(999L));}
    @Test void category006_xoaDanhMuc(){categoryService.delete(1L);verify(categories).deleteById(1L);}
    @Test void brand001_xemDanhSach(){when(brands.findAll()).thenReturn(List.of(new Brand()));assertEquals(1,brandService.getAll().size());}
    @Test void brand002_themThuongHieu(){when(brands.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("ACTIVE",brandService.create(brandDto()).getStatus());}
    @Test void brand003_suaThuongHieu(){when(brands.findById(1L)).thenReturn(Optional.of(new Brand()));when(brands.save(any())).thenAnswer(i->i.getArgument(0));assertEquals("JODOK",brandService.update(1L,brandDto()).getBrandName());}
    @Test void brand004_xoaThuongHieu(){var b=new Brand();when(brands.findById(1L)).thenReturn(Optional.of(b));brandService.delete(1L);verify(brands).delete(b);}
    @Test void brand005_khongTimThayThuongHieu(){assertThrows(RuntimeException.class,()->brandService.getById(999L));}
}
