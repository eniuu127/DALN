package com.dacs.fashion.service;

import com.dacs.fashion.config.JwtUtil;
import com.dacs.fashion.dto.LoginDTO;
import com.dacs.fashion.dto.UserDTO;
import com.dacs.fashion.entity.User;
import com.dacs.fashion.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Bám mã AUTH/LOGIN trong Excel; chỉ kiểm tra tầng AuthService, không xác minh UI/DB thật. */
class AuthFunctionTest {
    private UserRepository repo;
    private PasswordEncoder encoder;
    private JwtUtil jwt;
    private AuthService service;

    @BeforeEach void setup() {
        repo = mock(UserRepository.class);
        encoder = mock(PasswordEncoder.class);
        jwt = mock(JwtUtil.class);
        service = new AuthService(repo, encoder, jwt);
    }
    private UserDTO registration(String name, String email, String pass) {
        UserDTO dto = new UserDTO();
        dto.setFullname(name); dto.setEmail(email); dto.setPassword(pass);
        dto.setPhone("0912345678");
        return dto;
    }
    private LoginDTO login(String email, String pass) {
        LoginDTO dto = new LoginDTO(); dto.setEmail(email); dto.setPassword(pass);
        return dto;
    }
    private User activeUser() {
        User u = new User(); u.setUserId(1L); u.setEmail("test@jodok.vn");
        u.setPassword("hashed"); u.setStatus("ACTIVE"); u.setRole("USER"); u.setFullname("Nguyen Van A");
        return u;
    }
    @Test void auth001_dangKyThongTinHopLe() {
        when(encoder.encode("abc12345")).thenReturn("hashed");
        when(repo.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        User u = service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345"));
        assertEquals("test@jodok.vn", u.getEmail());
        assertEquals("Nguyen Van A", u.getFullname());
        assertEquals("hashed", u.getPassword());
        assertEquals("USER", u.getRole());
        verify(repo).save(any(User.class));
    }
    @Test void auth002_boTrongEmail() {
        var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("Nguyen Van A", "", "abc12345")));
        assertEquals("Email không hợp lệ", e.getMessage());
        verify(repo, never()).save(any());
    }
    @Test void auth003_emailSaiDinhDang() {
        for (String email : new String[]{"abc@", "abc.com"}) {
            var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("Nguyen Van A", email, "abc12345")));
            assertEquals("Email không hợp lệ", e.getMessage());
        }
        verify(repo, never()).save(any());
    }
    @Test void auth004_emailDaTonTai() {
        when(repo.existsByEmailIgnoreCase("test@jodok.vn")).thenReturn(true);
        var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345")));
        assertEquals("Email đã được sử dụng", e.getMessage());
        verify(repo, never()).save(any());
    }
    @Test void auth005_matKhauQuaNgan() {
        var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12")));
        assertTrue(e.getMessage().contains("8"));
        verify(repo, never()).save(any());
    }
    @Test void auth007_hoTenChiCoDauCach() {
        var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("   ", "test@jodok.vn", "abc12345")));
        assertTrue(e.getMessage().contains("Họ tên"));
        verify(repo, never()).save(any());
    }
    @Test void auth009_guiHaiLanKhongLuuTrung_oTangService() {
        when(encoder.encode("abc12345")).thenReturn("hashed");
        when(repo.existsByEmailIgnoreCase("test@jodok.vn")).thenReturn(false, true);
        when(repo.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345"));
        assertThrows(IllegalArgumentException.class, () -> service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345")));
        verify(repo, times(1)).save(any(User.class));
    }
    @Test void auth010_hoTenQua255KyTu() {
        var e = assertThrows(IllegalArgumentException.class, () -> service.register(registration("A".repeat(256), "test@jodok.vn", "abc12345")));
        assertTrue(e.getMessage().contains("255"));
        verify(repo, never()).save(any());
    }
    @Test void auth011_matKhauDuocMaHoaTruocKhiLuu_oTangService() {
        when(encoder.encode("abc12345")).thenReturn("$2a$test-hash");
        when(repo.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345"));
        verify(encoder).encode("abc12345");
        verify(repo).save(argThat(user -> "$2a$test-hash".equals(user.getPassword()) && !"abc12345".equals(user.getPassword())));
    }
    @Test void auth012_dangKyRoiDangNhap_oTangService() {
        when(encoder.encode("abc12345")).thenReturn("hashed");
        when(repo.save(any(User.class))).thenAnswer(i -> { User u = i.getArgument(0); u.setUserId(1L); return u; });
        User created = service.register(registration("Nguyen Van A", "test@jodok.vn", "abc12345"));
        when(repo.findByEmailIgnoreCase("test@jodok.vn")).thenReturn(Optional.of(created));
        when(encoder.matches("abc12345", "hashed")).thenReturn(true);
        when(jwt.generateToken(any(User.class))).thenReturn("token-test");
        assertEquals("token-test", service.login(login("test@jodok.vn", "abc12345")).get("token"));
    }
    @Test void login001_dangNhapDung() {
        when(repo.findByEmailIgnoreCase("test@jodok.vn")).thenReturn(Optional.of(activeUser()));
        when(encoder.matches("abc12345", "hashed")).thenReturn(true);
        when(jwt.generateToken(any(User.class))).thenReturn("token-test");
        var result = service.login(login("test@jodok.vn", "abc12345"));
        assertEquals("token-test", result.get("token"));
        assertEquals("Nguyen Van A", result.get("fullname"));
    }
    @Test void login002_matKhauSai() {
        when(repo.findByEmailIgnoreCase("test@jodok.vn")).thenReturn(Optional.of(activeUser()));
        assertThrows(IllegalArgumentException.class, () -> service.login(login("test@jodok.vn", "matkhau-sai")));
        verify(jwt, never()).generateToken(any());
    }
    @Test void login003_emailKhongTonTai() {
        assertThrows(IllegalArgumentException.class, () -> service.login(login("missing@jodok.vn", "abc12345")));
        verify(jwt, never()).generateToken(any());
    }
    @Test void login004_boTrongEmail() {
        assertThrows(IllegalArgumentException.class, () -> service.login(login("", "abc12345")));
        verify(jwt, never()).generateToken(any());
    }
    @Test void login005_boTrongMatKhau() {
        assertThrows(IllegalArgumentException.class, () -> service.login(login("test@jodok.vn", "")));
        verify(jwt, never()).generateToken(any());
    }
}
