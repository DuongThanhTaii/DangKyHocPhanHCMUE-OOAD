import { useEffect, useState, useMemo } from "react";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";
import Fuse from "fuse.js";

function DeXuatHocPhanPage() {
  const { openNotify } = useModalContext();

  const [monHocs, setMonHocs] = useState([]);
  const [filteredMonHocs, setFilteredMonHocs] = useState([]); // State mới cho danh sách đã lọc
  const [searchValue, setSearchValue] = useState("");
  const [selectedMonHocs, setSelectedMonHocs] = useState([]);
  const [giangViens, setGiangViens] = useState({});
  const [hocKy] = useState("1"); // default
  const [namHoc] = useState("2025-2026"); // default

  // Cấu hình Fuse.js
  const fuseOptions = {
    keys: ["ma_mon", "ten_mon"],
    threshold: 0.3,
  };

  const fuse = useMemo(() => new Fuse(monHocs, fuseOptions), [monHocs]);

  // Hàm lấy danh sách môn học từ API
  const fetchMonHocs = async () => {
    try {
      const res = await fetch(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/mon-hoc",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await res.json();
      if (res.ok && Array.isArray(result.data)) {
        setMonHocs(result.data);
        setFilteredMonHocs(result.data); // Hiển thị toàn bộ danh sách ban đầu
      } else {
        console.error("Lỗi khi fetch mon hoc:", result);
        setMonHocs([]);
        openNotify("Lỗi tải dữ liệu môn học.", "error");
      }
    } catch (error) {
      console.error("Lỗi mạng:", error);
      openNotify("Không thể kết nối đến server.", "error");
    }
  };

  useEffect(() => {
    fetchMonHocs();
  }, []);

  // Hàm xử lý tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault(); // Ngăn chặn form submit và reload trang
    console.log("SEARCH TRIGGERED, NO RELOAD");

    if (!searchValue.trim()) {
      setFilteredMonHocs(monHocs); // Nếu không có từ khóa, hiển thị toàn bộ
    } else {
      const result = fuse.search(searchValue).map((r) => r.item);
      setFilteredMonHocs(result); // Hiển thị kết quả tìm kiếm
    }
  };

  const handleCheck = async (monHocId) => {
    // Nếu đã chọn thì bỏ chọn
    if (selectedMonHocs.find((m) => m.monHocId === monHocId)) {
      setSelectedMonHocs((prev) => prev.filter((m) => m.monHocId !== monHocId));
      return;
    }

    // Nếu chưa có giảng viên của môn này thì fetch
    if (!giangViens[monHocId]) {
      const res = await fetch(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/giang-vien/mon-hoc/${monHocId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setGiangViens((prev) => ({ ...prev, [monHocId]: data }));
    }

    // Thêm vào danh sách đã chọn với mặc định 1 lớp, chưa chọn giảng viên
    setSelectedMonHocs((prev) => [
      ...prev,
      { monHocId, soLuongLop: 1, giangVienId: "" },
    ]);
  };

  const handleGiangVienChange = (monHocId, giangVienId) => {
    setSelectedMonHocs((prev) =>
      prev.map((m) => (m.monHocId === monHocId ? { ...m, giangVienId } : m))
    );
  };

  const handleXacNhan = async () => {
    const danhSachDeXuat = selectedMonHocs.map((deXuat) => ({
      mon_hoc_id: deXuat.monHocId,
      so_luong_lop: 1,
      giang_vien_id: deXuat.giangVienId || null,
    }));

    if (danhSachDeXuat.length === 0) {
      openNotify("Vui lòng chọn ít nhất một môn học để đề xuất.", "error");
      return;
    }

    try {
      const res = await fetch(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/de-xuat-hoc-phan/multi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ danhSachDeXuat }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        openNotify("Đề xuất thành công!", "success");
        setSelectedMonHocs([]);
        fetchMonHocs();
      } else {
        openNotify(data.error || "Có lỗi xảy ra", "error");
      }
    } catch (error) {
      console.error("Lỗi mạng:", error);
      openNotify("Không thể gửi yêu cầu đến server.", "error");
    }
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">LÊN DANH SÁCH HỌC PHẦN</p>
      </div>
      <div className="body__inner">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="form__group form__group__ctt">
            {/* Giữ lại select nếu cần, hoặc xóa nếu không sử dụng */}
            <input
              type="text"
              id="search-input"
              className="form__input"
              placeholder=" "
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <label
              htmlFor="search-input"
              className="form__floating-label top__21"
            >
              Nhập thông tin môn học
            </label>
          </div>
          <button type="submit" className="form__button">
            <span className="navbar__link-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="21"
                viewBox="0 0 20 21"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8 4.45999C6.93913 4.45999 5.92172 4.88142 5.17157 5.63157C4.42143 6.38171 4 7.39913 4 8.45999C4 9.52086 4.42143 10.5383 5.17157 11.2884C5.92172 12.0386 6.93913 12.46 8 12.46C9.06087 12.46 10.0783 12.0386 10.8284 11.2884C11.5786 10.5383 12 9.52086 12 8.45999C12 7.39913 11.5786 6.38171 10.8284 5.63157C10.0783 4.88142 9.06087 4.45999 8 4.45999ZM2 8.45999C1.99988 7.5157 2.22264 6.58471 2.65017 5.74274C3.0777 4.90077 3.69792 4.17159 4.4604 3.61452C5.22287 3.05745 6.10606 2.68821 7.03815 2.53683C7.97023 2.38545 8.92488 2.45621 9.82446 2.74335C10.724 3.03048 11.5432 3.5259 12.2152 4.18929C12.8872 4.85268 13.3931 5.66533 13.6919 6.56113C13.9906 7.45693 14.0737 8.41059 13.9343 9.34455C13.795 10.2785 13.4372 11.1664 12.89 11.936L17.707 16.753C17.8892 16.9416 17.99 17.1942 17.9877 17.4564C17.9854 17.7186 17.8802 17.9694 17.6948 18.1548C17.5094 18.3402 17.2586 18.4454 16.9964 18.4477C16.7342 18.4499 16.4816 18.3492 16.293 18.167L11.477 13.351C10.5794 13.9893 9.52335 14.3682 8.42468 14.4461C7.326 14.5241 6.22707 14.2981 5.2483 13.793C4.26953 13.2878 3.44869 12.523 2.87572 11.5823C2.30276 10.6417 1.99979 9.56143 2 8.45999Z"
                  fill="currentColor"
                />
              </svg>
            </span>{" "}
            Tìm kiếm
          </button>
        </form>

        <table className="table table_ldshp">
          <thead>
            <tr>
              <th>Chọn</th>
              <th>Mã MH</th>
              <th>Tên MH</th>
              <th>STC</th>
              <th>Giảng viên</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonHocs.map((mh) => (
              <tr key={mh.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedMonHocs.some((m) => m.monHocId === mh.id)}
                    onChange={() => handleCheck(mh.id)}
                  />
                </td>
                <td>{mh.ma_mon}</td>
                <td>{mh.ten_mon}</td>
                <td>{mh.so_tin_chi}</td>
                <td>
                  {selectedMonHocs.find((m) => m.monHocId === mh.id) && (
                    <select
                      value={
                        selectedMonHocs.find((m) => m.monHocId === mh.id)
                          .giangVienId
                      }
                      onChange={(e) =>
                        handleGiangVienChange(mh.id, e.target.value)
                      }
                    >
                      <option value="">-- Chọn --</option>
                      {giangViens[mh.id]?.map((gv) => (
                        <option key={gv.id} value={gv.id}>
                          {gv.ho_ten}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {filteredMonHocs.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  Không tìm thấy môn học nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {selectedMonHocs.length > 0 && (
          <button
            className="btn__chung"
            onClick={handleXacNhan}
            style={{ marginTop: "1rem", padding: "8px 16px" }}
          >
            Xác nhận đề xuất
          </button>
        )}
      </div>
    </section>
  );
}

export default DeXuatHocPhanPage;
