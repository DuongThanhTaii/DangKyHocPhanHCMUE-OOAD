import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";

function ThongKeLopHocPhan() {
  const [dsLop, setDsLop] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Thêm state để lưu trữ giá trị được chọn từ dropdown
  const [dsHocKy, setDsHocKy] = useState([]);
  const [dsNienKhoa, setDsNienKhoa] = useState([]);
  const [selectedHocKy, setSelectedHocKy] = useState("1"); // Mặc định chọn Học kỳ 1
  const [selectedNienKhoa, setSelectedNienKhoa] = useState("");

  // Hàm tải dữ liệu từ API
  const loadData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/thong-ke-lop-hoc-phan?hocKy=${selectedHocKy}&nienKhoa=${selectedNienKhoa}`
      );
      setDsLop(response.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  };

  // useEffect để tạo danh sách học kỳ và niên khóa khi component được mount
  useEffect(() => {
    // Tạo danh sách học kỳ
    setDsHocKy(["1", "2", "3"]);

    // Tạo danh sách niên khóa từ năm hiện tại
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      const startYear = currentYear - i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }
    setDsNienKhoa(years);
    setSelectedNienKhoa(years[0]); // Mặc định chọn niên khóa đầu tiên
  }, []);

  // useEffect để gọi API khi giá trị lọc thay đổi
  useEffect(() => {
    // Chỉ gọi loadData nếu cả hai giá trị đều đã được thiết lập
    if (selectedHocKy && selectedNienKhoa) {
      loadData();
    }
  }, [selectedHocKy, selectedNienKhoa]);

  const normalize = (str) =>
    str
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = dsLop.filter((item) => {
    const keyword = normalize(search);
    return (
      normalize(item.ma_lop || "").includes(keyword) ||
      normalize(item.ten_hoc_phan || "").includes(keyword) ||
      normalize(item.ten_giang_vien || "").includes(keyword) ||
      normalize(item.phong_hoc || "").includes(keyword) ||
      normalize(item.dia_diem || "").includes(keyword)
    );
  });

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">THỐNG KÊ</p>
      </div>
      <div className="body__inner">
        <div className="selecy__duyethp__container mb_0">
          {/* Dropdown chọn Học kỳ */}
          <div className="form__group">
            <select
              id="hocKy"
              className="form__input form__select mr_20 "
              value={selectedHocKy}
              onChange={(e) => setSelectedHocKy(e.target.value)}
            >
              {dsHocKy.map((hk) => (
                <option key={hk} value={hk}>
                  Học kỳ {hk}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown chọn Niên khóa */}
          <div className="form__group">
            <select
              id="nienKhoa"
              className="form__input form__select"
              value={selectedNienKhoa}
              onChange={(e) => setSelectedNienKhoa(e.target.value)}
            >
              {dsNienKhoa.map((nk) => (
                <option key={nk} value={nk}>
                  {nk}
                </option>
              ))}
            </select>
          </div>

          {/* Ô tìm kiếm */}
          {/* <div className="form__group form__group__quanly flex-grow">
            <input
              type="text"
              className="form__input"
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required
            />
          </div> */}
        </div>
        <fieldset className="fieldset__thongke">
          <legend>Tổng: {filtered.length} lớp học phần</legend>

          <div className="form__group form__group__quanly left__120">
            <input
              type="text"
              className="form__input"
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required
            />
          </div>

          <table className="table table_quanly tr__hover">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã LHP</th>
                <th>Tên HP</th>
                <th>Giảng viên</th>
                <th>Sỉ số tối đa</th>
                <th>Sỉ số</th>
                <th>Phòng học</th>
                <th>Ngày học</th>
                <th>Giờ học</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Tổng số tiết</th>
                <th>Địa điểm</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lhp, index) => (
                <tr
                  key={lhp.id}
                  onClick={() => navigate(`/pdt/thong-ke/${lhp.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{index + 1}</td>
                  <td>{lhp.ma_lop}</td>
                  <td>{lhp.ten_hoc_phan}</td>
                  <td>{lhp.ten_giang_vien}</td>
                  <td>{lhp.so_luong_toi_da}</td>
                  <td>{lhp.so_luong_hien_tai}</td>
                  <td>{lhp.phong_hoc}</td>
                  <td>{lhp.ngay_hoc?.join(", ")}</td>
                  <td>{lhp.gio_hoc}</td>
                  <td>{lhp.ngay_bat_dau}</td>
                  <td>{lhp.ngay_ket_thuc}</td>
                  <td>{lhp.tong_so_tiet}</td>
                  <td>{lhp.dia_diem || "ADV"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>
    </section>
  );
}

export default ThongKeLopHocPhan;
