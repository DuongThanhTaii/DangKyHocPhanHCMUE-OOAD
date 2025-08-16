import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalCapNhatSinhVien = ({ id, isOpen, onClose }) => {
  const { openNotify } = useModalContext();

  const [formData, setFormData] = useState({
    ma_so_sinh_vien: "",
    ho_ten: "",
    ten_dang_nhap: "",
    mat_khau: "",
    lop: "",
    khoa_id: "",
    nganh_id: "",
    khoa_hoc: "",
    ngay_nhap_hoc: "",
  });

  const [danhSachKhoa, setDanhSachKhoa] = useState([]);
  const [danhSachNganh, setDanhSachNganh] = useState([]);

  // Lấy danh sách khoa
  useEffect(() => {
    axios
      .get("https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setDanhSachKhoa(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Lỗi tải danh sách khoa:", err));
  }, []);

  // Khi chọn khoa → load ngành
  useEffect(() => {
    if (!formData.khoa_id) return;
    axios
      .get(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa/${formData.khoa_id}/nganh`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then((res) => setDanhSachNganh(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDanhSachNganh([]));
  }, [formData.khoa_id]);

  // Lấy thông tin sinh viên hiện tại
  useEffect(() => {
    if (!id || !isOpen) return;

    const fetchData = async () => {
      try {
        const resKhoa = await axios.get(
          "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setDanhSachKhoa(Array.isArray(resKhoa.data) ? resKhoa.data : []);

        const resSV = await axios.get(
          `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/show-update-sinh-vien/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const sv = resSV.data;

        if (sv.khoa_id) {
          const resNganh = await axios.get(
            `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa/${sv.khoa_id}/nganh`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setDanhSachNganh(Array.isArray(resNganh.data) ? resNganh.data : []);
        }

        setFormData({
          ma_so_sinh_vien: sv.ma_so_sinh_vien || "",
          ho_ten: sv.ho_ten || "",
          ten_dang_nhap: sv.ten_dang_nhap || "",
          mat_khau: "",
          lop: sv.lop || "",
          khoa_id: sv.khoa_id || "",
          nganh_id: sv.nganh_id || "",
          khoa_hoc: sv.khoa_hoc || "",
          ngay_nhap_hoc: sv.ngay_nhap_hoc ? sv.ngay_nhap_hoc.split("T")[0] : "",
        });
      } catch (error) {
        console.error("Lỗi load dữ liệu:", error);
      }
    };

    fetchData();
  }, [id, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await axios.put(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/update-sinh-vien/${id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      openNotify("Cập nhật sinh viên thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi cập nhật sinh viên", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Cập nhật sinh viên</h1>
            <button type="button" className="md-btn-cancel" onClick={onClose}>
              X
            </button>
          </div>

          {/* MSSV & Tên */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Mã số sinh viên</label>
              <input
                name="ma_so_sinh_vien"
                type="text"
                value={formData.ma_so_sinh_vien || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Tên sinh viên</label>
              <input
                name="ho_ten"
                type="text"
                value={formData.ho_ten || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Tài khoản */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Tên đăng nhập</label>
              <input
                name="ten_dang_nhap"
                type="text"
                value={formData.ten_dang_nhap || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Mật khẩu</label>
              <input
                name="mat_khau"
                type="password"
                value={formData.mat_khau || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Lớp - Khoa */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Lớp</label>
              <input
                name="lop"
                type="text"
                value={formData.lop || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Khoa</label>
              <select
                id="md-Khoa"
                name="khoa_id"
                value={formData.khoa_id || ""}
                onChange={handleChange}
              >
                <option value="">-- Chọn khoa --</option>
                {danhSachKhoa.map((khoa) => (
                  <option key={khoa.id} value={khoa.id}>
                    {khoa.ten_khoa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ngành - Khóa học */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Ngành</label>
              <select
                id="md-Nganh"
                name="nganh_id"
                value={formData.nganh_id || ""}
                onChange={handleChange}
              >
                <option value="">-- Chọn ngành --</option>
                {danhSachNganh.map((nganh) => (
                  <option key={nganh.id} value={nganh.id}>
                    {nganh.ten_nganh}
                  </option>
                ))}
              </select>
            </div>
            <div className="form__group">
              <label>Khóa học</label>
              <input
                name="khoa_hoc"
                type="text"
                value={formData.khoa_hoc || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Ngày nhập học */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Ngày nhập học</label>
              <input
                name="ngay_nhap_hoc"
                type="date"
                value={
                  formData.ngay_nhap_hoc
                    ? formData.ngay_nhap_hoc.split("T")[0]
                    : ""
                }
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Nút */}
          <div className="modal-popup-row">
            <button type="button" className="md-btn-add" onClick={handleSubmit}>
              Cập nhật
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalCapNhatSinhVien;
