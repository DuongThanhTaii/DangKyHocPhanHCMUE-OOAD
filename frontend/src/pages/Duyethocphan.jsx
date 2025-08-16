import { useEffect, useState } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";
import Fuse from "fuse.js";

function DuyetHocPhan() {
  const { openNotify } = useModalContext();

  const [dsDeXuat, setDsDeXuat] = useState([]);
  const [dsHocKy, setDsHocKy] = useState([]);
  const [dsNienKhoa, setDsNienKhoa] = useState([]);

  const [userRole, setUserRole] = useState("");

  // State lưu trữ id học kỳ đã được xác nhận để lấy dữ liệu
  const [selectedHocKyId, setSelectedHocKyId] = useState("");

  // State tạm thời để lưu giá trị từ dropdown trước khi xác nhận
  const [tempSelectedNienKhoa, setTempSelectedNienKhoa] = useState("");
  const [tempSelectedHocKyId, setTempSelectedHocKyId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // FIX: Khởi tạo filteredDsDeXuat với mảng rỗng để tránh undefined
  const [filteredDsDeXuat, setFilteredDsDeXuat] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Hàm để tải dữ liệu đề xuất, có thể lọc theo học kỳ
  const fetchData = async (hocKyId) => {
    if (!hocKyId) {
      setDsDeXuat([]);
      setFilteredDsDeXuat([]); // FIX: Reset filteredDsDeXuat cùng lúc
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/de-xuat-hoc-phan?idHocKy=${hocKyId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error(`Lỗi: ${res.status} - ${res.statusText}`);
      }
      const data = await res.json();

      // FIX: API trả về trực tiếp là mảng, không phải object có property de_xuat
      const deXuatData = Array.isArray(data) ? data : [];
      setDsDeXuat(deXuatData);
      setFilteredDsDeXuat(deXuatData); // FIX: Set filteredDsDeXuat ngay khi có dữ liệu mới

      setError(null);
      setError(null);
    } catch (err) {
      console.error("Lỗi tải dữ liệu đề xuất:", err);
      setError("Lỗi tải dữ liệu đề xuất.");
      setDsDeXuat([]);
      setFilteredDsDeXuat([]); // FIX: Reset khi có lỗi
      openNotify("Lỗi tải dữ liệu đề xuất.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/metadata/semesters",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error(`Lỗi: ${res.status} - ${res.statusText}`);
      }
      const semesters = await res.json();

      // FIX: Đảm bảo semesters là mảng
      const semesterData = Array.isArray(semesters) ? semesters : [];
      setDsHocKy(semesterData);

      const uniqueNienKhoa = [
        ...new Set(semesterData.map((hk) => hk.ten_nien_khoa)),
      ];
      setDsNienKhoa(uniqueNienKhoa);

      const currentSemester = semesterData.find((hk) => hk.trang_thai_hien_tai);
      if (currentSemester) {
        setSelectedHocKyId(currentSemester.hoc_ky_id);
        setTempSelectedHocKyId(currentSemester.hoc_ky_id);
        setTempSelectedNienKhoa(currentSemester.ten_nien_khoa);
        // Lấy dữ liệu ngay lần đầu tiên
        fetchData(currentSemester.hoc_ky_id);
      }
      setError(null);
    } catch (err) {
      console.error("Lỗi khi tải danh sách học kỳ:", err);
      setError(
        `Lỗi khi tải danh sách học kỳ. Vui lòng kiểm tra quyền truy cập.`
      );
      openNotify("Lỗi khi tải danh sách học kỳ.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình Fuse.js - FIX: Đảm bảo dsDeXuat là mảng
  const fuseOptions = {
    keys: ["ma_mon", "ten_mon", "ten_giang_vien"],
    threshold: 0.3,
  };
  const fuse = new Fuse(Array.isArray(dsDeXuat) ? dsDeXuat : [], fuseOptions);

  // Effect để tải danh sách học kỳ khi component được render lần đầu
  // useEffect(() => {
  //   fetchSemesters();
  // }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.loai_tai_khoan); // Lấy role từ đây
    }
    fetchSemesters();
  }, []);

  // FIX: Effect để filter dữ liệu khi searchQuery hoặc dsDeXuat thay đổi
  useEffect(() => {
    // Đảm bảo dsDeXuat là mảng trước khi filter
    const validDsDeXuat = Array.isArray(dsDeXuat) ? dsDeXuat : [];

    if (searchQuery.trim() === "") {
      setFilteredDsDeXuat(validDsDeXuat);
    } else {
      const filtered = validDsDeXuat.filter(
        (dx) =>
          dx.ma_mon?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dx.ten_mon?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dx.ten_giang_vien &&
            dx.ten_giang_vien.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDsDeXuat(filtered);
    }
  }, [searchQuery, dsDeXuat]);

  // Hàm xử lý khi người dùng click nút xác nhận
  const handleConfirmSelection = () => {
    console.log("Xác nhận học kỳ:", tempSelectedHocKyId);
    if (!tempSelectedHocKyId) return;
    setSelectedHocKyId(tempSelectedHocKyId);
    fetchData(tempSelectedHocKyId);
  };

  const handleAction = async (id, hanhDong) => {
    try {
      console.log("Sending request:", {
        id,
        hanhDong,
        action: hanhDong === "duyet" ? "approve" : "reject",
      });

      const res = await fetch(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/de-xuat-hoc-phan/${id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            action: hanhDong === "duyet" ? "approve" : "reject",
          }),
        }
      );

      if (!res.ok) {
        // Log chi tiết lỗi từ server
        const errorText = await res.text();
        console.error("Server error:", res.status, res.statusText, errorText);
        throw new Error(`Thao tác thất bại: ${res.status} - ${errorText}`);
      }

      const result = await res.json();
      console.log("Success response:", result);

      openNotify("Thao tác thành công!", "success");
      fetchData(selectedHocKyId);
    } catch (err) {
      console.error("Handle action error:", err);
      openNotify(`Thao tác thất bại.`, "error");
    }
  };

  const handleBulkAction = async (hanhDong) => {
    // FIX: Đảm bảo filteredDsDeXuat là mảng trước khi map
    const validFilteredData = Array.isArray(filteredDsDeXuat)
      ? filteredDsDeXuat
      : [];
    const ids = validFilteredData.map((dx) => dx.id);

    if (ids.length === 0) {
      openNotify("Không có dữ liệu để thao tác", "warning");
      return;
    }

    console.log("Bulk action:", { ids, hanhDong });

    try {
      const res = await fetch(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/de-xuat-hoc-phan/bulk-update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            ids,
            action: hanhDong === "duyet" ? "approve" : "reject", // Thay đổi từ hanhDong thành action
          }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(
          "Bulk update error:",
          res.status,
          res.statusText,
          errorText
        );
        throw new Error(
          `Không thể cập nhật hàng loạt: ${res.status} - ${errorText}`
        );
      }

      const result = await res.json();
      console.log("Bulk success response:", result);

      openNotify("Cập nhật hàng loạt thành công!", "success");
      fetchData(selectedHocKyId);
    } catch (err) {
      console.error("Bulk action error:", err);
      openNotify(`Không thể cập nhật hàng loạt.`, "error");
    }
  };

  const hienThiTrangThai = (trangThai) => {
    switch (trangThai) {
      case "cho_duyet":
        return "Chờ trưởng khoa duyệt";
      case "truong_khoa_duyet":
        return "Chờ PĐT duyệt";
      case "pdt_duyet":
        return "PĐT đã duyệt";
      case "tu_choi":
        return "Đã từ chối";
      default:
        return trangThai;
    }
  };

  const disableButton = (trangThai) => {
    // Không có vai trò nên tất cả button đều enable
    return false;
  };

  // FIX: Đảm bảo dsHocKy là mảng trước khi filter
  const filteredHocKy = Array.isArray(dsHocKy)
    ? dsHocKy.filter((hk) => hk.ten_nien_khoa === tempSelectedNienKhoa)
    : [];

  // Tìm học kỳ hiện tại để hiển thị thông tin trên UI
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
          DUYỆT DANH SÁCH HỌC PHẦN {currentSemesterText}
        </p>
      </div>
      <div className="body__inner">
        {/* Form tìm kiếm */}
        <div className="selecy__duyethp__container">
          <div className="form__group__ctt w350">
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

          <div className="form__group__ctt w350">
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

        {/* FIX: Thêm search input nếu cần */}
        <div className="form__group__tracuu" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã môn, tên môn, hoặc giảng viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form__input "
            style={{ width: "400px" }}
          />
        </div>

        <table className="table table__duyethp">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã HP</th>
              <th>Tên HP</th>
              <th>STC</th>
              <th>Giảng viên</th>
              <th>Trạng thái</th>
              {userRole !== "tro_ly_khoa" && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {/* FIX: Đảm bảo filteredDsDeXuat là mảng và có length */}
            {Array.isArray(filteredDsDeXuat) && filteredDsDeXuat.length > 0 ? (
              filteredDsDeXuat.map((dx, index) => (
                <tr key={dx.id}>
                  <td>{index + 1}</td>
                  <td>{dx.ma_mon || "-"}</td>
                  <td>{dx.ten_mon || "-"}</td>
                  <td>{dx.so_tin_chi || "-"}</td>
                  <td>{dx.ten_giang_vien || "-"}</td>
                  <td>{hienThiTrangThai(dx.trang_thai)}</td>
                  {userRole !== "tro_ly_khoa" && (
                    <td>
                      <button
                        className="btn__chung w50__h20 mr_10"
                        onClick={() => handleAction(dx.id, "duyet")}
                        disabled={disableButton(dx.trang_thai)}
                      >
                        Duyệt
                      </button>
                      <button
                        className="btn__cancel w50__h20"
                        onClick={() => handleAction(dx.id, "tu_choi")}
                        disabled={disableButton(dx.trang_thai)}
                      >
                        Từ chối
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>
                  Không có đề xuất nào cần duyệt.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {userRole !== "tro_ly_khoa" && (
          <div style={{ marginTop: "1rem" }}>
            <button
              className="btn__chung mr_20"
              onClick={() => handleBulkAction("duyet")}
              disabled={
                !Array.isArray(filteredDsDeXuat) ||
                filteredDsDeXuat.length === 0
              }
            >
              Duyệt tất cả
            </button>
            <button
              className="btn__cancel"
              onClick={() => handleBulkAction("tu_choi")}
              disabled={
                !Array.isArray(filteredDsDeXuat) ||
                filteredDsDeXuat.length === 0
              }
            >
              Từ chối tất cả
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default DuyetHocPhan;
