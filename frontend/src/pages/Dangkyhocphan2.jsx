import { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";

function LopHocPhanTheoHocPhan({ hocPhan }) {
  const { openNotify } = useModalContext();

  const [lopList, setLopList] = useState([]);

  useEffect(() => {
    fetchLopHocPhan();
  }, [hocPhan]);

  const fetchLopHocPhan = async () => {
    try {
      const res = await axios.get(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky/available",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const filtered = res.data.filter(
        (lhp) => lhp.hoc_phan_id === hocPhan.hoc_phan_id
      );
      setLopList(filtered);
    } catch (error) {
      openNotify("Lỗi khi tải lớp học phần", "error");
    }
  };

  const handleDangKy = async (lopHocPhanId) => {
    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky",
        { lopHocPhanId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      openNotify("Đăng ký thành công", "success");
      fetchLopHocPhan(); // reload trạng thái
    } catch (error) {
      openNotify("Lỗi đăng ký", "error");
    }
  };

  const handleHuyDangKy = async (lopHocPhanId) => {
    try {
      await axios.delete(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/dang-ky/${lopHocPhanId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      openNotify("Đã hủy đăng ký", "success");
      fetchLopHocPhan();
    } catch (error) {
      openNotify("Lỗi hủy đăng ký", "error");
    }
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">CÁC LỚP CỦA {hocPhan.ten_mon}</p>
      </div>

      <div className="body__inner">
        <button className="btn__chung" onClick={() => window.location.reload()}>
          ←
        </button>
        <table className="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên lớp HP</th>
              <th>Giảng viên</th>
              <th>Sỉ số tối đa</th>
              <th>Sỉ số hiện tại</th>
              <th>Phòng học</th>
              <th>Ngày học</th>
              <th>Tiết bắt đầu</th>
              <th>Tiết kết thúc</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {lopList.map((lop, index) => (
              <tr key={lop.id}>
                <td>{index + 1}</td>
                <td>{lop.ma_lop}</td>
                <td>{lop.ten_giang_vien || "Chưa phân công"}</td>
                <td>{lop.so_luong_toi_da}</td>
                <td>{lop.so_luong_hien_tai}</td>
                <td>{lop.phong_hoc}</td>
                <td>{lop.ngay_hoc}</td>
                <td>{lop.tiet_bat_dau}</td>
                <td>{lop.tiet_ket_thuc}</td>
                <td>{lop.ngay_bat_dau?.slice(0, 10)}</td>
                <td>{lop.ngay_ket_thuc?.slice(0, 10)}</td>
                <td>
                  {lop.da_dang_ky ? (
                    <button
                      className="btn__cancel w50__h20"
                      onClick={() => handleHuyDangKy(lop.id)}
                    >
                      Hủy
                    </button>
                  ) : (
                    <button
                      className="btn__chung w50__h20"
                      onClick={() => handleDangKy(lop.id)}
                    >
                      Đăng ký
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LopHocPhanTheoHocPhan;
