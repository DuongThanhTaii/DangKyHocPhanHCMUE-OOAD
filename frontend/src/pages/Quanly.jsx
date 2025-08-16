import React, { useState, useEffect } from "react";
import axios from "axios";
import ModalThemSinhVien from "./Modalthemsinhvien";
import ModalThemGiangVien from "./Modelthemgiangvien";
import ModalThemHocPhan from "./Modalthemhocphan";
import ModalCapNhatSinhVien from "./Modalcapnhatsinhvien";
import ModalCapNhatGiangVien from "./Modalcapnhatgiangvien";
import ModalCapNhatHocPhan from "./Modalcapnhatmonhoc";

import { useModalContext } from "../hook/ModalContext";

import "../css/reset.css";
import "../css/menu.css";

function QuanLy() {
  const { openConfirm, openNotify } = useModalContext();

  const [currentView, setCurrentView] = useState("sv"); // sv | gv | hp
  const [modalType, setModalType] = useState(null);

  const [modalUpdateSVId, setModalUpdateSVId] = useState(null);
  const [modalUpdateGVId, setModalUpdateGVId] = useState(null);
  const [modalUpdateHPId, setModalUpdateHPId] = useState(null);
  const [isModalUpdateSVOpen, setIsModalUpdateSVOpen] = useState(false);
  const [isModalUpdateGVOpen, setIsModalUpdateGVOpen] = useState(false);
  const [isModalUpdateHPOpen, setIsModalUpdateHPOpen] = useState(false);

  const [dsSinhVien, setDsSinhVien] = useState([]);
  const [dsGiangVien, setDsGiangVien] = useState([]);
  const [dsHocPhan, setDsHocPhan] = useState([]);
  const [dsLopHocPhan, setDsLopHocPhan] = useState([]);

  const [search, setSearch] = useState("");

  //cap nhat lhp
  const [editingRowId, setEditingRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const token = localStorage.getItem("token");

  // State mới cho lọc Học kỳ và Niên khóa
  const [selectedHocKy, setSelectedHocKy] = useState("1");
  const [selectedNienKhoa, setSelectedNienKhoa] = useState("2025-2026");
  const [dsNienKhoa, setDsNienKhoa] = useState([]);

  // Hàm tạo danh sách niên khóa từ năm hiện tại
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      const startYear = currentYear - i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }
    setDsNienKhoa(years);
  }, []);

  // Notify modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState("success"); // success | error

  // Confirm delete modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirm, setOnConfirm] = useState(() => {});

  // Load data tùy view
  // const loadData = async () => {
  //   try {
  //     if (currentView === "sv") {
  //       const res = await axios.get(
  //         "http://localhost:3000/api/lay-ds-sinh-vien"
  //       );
  //       const data = Array.isArray(res.data) ? res.data : res.data.data;
  //       setDsSinhVien(data || []);
  //     } else if (currentView === "gv") {
  //       const res = await axios.get(
  //         "http://localhost:3000/api/lay-ds-giang-vien"
  //       );
  //       const data = Array.isArray(res.data) ? res.data : res.data.data;
  //       setDsGiangVien(data || []);
  //     } else if (currentView === "hp") {
  //       const res = await axios.get(
  //         "http://localhost:3000/api/lay-ds-hoc-phan"
  //       );
  //       const data = Array.isArray(res.data) ? res.data : res.data.data;
  //       setDsHocPhan(data || []);
  //     } else if (currentView === "lhp") {
  //       const res = await axios.get(
  //         "http://localhost:3000/api/thong-ke-lop-hoc-phan"
  //       );
  //       const data = Array.isArray(res.data) ? res.data : res.data.data;
  //       setDsLopHocPhan(data || []);
  //     }
  //   } catch (error) {
  //     setNotifyMessage("Lỗi tải dữ liệu");
  //     setNotifyType("error");
  //     setShowNotifyModal(true);
  //   }
  // };

  const loadData = async () => {
    try {
      if (currentView === "sv") {
        const res = await axios.get(
          "http://localhost:3000/api/lay-ds-sinh-vien"
        );
        const data = Array.isArray(res.data) ? res.data : res.data.data;
        setDsSinhVien(data || []);
      } else if (currentView === "gv") {
        const res = await axios.get(
          "http://localhost:3000/api/lay-ds-giang-vien"
        );
        const data = Array.isArray(res.data) ? res.data : res.data.data;
        setDsGiangVien(data || []);
      } else if (currentView === "hp") {
        const res = await axios.get(
          "http://localhost:3000/api/lay-ds-hoc-phan"
        );
        const data = Array.isArray(res.data) ? res.data : res.data.data;
        setDsHocPhan(data || []);
      } else if (currentView === "lhp") {
        // Gọi API với tham số học kỳ và niên khóa
        const res = await axios.get(
          `http://localhost:3000/api/thong-ke-lop-hoc-phan?hocKy=${selectedHocKy}&nienKhoa=${selectedNienKhoa}`
        );
        const data = Array.isArray(res.data) ? res.data : res.data.data;
        setDsLopHocPhan(data || []);
      }
    } catch (error) {
      setNotifyMessage("Lỗi tải dữ liệu");
      setNotifyType("error");
      setShowNotifyModal(true);
    }
  };

  // useEffect(() => {
  //   loadData();
  // }, [currentView]);

  useEffect(() => {
    loadData();
  }, [currentView, selectedHocKy, selectedNienKhoa]);

  const filterBySearch = (list, fields) => {
    return list.filter((item) =>
      fields.some((key) =>
        item[key]?.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  // Hàm mở modal confirm
  const confirmDelete = (message, onOk) => {
    setConfirmMessage(message);
    setOnConfirm(() => onOk);
    setShowConfirmModal(true);
  };

  // Xóa sinh viên
  const handleDeleteSinhVien = (maSoSV) => {
    confirmDelete(`Bạn có chắc muốn xóa sinh viên ${maSoSV}?`, async () => {
      setShowConfirmModal(false);
      try {
        await axios.delete(
          `http://localhost:3000/api/xoa-sinh-vien/${maSoSV}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setNotifyMessage("Xóa sinh viên thành công");
        setNotifyType("success");
        setShowNotifyModal(true);
        loadData();
      } catch (error) {
        setNotifyMessage(error.response?.data?.error || "Lỗi xóa sinh viên");
        setNotifyType("error");
        setShowNotifyModal(true);
      }
    });
  };

  // Xóa giảng viên
  const handleDeleteGiangVien = (maNhanVien) => {
    confirmDelete(
      `Bạn có chắc muốn xóa giảng viên ${maNhanVien}?`,
      async () => {
        setShowConfirmModal(false);
        try {
          await axios.delete(
            `http://localhost:3000/api/xoa-giang-vien/${maNhanVien}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setNotifyMessage("Xóa giảng viên thành công");
          setNotifyType("success");
          setShowNotifyModal(true);
          loadData();
        } catch (error) {
          setNotifyMessage(error.response?.data?.error || "Lỗi xóa giảng viên");
          setNotifyType("error");
          setShowNotifyModal(true);
        }
      }
    );
  };

  // Xóa học phần
  const handleDeleteHocPhan = (id) => {
    confirmDelete(`Bạn có chắc muốn xóa học phần này?`, async () => {
      setShowConfirmModal(false);
      try {
        await axios.delete(`http://localhost:3000/api/xoa-mon-hoc/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setNotifyMessage("Xóa học phần thành công");
        setNotifyType("success");
        setShowNotifyModal(true);
        loadData();
      } catch (error) {
        setNotifyMessage(error.response?.data?.error || "Lỗi xóa học phần");
        setNotifyType("error");
        setShowNotifyModal(true);
      }
    });
  };

  // Xóa lớp học phần
  const handleDeleteLopHocPhan = (id) => {
    confirmDelete("Bạn có chắc muốn xóa lớp học phần này?", async () => {
      setShowConfirmModal(false);
      try {
        await axios.delete(`http://localhost:3000/api/xoa-lop-hoc-phan/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setNotifyMessage("Xóa lớp học phần thành công");
        setNotifyType("success");
        setShowNotifyModal(true);
        loadData();
      } catch (error) {
        setNotifyMessage(
          error.response?.data?.message || "Lỗi xóa lớp học phần"
        );
        setNotifyType("error");
        setShowNotifyModal(true);
      }
    });
  };

  // Modal Notify
  const NotifyModal = ({ message, type, onClose }) => {
    return (
      <>
        <div className="modal-overlay" onClick={onClose}></div>
        <div className={`notify-modal ${type}`}>
          <p>{message}</p>
          <button onClick={onClose} className="btn-close-notify">
            Đóng
          </button>
        </div>
      </>
    );
  };

  // Modal Confirm
  const ConfirmModal = ({ message, onCancel, onOk }) => {
    return (
      <>
        <div className="modal-overlay" onClick={onCancel}></div>
        <div className="confirm-modal">
          <p>{message}</p>
          <div>
            <button className="btn-cancel" onClick={onCancel}>
              Hủy
            </button>
            <button className="btn-ok" onClick={onOk}>
              Đồng ý
            </button>
          </div>
        </div>
      </>
    );
  };

  const formatDateToInput = (dateString) => {
    if (!dateString) return "";
    return dateString.slice(0, 10); // lấy phần yyyy-MM-dd
  };

  const handleEditClick = (lhp) => {
    setEditingRowId(lhp.id);
    setEditData({
      ...lhp,
      ngay_hoc: Array.isArray(lhp.ngay_hoc)
        ? lhp.ngay_hoc.join(", ")
        : lhp.ngay_hoc || "",
      ngay_bat_dau: formatDateToInput(lhp.ngay_bat_dau),
      ngay_ket_thuc: formatDateToInput(lhp.ngay_ket_thuc),
    });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirmEdit = () => {
    openConfirm("Bạn có chắc muốn cập nhật lớp học phần?", async () => {
      try {
        const dataToSend = {};

        if (editData.hoc_phan_id !== undefined)
          dataToSend.hocPhanId = editData.hoc_phan_id;
        if (editData.giang_vien_id !== undefined)
          dataToSend.giangVienId = editData.giang_vien_id;
        if (editData.tiet_bat_dau !== undefined)
          dataToSend.tietBatDau = editData.tiet_bat_dau;
        if (editData.tiet_ket_thuc !== undefined)
          dataToSend.tietKetThuc = editData.tiet_ket_thuc;
        if (editData.so_tiet_moi_buoi !== undefined)
          dataToSend.soTietMoiBuoi = editData.so_tiet_moi_buoi;
        if (editData.tong_so_tiet !== undefined)
          dataToSend.tongSoTiet = editData.tong_so_tiet;
        if (editData.ngay_bat_dau !== undefined)
          dataToSend.ngayBatDau = editData.ngay_bat_dau;
        if (editData.ngay_ket_thuc !== undefined)
          dataToSend.ngayKetThuc = editData.ngay_ket_thuc;
        if (editData.ngay_hoc !== undefined)
          dataToSend.ngayHoc = editData.ngay_hoc
            .split(",")
            .map((s) => s.trim());
        if (editData.phong_hoc !== undefined)
          dataToSend.phongHoc = editData.phong_hoc;

        console.log("Dữ liệu gửi đi:", dataToSend);

        const res = await fetch(
          `http://localhost:3000/api/pdt/cap-nhat-lop-hoc-phan/${editingRowId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(dataToSend),
          }
        );

        if (!res.ok) throw new Error("Cập nhật thất bại");

        await loadData();
        setEditingRowId(null);
        setEditData({});

        openNotify("Cập nhật lớp học phần thành công", "success");
      } catch (err) {
        console.error(err);
        openNotify("Lỗi khi cập nhật lớp học phần", "error");
      }
    });
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">QUẢN LÝ</p>
      </div>
      <div className="body__inner">
        <div className="df">
          <button
            className={`btn__quanlysv ${currentView === "sv" ? "active" : ""}`}
            onClick={() => setCurrentView("sv")}
          >
            Quản lý sinh viên
          </button>
          <button
            className={`btn__quanlygv ${currentView === "gv" ? "active" : ""}`}
            onClick={() => setCurrentView("gv")}
          >
            Quản lý giảng viên
          </button>
          <button
            className={`btn__quanlyhp ${currentView === "hp" ? "active" : ""}`}
            onClick={() => setCurrentView("hp")}
          >
            Quản lý học phần
          </button>
          <button
            className={`btn__quanlylhp ${
              currentView === "lhp" ? "active" : ""
            }`}
            onClick={() => setCurrentView("lhp")}
          >
            Quản lý lớp học phần
          </button>
          <button className="btn__refesh" onClick={() => loadData()}>
            <svg
              className="svg__gd__refesh mr_0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
            >
              <path
                fill="currentColor"
                d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"
              />
            </svg>
          </button>
        </div>

        {/* Sinh viên */}
        {currentView === "sv" && (
          <fieldset className="fieldset__quanly">
            <legend>Tổng: {dsSinhVien.length} sinh viên</legend>
            <button className="btn__add" onClick={() => setModalType("sv")}>
              +
            </button>
            <button className="btn__sort">-</button>

            <div className="form__group form__group__quanly">
              <input
                type="text"
                className="form__input"
                placeholder="Tìm kiếm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table className="table table_quanly">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>MSSV</th>
                  <th>Lớp</th>
                  <th>Khoa</th>
                  <th>Ngành</th>
                  <th>Niên khóa</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(dsSinhVien, [
                  "ho_ten",
                  "ma_so_sinh_vien",
                  "lop",
                  "ten_khoa",
                  "ten_nganh",
                  "khoa_hoc",
                ]).map((sv, index) => (
                  <tr key={index}>
                    <td>{sv.ho_ten}</td>
                    <td>{sv.ma_so_sinh_vien}</td>
                    <td>{sv.lop}</td>
                    <td>{sv.ten_khoa}</td>
                    <td>{sv.ten_nganh}</td>
                    <td>{sv.khoa_hoc}</td>
                    <td className="w40">
                      <div className="btn__quanly__container">
                        <button
                          className="btn__cancel w50__h20"
                          onClick={() =>
                            handleDeleteSinhVien(sv.ma_so_sinh_vien)
                          }
                        >
                          Xóa
                        </button>
                        <button
                          className="btn__update  w20__h20"
                          onClick={() => {
                            setModalUpdateSVId(sv.id);
                            setIsModalUpdateSVOpen(true);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                          >
                            <path
                              fill="currentColor"
                              d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        )}

        {/* Giảng viên */}
        {currentView === "gv" && (
          <fieldset className="fieldset__quanly">
            <legend>Tổng: {dsGiangVien.length} giảng viên</legend>
            <button className="btn__add" onClick={() => setModalType("gv")}>
              +
            </button>
            <button className="btn__sort">-</button>

            <div className="form__group form__group__quanly">
              <input
                type="text"
                className="form__input"
                placeholder="Tìm kiếm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table className="table table_quanly">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>MGV</th>
                  <th>Khoa</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(dsGiangVien, [
                  "ho_ten",
                  "ma_nhan_vien",
                  "ten_khoa",
                ]).map((gv, index) => (
                  <tr key={index}>
                    <td>{gv.ho_ten}</td>
                    <td>{gv.ma_nhan_vien}</td>
                    <td>{gv.ten_khoa}</td>
                    <td className="w40">
                      <div className="btn__quanly__container">
                        <button
                          className="btn__cancel w50__h20"
                          onClick={() => handleDeleteGiangVien(gv.ma_nhan_vien)}
                        >
                          Xóa
                        </button>
                        <button
                          className="btn__update  w20__h20"
                          onClick={() => {
                            console.log("ID gửi xuống modal:", gv.id);
                            setModalUpdateGVId(gv.id);
                            setIsModalUpdateGVOpen(true);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                          >
                            <path
                              fill="currentColor"
                              d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        )}

        {/* Học phần */}
        {currentView === "hp" && (
          <fieldset className="fieldset__quanly">
            <legend>Tổng: {dsHocPhan.length} học phần</legend>
            <button className="btn__add" onClick={() => setModalType("hp")}>
              +
            </button>
            <button className="btn__sort">-</button>

            <div className="form__group form__group__quanly">
              <input
                type="text"
                className="form__input"
                placeholder="Tìm kiếm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table className="table table_quanly">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã HP</th>
                  <th>Tên HP</th>
                  <th>STC</th>
                  <th>Khoa</th>
                  <th>Loại</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filterBySearch(dsHocPhan, [
                  "ma_mon",
                  "ten_mon",
                  "ten_khoa",
                  "loai_mon",
                ]).map((hp, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{hp.ma_mon}</td>
                    <td>{hp.ten_mon}</td>
                    <td>{hp.so_tin_chi}</td>
                    <td>{hp.ten_khoa}</td>
                    <td>
                      {hp.loai_mon === "chuyen_nganh" ? "Bắt buộc" : "Tự chọn"}
                    </td>
                    <td className="w40">
                      <div className="btn__quanly__container">
                        <button
                          className="btn__cancel w50__h20"
                          onClick={() => handleDeleteHocPhan(hp.id)}
                        >
                          Xóa
                        </button>
                        <button
                          className="btn__update  w20__h20"
                          onClick={() => {
                            setModalUpdateHPId(hp.id);
                            setIsModalUpdateHPOpen(true);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                          >
                            <path
                              fill="currentColor"
                              d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        )}
        {/* Lớp học phần */}
        {currentView === "lhp" && (
          <div>
            <div className="filter-group selecy__duyethp__container mt_20">
              <div className="">
                <select
                  className="form__input form__select mr_20"
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
              <div className="">
                <select
                  className="form__input form__select"
                  value={selectedHocKy}
                  onChange={(e) => setSelectedHocKy(e.target.value)}
                >
                  <option value="1">Học kỳ 1</option>
                  <option value="2">Học kỳ 2</option>
                  <option value="3">Học kỳ hè</option>
                </select>
              </div>
            </div>
            <fieldset className="fieldset__quanly">
              <legend>Tổng: {dsLopHocPhan.length} lớp học phần</legend>

              <button className="btn__add" onClick={() => setModalType("lhp")}>
                +
              </button>
              <button className="btn__sort">-</button>

              <div className="form__group form__group__quanly">
                <input
                  type="text"
                  className="form__input"
                  placeholder="Tìm kiếm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <table className="table table_quanly">
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
                  {filterBySearch(dsLopHocPhan, [
                    "ma_lop",
                    "ten_hoc_phan",
                    "ten_giang_vien",
                    "phong_hoc",
                    "dia_diem",
                  ]).map((lhp, index) => (
                    <tr key={lhp.id}>
                      <td>{index + 1}</td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.ma_lop || ""}
                            onChange={(e) =>
                              handleChange("ma_lop", e.target.value)
                            }
                          />
                        ) : (
                          lhp.ma_lop
                        )}
                      </td>
                      <td>{lhp.ten_hoc_phan}</td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.ten_giang_vien || ""}
                            onChange={(e) =>
                              handleChange("ten_giang_vien", e.target.value)
                            }
                          />
                        ) : (
                          lhp.ten_giang_vien || "Chưa phân công"
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            type="number"
                            value={editData.so_luong_toi_da || ""}
                            onChange={(e) =>
                              handleChange(
                                "so_luong_toi_da",
                                Number(e.target.value)
                              )
                            }
                          />
                        ) : (
                          lhp.so_luong_toi_da
                        )}
                      </td>
                      <td>{lhp.so_luong_hien_tai}</td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.phong_hoc || ""}
                            onChange={(e) =>
                              handleChange("phong_hoc", e.target.value)
                            }
                          />
                        ) : (
                          lhp.phong_hoc
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.ngay_hoc || ""}
                            onChange={(e) =>
                              handleChange("ngay_hoc", e.target.value)
                            }
                          />
                        ) : Array.isArray(lhp.ngay_hoc) ? (
                          lhp.ngay_hoc.join(", ")
                        ) : (
                          lhp.ngay_hoc
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.gio_hoc || ""}
                            onChange={(e) =>
                              handleChange("gio_hoc", e.target.value)
                            }
                          />
                        ) : (
                          lhp.gio_hoc
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            type="date"
                            value={editData.ngay_bat_dau || ""}
                            onChange={(e) =>
                              handleChange("ngay_bat_dau", e.target.value)
                            }
                          />
                        ) : (
                          lhp.ngay_bat_dau
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            type="date"
                            value={editData.ngay_ket_thuc || ""}
                            onChange={(e) =>
                              handleChange("ngay_ket_thuc", e.target.value)
                            }
                          />
                        ) : (
                          lhp.ngay_ket_thuc
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            type="number"
                            value={editData.tong_so_tiet || ""}
                            onChange={(e) =>
                              handleChange(
                                "tong_so_tiet",
                                Number(e.target.value)
                              )
                            }
                          />
                        ) : (
                          lhp.tong_so_tiet
                        )}
                      </td>
                      <td>
                        {editingRowId === lhp.id ? (
                          <input
                            value={editData.dia_diem || "ADV"}
                            onChange={(e) =>
                              handleChange("dia_diem", e.target.value)
                            }
                          />
                        ) : (
                          lhp.dia_diem
                        )}
                      </td>
                      <td className="w40">
                        <div className="btn__quanly__container">
                          {editingRowId === lhp.id ? (
                            <>
                              <button
                                type="button"
                                className="btn__chung"
                                onClick={handleConfirmEdit}
                              >
                                Xác nhận
                              </button>
                              <button
                                className="btn__update"
                                onClick={handleCancelEdit}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn__cancel w50__h20"
                                onClick={() => handleDeleteLopHocPhan(lhp.id)}
                              >
                                Xóa
                              </button>
                              <button
                                className="btn__update w20__h20"
                                onClick={() => handleEditClick(lhp)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 640 640"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          </div>
        )}
      </div>

      {modalType === "sv" && (
        <ModalThemSinhVien onClose={() => setModalType(null)} />
      )}
      {modalType === "gv" && (
        <ModalThemGiangVien onClose={() => setModalType(null)} />
      )}
      {modalType === "hp" && (
        <ModalThemHocPhan onClose={() => setModalType(null)} />
      )}

      {showNotifyModal && (
        <NotifyModal
          message={notifyMessage}
          type={notifyType}
          onClose={() => setShowNotifyModal(false)}
        />
      )}

      {showConfirmModal && (
        <ConfirmModal
          message={confirmMessage}
          onCancel={() => setShowConfirmModal(false)}
          onOk={onConfirm}
        />
      )}

      {isModalUpdateSVOpen && (
        <ModalCapNhatSinhVien
          id={modalUpdateSVId}
          isOpen={isModalUpdateSVOpen}
          onClose={() => {
            setIsModalUpdateSVOpen(false);
            setModalUpdateSVId(null);
            loadData(); // tải lại dữ liệu sau khi đóng modal (có thể cập nhật)
          }}
        />
      )}
      {isModalUpdateGVOpen && (
        <ModalCapNhatGiangVien
          giangVienId={modalUpdateGVId}
          isOpen={isModalUpdateGVOpen}
          onClose={() => {
            setIsModalUpdateGVOpen(false);
            setModalUpdateGVId(null);
            loadData(); // tải lại dữ liệu sau khi đóng modal (có thể cập nhật)
          }}
        />
      )}
      {isModalUpdateHPOpen && (
        <ModalCapNhatHocPhan
          monHocId={modalUpdateHPId}
          isOpen={isModalUpdateHPOpen}
          onClose={() => {
            setIsModalUpdateHPOpen(false);
            setModalUpdateHPId(null);
            loadData(); // tải lại dữ liệu sau khi đóng modal (có thể cập nhật)
          }}
        />
      )}
    </section>
  );
}

export default QuanLy;
