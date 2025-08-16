import { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";

function LichSuDangKy() {
  const { openNotify } = useModalContext();

  const [lichSu, setLichSu] = useState([]);

  const [namHoc, setNamHoc] = useState("");
  const [hocKy, setHocKy] = useState("");
  const [namHocList, setNamHocList] = useState([]);
  const [hocKyList, setHocKyList] = useState([]);

  const fetchLichSu = (currentNamHoc, currentHocKy) => {
    const params = {};
    if (currentNamHoc) params.namHoc = currentNamHoc;
    if (currentHocKy) params.hocKy = currentHocKy;

    axios
      .get("http://localhost:3000/api/lich-su-dang-ky", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: params,
      })
      .then((res) => {
        if (res.data.success) {
          setLichSu(res.data.data);
        } else {
          openNotify("Không lấy được dữ liệu lịch sử", "error");
        }
      })
      .catch(() => openNotify("Lỗi khi lấy lịch sử đăng ký", "error"));
  };

  useEffect(() => {
    const fetchAcademicTerms = async () => {
      try {
        const res = await axios.get(
          "http://localhost:3000/api/get-academic-terms",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`, // Thêm token vào header
            },
          }
        );
        if (res.data.success) {
          setNamHocList(res.data.namHocList);
          setHocKyList(res.data.hocKyList);
        } else {
          openNotify("Không lấy được danh sách năm học và học kỳ", "error");
        }
      } catch (error) {
        openNotify("Lỗi khi lấy danh sách năm học và học kỳ", "error");
        console.error("Failed to fetch academic terms:", error);
      }
    };
    fetchAcademicTerms();
  }, []); // Run only once on component mount

  useEffect(() => {
    fetchLichSu(namHoc, hocKy);
  }, [namHoc, hocKy]); // Re-fetch data whenever namHoc or hocKy changes

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">LỊCH SỬ ĐĂNG KÝ HỌC PHẦN</p>
      </div>
      <div className="body__inner">
        <form
          className="selecy__duyethp__container"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <select
              className="form__select mr_20"
              value={namHoc}
              onChange={(e) => setNamHoc(e.target.value)}
            >
              <option value="">-- Chọn năm học --</option>
              {namHocList.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="form__select "
              value={hocKy}
              onChange={(e) => setHocKy(e.target.value)}
            >
              <option value="">-- Chọn học kỳ --</option>
              {hocKyList.map((ky) => (
                <option key={ky} value={ky}>
                  {ky}
                </option>
              ))}
            </select>
          </div>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Thao tác</th>
              <th>Mã HP</th>
              <th>Tên HP</th>
              <th>STC</th>
              <th>Thao tác bởi</th>
              <th>Vào ngày</th>
            </tr>
          </thead>
          <tbody>
            {lichSu.map((item, index) => (
              <tr
                key={item.id}
                className={
                  item.trang_thai_text === "Đã hủy" ? "row-cancelled" : ""
                }
              >
                <td>{index + 1}</td>
                <td>{item.trang_thai_text}</td>
                <td>{item.ma_mon}</td>
                <td>{item.ten_mon}</td>
                <td>{item.so_tin_chi}</td>
                <td>{item.ma_so_sinh_vien || "Sinh viên"}</td>
                <td>{new Date(item.ngay_dang_ky).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {lichSu.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center" }}>
                  Không có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LichSuDangKy;
