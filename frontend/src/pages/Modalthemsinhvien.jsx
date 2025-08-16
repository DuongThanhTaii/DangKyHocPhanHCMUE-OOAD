import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalThemSinhVien = ({ onClose }) => {
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

  const [excelFile, setExcelFile] = useState(null);
  const [danhSachKhoa, setDanhSachKhoa] = useState([]);
  const [danhSachNganh, setDanhSachNganh] = useState([]);

  // Lấy danh sách khoa khi modal mở
  useEffect(() => {
    const fetchKhoa = async () => {
      try {
        const res = await axios.get(
          "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`, // hoặc lấy token từ context
            },
          }
        );

        // Đảm bảo res.data là mảng trước khi set
        if (Array.isArray(res.data)) {
          setDanhSachKhoa(res.data);
        } else {
          console.error("API /api/khoa không trả về mảng:", res.data);
          setDanhSachKhoa([]);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách khoa:", err);
        setDanhSachKhoa([]);
      }
    };
    fetchKhoa();
  }, []);

  // Khi chọn khoa, load ngành theo khoa đó
  useEffect(() => {
    if (!formData.khoa_id) return;

    const fetchNganh = async () => {
      try {
        const res = await axios.get(
          `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa/${formData.khoa_id}/nganh`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (Array.isArray(res.data)) {
          setDanhSachNganh(res.data);
        } else {
          setDanhSachNganh([]);
        }
        setFormData((prev) => ({ ...prev, nganh_id: "" }));
      } catch (err) {
        console.error("Lỗi tải danh sách ngành:", err);
        setDanhSachNganh([]);
      }
    };

    fetchNganh();
  }, [formData.khoa_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/tao-sinh-vien",
        formData
      );
      openNotify("Thêm sinh viên thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi thêm sinh viên", "error");
    }
  };

  const handleFileChange = (e) => {
    setExcelFile(e.target.files[0]);
  };

  const handleUploadExcel = async () => {
    if (!excelFile) {
      alert("Vui lòng chọn file Excel");
      return;
    }

    const data = new FormData();
    data.append("file", excelFile);

    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/upload-sinh-vien",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      openNotify("Tải lên file Excel thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi khi tải lên file Excel", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Thêm sinh viên</h1>
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
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Tên sinh viên</label>
              <input name="ho_ten" type="text" onChange={handleChange} />
            </div>
          </div>

          {/* Tài khoản */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Tên đăng nhập</label>
              <input name="ten_dang_nhap" type="text" onChange={handleChange} />
            </div>
            <div className="form__group">
              <label>Mật khẩu</label>
              <input name="mat_khau" type="password" onChange={handleChange} />
            </div>
          </div>

          {/* Lớp - Khoa */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Lớp</label>
              <input name="lop" type="text" onChange={handleChange} />
            </div>
            <div className="form__group">
              <label>Khoa</label>
              <select
                id="md-Khoa"
                name="khoa_id"
                value={formData.khoa_id}
                onChange={handleChange}
              >
                <option value="">-- Chọn khoa --</option>
                {Array.isArray(danhSachKhoa) &&
                  danhSachKhoa.map((khoa) => (
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
                value={formData.nganh_id}
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
              <input name="khoa_hoc" type="text" onChange={handleChange} />
            </div>
          </div>

          {/* Ngày nhập học & Excel */}
          <div className="modal-popup-row">
            <div className="form__group">
              <label>Ngày nhập học</label>
              <input name="ngay_nhap_hoc" type="date" onChange={handleChange} />
            </div>
            <div className="form__group">
              <label>Tải lên file Excel:</label>
              <input
                id="excelUpload"
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Nút */}
          <div className="modal-popup-row">
            <button type="button" className="md-btn-add" onClick={handleSubmit}>
              Thêm thủ công
            </button>
            <button
              type="button"
              className="md-btn-add"
              onClick={handleUploadExcel}
            >
              Tải từ Excel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalThemSinhVien;
