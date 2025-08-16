import { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";

function HocPhanDaGhiDanh({ onChonHocPhan }) {
  const { openNotify } = useModalContext();

  const [hocPhanList, setHocPhanList] = useState([]);
  const [daDangKyList, setDaDangKyList] = useState([]);
  const [isNotRegistrationPhase, setIsNotRegistrationPhase] = useState(false); // ✅ thêm state

  const hocPhanChuyenNganh = hocPhanList.filter(
    (hp) => hp.loai_mon === "chuyen_nganh"
  );
  const hocPhanTuChon = hocPhanList.filter((hp) => hp.loai_mon === "tu_chon");

  useEffect(() => {
    fetchHocPhan();
    fetchDaDangKy();
  }, []);

  const fetchHocPhan = async () => {
    try {
      const res = await axios.get(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky/available",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const daGhiDanhChuaDangKy = res.data.filter((hp) => !hp.da_dang_ky);
      setHocPhanList(daGhiDanhChuaDangKy);
      setIsNotRegistrationPhase(daGhiDanhChuaDangKy.length === 0); // ✅ nếu không còn học phần để đăng ký
    } catch {
      console.error("Lỗi khi tải danh sách học phần đã ghi danh.");
      setIsNotRegistrationPhase(true); // ✅ lỗi cũng xem là chưa đến phase đăng ký
    }
  };

  const fetchDaDangKy = async () => {
    try {
      const res = await axios.get(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky/my",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setDaDangKyList(res.data);
    } catch {
      openNotify("Lỗi khi tải danh sách đã đăng ký.", "error");
    }
  };

  const handleHuyDangKy = async (id) => {
    try {
      await axios.delete(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky/${id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      openNotify("Đã hủy đăng ký.", "success");
      fetchDaDangKy();
      fetchHocPhan(); // cập nhật lại học phần chưa đăng ký
    } catch {
      openNotify("Lỗi khi hủy đăng ký.", "error");
    }
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">ĐĂNG KÝ HỌC PHẦN</p>
      </div>

      <div className="body__inner">
        {/* Danh sách học phần đã ghi danh */}

        <fieldset className="fieldeset__dkhp">
          <legend>Đăng ký theo kế hoạch</legend>
          <table className="table tr__hover">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã HP</th>
                <th>Tên HP</th>
                <th>Giảng viên</th>
                <th>STC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    textAlign: "left",
                    fontWeight: "bolder",
                    fontSize: "14px",
                    color: "#172b4b",
                    backgroundColor: "#92caed",
                  }}
                  colSpan={6}
                >
                  Bắt buộc
                </td>
              </tr>
              {hocPhanChuyenNganh.length > 0 ? (
                hocPhanChuyenNganh.map((hp, index) => (
                  <tr key={hp.hoc_phan_id} onClick={() => onChonHocPhan(hp)}>
                    <td>{index + 1}</td>
                    <td>{hp.ma_mon}</td>
                    <td>{hp.ten_mon}</td>
                    <td>{hp.ten_giang_vien || "Chưa phân công"}</td>
                    <td>{hp.so_tin_chi}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Tất cả học phần đã được đăng ký.
                  </td>
                </tr>
              )}

              <tr>
                <td
                  style={{
                    textAlign: "left",
                    fontWeight: "bolder",
                    fontSize: "14px",
                    color: "#172b4b",
                    backgroundColor: "#92caed",
                  }}
                  colSpan={6}
                >
                  Tự chọn
                </td>
              </tr>
              {hocPhanTuChon.length > 0 ? (
                hocPhanTuChon.map((hp, index) => (
                  <tr key={hp.hoc_phan_id} onClick={() => onChonHocPhan(hp)}>
                    <td>{index + 1}</td>
                    <td>{hp.ma_mon}</td>
                    <td>{hp.ten_mon}</td>
                    <td>{hp.ten_giang_vien || "Chưa phân công"}</td>
                    <td>{hp.so_tin_chi}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Tất cả học phần đã được đăng ký.
                  </td>
                </tr>
              )}

              {/* {hocPhanList.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    Tất cả học phần đã được đăng ký lớp.
                  </td>
                </tr>
              )} */}
            </tbody>
          </table>
        </fieldset>

        {/* ✅ Thông báo nếu chưa đến giai đoạn đăng ký */}
        {isNotRegistrationPhase && (
          <p
            style={{
              color: "red",
              fontWeight: "bold",
              marginTop: "1rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Chưa tới thời hạn đăng ký học phần. Vui lòng thử lại sau!
          </p>
        )}

        {/* Danh sách lớp học phần đã đăng ký */}
        <fieldset className="fieldeset__dkhp">
          <legend>
            Kết quả đăng ký: {daDangKyList.length} học phần,{" "}
            {daDangKyList.reduce(
              (total, item) => total + (item.so_tin_chi || 0),
              0
            )}{" "}
            tín chỉ
          </legend>
          <div className="note__dkhp">
            Ghi chú: <span className="note__highlight__yellow"></span> Trùng
            lịch <span className="note__highlight__red"></span> Lớp học phần bị
            hủy
          </div>
          <table className="table table_ddk">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã lớp HP</th>
                <th>Tên môn</th>
                <th>Giảng viên</th>
                <th>Phòng học</th>
                <th>Ngày học</th>
                <th>Tiết</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {daDangKyList.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center" }}>
                    Chưa đăng ký lớp học phần nào.
                  </td>
                </tr>
              ) : (
                daDangKyList.map((lop, index) => (
                  <tr key={lop.id}>
                    <td>{index + 1}</td>
                    <td>{lop.ma_lop}</td>
                    <td>{lop.ten_mon}</td>
                    <td>{lop.ten_giang_vien || "Chưa phân công"}</td>
                    <td>{lop.phong_hoc}</td>
                    <td>
                      {Array.isArray(lop.ngay_hoc)
                        ? lop.ngay_hoc.join(", ")
                        : lop.ngay_hoc}
                    </td>
                    <td>
                      {lop.tiet_bat_dau} - {lop.tiet_ket_thuc}
                    </td>
                    <td>{lop.ngay_bat_dau?.slice(0, 10)}</td>
                    <td>{lop.ngay_ket_thuc?.slice(0, 10)}</td>
                    <td>
                      <button
                        className="btn__cancel w50__h20"
                        onClick={() => handleHuyDangKy(lop.lop_hoc_phan_id)}
                      >
                        Hủy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </fieldset>
      </div>
    </section>
  );
}

export default HocPhanDaGhiDanh;
