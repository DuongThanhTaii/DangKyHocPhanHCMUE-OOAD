import { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";

function GhiDanhHocPhan() {
  const { openNotify } = useModalContext();

  const [hocPhanList, setHocPhanList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // Đăng ký mới
  const [selectedToCancelIds, setSelectedToCancelIds] = useState([]); // Hủy đăng ký
  const [daGhiDanhList, setDaGhiDanhList] = useState([]);
  const [searchType, setSearchType] = useState("maHocPhan");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotEnrollmentPhase, setIsNotEnrollmentPhase] = useState(false);

  const totalCourses = daGhiDanhList.length;
  const totalCredits = daGhiDanhList.reduce(
    (sum, hp) => sum + (hp.so_tin_chi || 0),
    0
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [hpRes, gdRes] = await Promise.all([
        axios.get(
          "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/hoc-phan/co-the-ghi-danh",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        axios.get(
          "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/ghi-danh/my",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      setHocPhanList(hpRes.data || []);
      setFilteredList(hpRes.data || []);
      setDaGhiDanhList(gdRes.data || []);
      setIsNotEnrollmentPhase((hpRes.data || []).length === 0);
    } catch (error) {
      console.error(error);
      setIsNotEnrollmentPhase(true);
    }
  };

  const isDaGhiDanh = (hocPhanId) =>
    daGhiDanhList.some((hp) => hp.hoc_phan_id === hocPhanId);

  const handleCheck = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCancelCheck = (hocPhanId) => {
    setSelectedToCancelIds((prev) =>
      prev.includes(hocPhanId)
        ? prev.filter((i) => i !== hocPhanId)
        : [...prev, hocPhanId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0)
      return openNotify("Chưa chọn học phần", "error");
    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/ghi-danh",
        { hocPhanIds: selectedIds },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      openNotify("Ghi danh thành công.", "success");
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      openNotify("Lỗi ghi danh.", "error");
    }
  };

  const handleCancel = async () => {
    if (selectedToCancelIds.length === 0)
      return openNotify("Chưa chọn học phần để hủy.", "error");

    try {
      const token = localStorage.getItem("token");
      for (const hocPhanId of selectedToCancelIds) {
        await axios.delete(
          `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/ghi-danh/${hocPhanId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      openNotify("Hủy ghi danh thành công.", "success");
      setSelectedToCancelIds([]);
      fetchData();
    } catch (error) {
      openNotify("Lỗi khi hủy ghi danh.", "error");
      console.error(error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredList(hocPhanList);
      return;
    }
    const filtered = hocPhanList.filter((hp) => {
      if (searchType === "maHocPhan") return hp.ma_mon.includes(searchQuery);
      if (searchType === "tenHocPhan") return hp.ten_mon.includes(searchQuery);
      return true;
    });
    setFilteredList(filtered);
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">ĐĂNG KÝ GHI DANH</p>
      </div>
      <div className="body__inner">
        <p className="sub__title_gd">Năm học 2025-2026 - Học kỳ HK01</p>
        <form className="search-form search-form__gd" onSubmit={handleSearch}>
          <div className="form__group">
            <select
              id="search-type"
              className="form__select w_380"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="maHocPhan">
                1. K497480201 - Công nghệ thông tin
              </option>
              <option value="tenHocPhan">
                2. K497480202 - Sư phạm Tin học
              </option>
            </select>
            <label htmlFor="search-type" className="form__label">
              Chương trình đào tạo
            </label>
          </div>

          <button type="submit" className="form__button ">
            <svg
              className="svg__gd__refesh"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
            >
              <path
                fill="currentColor"
                d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"
              />
            </svg>
            Làm mới
          </button>
        </form>

        {isNotEnrollmentPhase ? (
          <p style={{ marginTop: "35px", color: "red", fontWeight: "bold" }}>
            CHƯA TỚI THỜI HẠN ĐĂNG KÝ GHI DANH.VUI LÒNG QUAY LẠI SAU
          </p>
        ) : (
          <>
            {/* Fieldset 1: Danh sách có thể ghi danh */}
            <fieldset className="fieldeset__dkhp mt_20">
              <legend>Đăng ký theo kế hoạch</legend>
              <table className="table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Mã HP</th>
                    <th>Tên HP</th>
                    <th>STC</th>
                    <th>Khoa</th>
                    <th>Giảng Viên</th>
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
                      }}
                      colSpan={6}
                    >
                      Bắt buộc
                    </td>
                  </tr>
                  {filteredList
                    .filter((hp) => hp.loai_mon === "chuyen_nganh")
                    .map((hp) => (
                      <tr
                        key={hp.id}
                        className={isDaGhiDanh(hp.id) ? "row__highlight" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            disabled={isDaGhiDanh(hp.id)}
                            checked={selectedIds.includes(hp.id)}
                            onChange={() => handleCheck(hp.id)}
                          />
                        </td>
                        <td>{hp.ma_mon}</td>
                        <td>{hp.ten_mon}</td>
                        <td>{hp.so_tin_chi}</td>
                        <td>{hp.ten_khoa}</td>
                        <td>{hp.ten_giang_vien}</td>
                      </tr>
                    ))}
                  <tr>
                    <td
                      style={{
                        textAlign: "left",
                        fontWeight: "700",
                        fontSize: "14px",
                        color: "#172b4b",
                      }}
                      colSpan={6}
                    >
                      Tự chọn
                    </td>
                  </tr>
                  {filteredList
                    .filter((hp) => hp.loai_mon === "tu_chon")
                    .map((hp) => (
                      <tr
                        key={hp.id}
                        className={isDaGhiDanh(hp.id) ? "row__highlight" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            disabled={isDaGhiDanh(hp.id)}
                            checked={selectedIds.includes(hp.id)}
                            onChange={() => handleCheck(hp.id)}
                          />
                        </td>
                        <td>{hp.ma_mon}</td>
                        <td>{hp.ten_mon}</td>
                        <td>{hp.so_tin_chi}</td>
                        <td>{hp.ten_khoa}</td>
                        <td>{hp.ten_giang_vien}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="note__gd">
                Ghi chú: <span className="note__highlight"></span> đã đăng ký
              </div>
              <div style={{ marginTop: "1rem" }}>
                <button className="btn__chung mb_10" onClick={handleSubmit}>
                  Xác nhận ghi danh
                </button>
              </div>
            </fieldset>

            {/* Fieldset 2: Kết quả ghi danh */}
            <fieldset className="fieldeset__dkhp mt_20">
              <legend>
                Kết quả đăng ký: {totalCourses} học phần, {totalCredits} tín chỉ
              </legend>
              <table className="table">
                <thead>
                  <tr>
                    <th>Chọn</th>
                    <th>Mã HP</th>
                    <th>Tên HP</th>
                    <th>STC</th>
                    <th>Khoa</th>
                    <th>Giảng Viên</th>
                  </tr>
                </thead>
                <tbody>
                  {daGhiDanhList.map((hp) => (
                    <tr key={hp.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedToCancelIds.includes(hp.hoc_phan_id)}
                          onChange={() => handleCancelCheck(hp.hoc_phan_id)}
                        />
                      </td>
                      <td>{hp.ma_mon}</td>
                      <td>{hp.ten_mon}</td>
                      <td>{hp.so_tin_chi}</td>
                      <td>{hp.ten_khoa}</td>
                      <td>{hp.ten_giang_vien || "Chưa phân công"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "1rem" }}>
                <button className="btn__cancel mb_10" onClick={handleCancel}>
                  Hủy ghi danh
                </button>
              </div>
            </fieldset>
          </>
        )}
      </div>
    </section>
  );
}

export default GhiDanhHocPhan;
