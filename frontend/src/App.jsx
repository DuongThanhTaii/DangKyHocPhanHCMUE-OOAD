import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./components/LoginPage";
import Menu from "./components/Menu"; // Sinh viên
import MenuPDT from "./components/MenuPDT";
import MenuTLK from "./components/MenuTLK";
import MenuTK from "./components/MenuTK";
import TraCuu from "./pages/Tracuu"; //Sinh viên
import GhiDanh from "./pages/Dangkyghidanh"; //Sinh viên
import DangKyHocPhan from "./pages/Dangkyhocphan"; //Sinh viên
import DangKyHocPhan1 from "./pages/Dangkyhocphan1"; //Sinh viên
import DangKyHocPhan2 from "./pages/Dangkyhocphan2"; //Sinh viên
import LichSuDangKyHocPhan from "./pages/Lichsudangkyhocphan"; //Sinh viên
import ChuyenTrangThai from "./pages/Chuyentrangthai"; // PĐT
import TaoLopHocPhan from "./pages/Taolophocphan"; // PĐT
import QuanLy from "./pages/Quanly"; // PĐT
import ThongKe from "./pages/Thongke"; // PĐT
import ThongKeDSSV from "./pages/Thongkedanhsachsv"; // PĐT
import LenDanhSachHocPhan from "./pages/Lendanhsachhocphan"; // TLK
import DuyetHocPhan from "./pages/Duyethocphan"; // PĐT, TK, TLK

import { ModalProvider } from "./hook/ModalContext";

function App() {
  return (
    <ModalProvider>
      <Router>
        <Routes>
          {/* Trang đăng nhập */}
          <Route path="/" element={<LoginPage />} />

          {/* Layout dành cho SINH VIÊN */}
          <Route path="/main" element={<Menu />}>
            <Route path="dang-ky-hoc-phan" element={<DangKyHocPhan />} />
            <Route path="ghi-danh" element={<GhiDanh />} />
            <Route path="tra-cuu" element={<TraCuu />} />
            <Route
              path="lich-su-dang-ky-hoc-phan"
              element={<LichSuDangKyHocPhan />}
            />
          </Route>

          {/* Layout dành cho PHÒNG ĐÀO TẠO */}
          <Route path="/pdt" element={<MenuPDT />}>
            {/* <Route path="thong-ke" element={<ThongKe />} /> */}
            <Route path="chuyen-trang-thai" element={<ChuyenTrangThai />} />
            <Route path="duyet-hoc-phan" element={<DuyetHocPhan />} />
            <Route path="tao-lop-hoc-phan" element={<TaoLopHocPhan />} />
            <Route path="quan-ly" element={<QuanLy />} />
            <Route path="thong-ke" element={<ThongKe />} />
            <Route path="thong-ke/:id" element={<ThongKeDSSV />} />
          </Route>

          {/* Layout dành cho TRƯỞNG KHOA */}
          <Route path="/tk" element={<MenuTK />}>
            <Route path="duyet-hoc-phan" element={<DuyetHocPhan />} />
          </Route>

          {/* Layout dành cho TRỢ LÝ KHOA */}
          <Route path="/tlk" element={<MenuTLK />}>
            <Route
              path="len-danh-sach-hoc-phan"
              element={<LenDanhSachHocPhan />}
            />
            <Route path="duyet-hoc-phan" element={<DuyetHocPhan />} />
          </Route>
        </Routes>
      </Router>
    </ModalProvider>
  );
}

export default App;
