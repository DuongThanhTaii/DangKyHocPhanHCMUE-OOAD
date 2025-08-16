import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext"; // Bỏ dòng này nếu không sử dụng

function TaoLopHocPhan() {
  const { openNotify } = useModalContext(); // Bỏ dòng này nếu không sử dụng

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [list, setList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState({});

  const [dsHocKy, setDsHocKy] = useState([]);
  const [dsNienKhoa, setDsNienKhoa] = useState([]);

  // States chính để kích hoạt fetch data
  const [selectedHocKyId, setSelectedHocKyId] = useState("");

  // States tạm thời để lưu giá trị từ dropdown
  const [tempSelectedNienKhoa, setTempSelectedNienKhoa] = useState("");
  const [tempSelectedHocKyId, setTempSelectedHocKyId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hàm để lấy danh sách học kỳ từ API metadata
  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:3000/api/metadata/semesters",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const semesters = res.data;
      const semesterData = Array.isArray(semesters) ? semesters : [];
      setDsHocKy(semesterData);

      // Trích xuất danh sách niên khóa duy nhất
      const uniqueNienKhoa = [
        ...new Set(semesterData.map((hk) => hk.ten_nien_khoa)),
      ];
      setDsNienKhoa(uniqueNienKhoa);

      // Tự động chọn học kỳ hiện tại nếu có
      const currentSemester = semesterData.find((hk) => hk.trang_thai_hien_tai);
      if (currentSemester) {
        setSelectedHocKyId(currentSemester.hoc_ky_id);
        setTempSelectedHocKyId(currentSemester.hoc_ky_id);
        setTempSelectedNienKhoa(currentSemester.ten_nien_khoa);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách học kỳ:", err);
      setError("Lỗi khi tải danh sách học kỳ.");
    } finally {
      setLoading(false);
    }
  };

  // Hàm để tải dữ liệu danh sách học phần, có thể lọc theo học kỳ
  const fetchData = async (hocKyId) => {
    if (!hocKyId) {
      setList([]);
      setFiltered([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:3000/api/pdt/tao-lop-hoc-phan/danh-sach",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params: {
            idHocKy: hocKyId,
          },
        }
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setList(data);
      setFiltered(data);
      setError(null);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setError("Lỗi tải dữ liệu.");
      setList([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect để tải danh sách học kỳ khi component được render lần đầu
  useEffect(() => {
    fetchSemesters();
  }, []);

  // Effect để tải dữ liệu học phần khi selectedHocKyId thay đổi
  useEffect(() => {
    if (selectedHocKyId) {
      fetchData(selectedHocKyId);
    }
  }, [selectedHocKyId]);

  // Effect để filter dữ liệu khi searchQuery hoặc list thay đổi
  useEffect(() => {
    const validList = Array.isArray(list) ? list : [];
    if (searchQuery.trim() === "") {
      setFiltered(validList);
    } else {
      const lowercasedQuery = searchQuery.trim().toLowerCase();
      const result = validList.filter(
        (item) =>
          (item.ma_mon &&
            item.ma_mon.toLowerCase().includes(lowercasedQuery)) ||
          (item.ten_mon &&
            item.ten_mon.toLowerCase().includes(lowercasedQuery)) ||
          (item.so_tin_chi &&
            String(item.so_tin_chi).includes(lowercasedQuery)) ||
          (item.ten_giang_vien &&
            item.ten_giang_vien.toLowerCase().includes(lowercasedQuery))
      );
      setFiltered(result);
    }
    setCurrentPage(1);
  }, [searchQuery, list]);

  const handleChange = (id, field, value) => {
    setSelected((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleCheck = (id) => {
    setSelected((prev) => {
      const newState = { ...prev };
      if (newState[id]) {
        delete newState[id];
      } else {
        newState[id] = {
          soLuongLop: "",
          tietBatDau: "",
          tietKetThuc: "",
          soTietMoiBuoi: "",
          tongSoTiet: "",
          ngayBatDau: "",
          ngayKetThuc: "",
          ngayHoc: [],
          phongHoc: "",
        };
      }
      return newState;
    });
  };

  const handleConfirmSelection = () => {
    if (!tempSelectedHocKyId) return;
    setSelectedHocKyId(tempSelectedHocKyId);
  };

  const handleSubmit = async () => {
    const danhSachLop = Object.entries(selected).map(([hocPhanId, data]) => {
      const giangVienId =
        list.find((hp) => hp.hoc_phan_id === hocPhanId)?.giang_vien_id || null;
      return {
        hocPhanId,
        giangVienId,
        ...data,
      };
    });

    try {
      await axios.post(
        "http://localhost:3000/api/pdt/tao-lop-hoc-phan",
        { danhSachLop },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      openNotify("Tạo lớp học phần thành công!", "success");
      setSelected({});
      fetchData(selectedHocKyId);
    } catch (error) {
      console.error("Lỗi tạo lớp học phần:", error);
      openNotify("Lỗi tạo lớp học phần", "error");
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filtered.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const filteredHocKy = Array.isArray(dsHocKy)
    ? dsHocKy.filter((hk) => hk.ten_nien_khoa === tempSelectedNienKhoa)
    : [];

  const currentSemester = Array.isArray(dsHocKy)
    ? dsHocKy.find((hk) => hk.hoc_ky_id === selectedHocKyId)
    : null;
  const currentSemesterText = currentSemester
    ? ` (Niên khóa ${currentSemester.ten_nien_khoa}, Học kỳ ${currentSemester.ma_hoc_ky})`
    : "";

  if (loading) return <p>Đang tải dữ liệu...</p>;
  if (error) return <p>{error}</p>;

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">
          TẠO LỚP HỌC PHẦN {currentSemesterText}
        </p>
      </div>
      <div className="body__inner">
        <div className="selecy__duyethp__container">
          {/* Dropdown chọn Niên khóa */}
          <div className=" form__group__ctt w350">
            <select
              className="form__input form__select"
              value={tempSelectedNienKhoa}
              onChange={(e) => {
                setTempSelectedNienKhoa(e.target.value);
                setTempSelectedHocKyId("");
              }}
            >
              <option value="">-- Chọn Niên khóa --</option>
              {dsNienKhoa.map((nienKhoa) => (
                <option key={nienKhoa} value={nienKhoa}>
                  {nienKhoa}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown chọn Học kỳ */}
          <div className=" form__group__ctt w350">
            <select
              className="form__input form__select"
              value={tempSelectedHocKyId}
              onChange={(e) => setTempSelectedHocKyId(e.target.value)}
              disabled={!tempSelectedNienKhoa}
            >
              <option value="">-- Chọn Học kỳ --</option>
              {filteredHocKy.map((hk) => (
                <option key={hk.hoc_ky_id} value={hk.hoc_ky_id}>
                  Học kỳ {hk.ma_hoc_ky}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn__chung w100__h35"
            onClick={handleConfirmSelection}
            disabled={
              !tempSelectedHocKyId || tempSelectedHocKyId === selectedHocKyId
            }
          >
            Xác nhận
          </button>
        </div>

        <div className="form__group__tracuu">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên học phần, giảng viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form__input"
            style={{ width: "400px" }}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Chọn</th>
              <th>Mã HP</th>
              <th>Tên HP</th>
              <th>STC</th>
              <th>Số SV</th>
              <th>Giảng viên</th>
              <th>Số lớp</th>
              <th>Tiết BD</th>
              <th>Tiết KT</th>
              <th>Số tiết/buổi</th>
              <th>Tổng tiết</th>
              <th>Phòng học</th>
              <th>Ngày học</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(currentData) && currentData.length > 0 ? (
              currentData.map((hp, index) => (
                <tr key={hp.hoc_phan_id || index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[hp.hoc_phan_id]}
                      onChange={() => handleCheck(hp.hoc_phan_id)}
                    />
                  </td>
                  <td>{hp.ma_mon}</td>
                  <td>{hp.ten_mon}</td>
                  <td>{hp.so_tin_chi}</td>
                  <td>{hp.so_luong_sv}</td>
                  <td>{hp.ten_giang_vien || ""}</td>
                  <td>
                    <input
                      className="w__48"
                      type="number"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.soLuongLop || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "soLuongLop",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w__48"
                      type="number"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.tietBatDau || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "tietBatDau",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w__48"
                      type="number"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.tietKetThuc || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "tietKetThuc",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w__48"
                      type="number"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.soTietMoiBuoi || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "soTietMoiBuoi",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w__48"
                      type="number"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.tongSoTiet || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "tongSoTiet",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="w__48"
                      type="text"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.phongHoc || ""}
                      onChange={(e) =>
                        handleChange(hp.hoc_phan_id, "phongHoc", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    {["2", "3", "4", "5", "6", "7"].map((thu) => (
                      <label key={thu} style={{ marginRight: "4px" }}>
                        <input
                          type="checkbox"
                          disabled={!selected[hp.hoc_phan_id]}
                          checked={
                            selected[hp.hoc_phan_id]?.ngayHoc?.includes(thu) ||
                            false
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current =
                              selected[hp.hoc_phan_id]?.ngayHoc || [];
                            const updated = checked
                              ? [...current, thu]
                              : current.filter((t) => t !== thu);
                            handleChange(hp.hoc_phan_id, "ngayHoc", updated);
                          }}
                        />
                        T{thu}
                      </label>
                    ))}
                  </td>
                  <td>
                    <input
                      type="date"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.ngayBatDau || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "ngayBatDau",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      disabled={!selected[hp.hoc_phan_id]}
                      value={selected[hp.hoc_phan_id]?.ngayKetThuc || ""}
                      onChange={(e) =>
                        handleChange(
                          hp.hoc_phan_id,
                          "ngayKetThuc",
                          e.target.value
                        )
                      }
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15} style={{ textAlign: "center" }}>
                  Không có học phần nào để tạo lớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn__chung "
            onClick={handleSubmit}
            disabled={Object.keys(selected).length === 0}
          >
            Tạo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{
              margin: "0 4px",
              padding: "3px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: currentPage === i + 1 ? "#0c4874" : "#fff",
              color: currentPage === i + 1 ? "#fff" : "#000",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}

export default TaoLopHocPhan;
