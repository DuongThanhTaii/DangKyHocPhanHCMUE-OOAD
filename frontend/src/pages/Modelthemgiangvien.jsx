import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalThemGiangVien = ({ onClose }) => {
  const { openNotify } = useModalContext();

  const [formData, setFormData] = useState({
    ma_nhan_vien: "",
    ho_ten: "",
    khoa_id: "",
    trinh_do: "",
    kinh_nghiem_giang_day: 1,
  });

  const [excelFile, setExcelFile] = useState(null);
  const [danhSachKhoa, setDanhSachKhoa] = useState([]);

  // Lấy danh sách khoa từ API khi modal mở
  useEffect(() => {
    const fetchKhoa = async () => {
      try {
        const res = await axios.get(
          "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/khoa",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (Array.isArray(res.data) && res.data.length > 0) {
          setDanhSachKhoa(res.data);
          setFormData((prev) => ({
            ...prev,
            khoa_id: res.data[0].id, // chọn khoa đầu tiên làm mặc định
          }));
        } else {
          setDanhSachKhoa([]);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách khoa:", err);
        setDanhSachKhoa([]);
      }
    };
    fetchKhoa();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/tao-giang-vien",
        formData
      );
      openNotify("Thêm giảng viên thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi thêm giảng viên", "error");
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) return openNotify("Chưa chọn file Excel", "error");
    const formDataUpload = new FormData();
    formDataUpload.append("file", excelFile);

    try {
      await axios.post(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/upload-giang-vien",
        formDataUpload
      );
      openNotify("Tải file Excel thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi upload file Excel", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Thêm giảng viên</h1>
            <button type="button" className="md-btn-cancel" onClick={onClose}>
              X
            </button>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Mã giảng viên</label>
              <input
                type="text"
                name="ma_nhan_vien"
                onChange={handleChange}
                value={formData.ma_nhan_vien}
              />
            </div>
            <div className="form__group">
              <label>Tên giảng viên</label>
              <input
                type="text"
                name="ho_ten"
                onChange={handleChange}
                value={formData.ho_ten}
              />
            </div>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label htmlFor="md-Khoa">Khoa</label>
              <select
                name="khoa_id"
                id="md-Khoa"
                value={formData.khoa_id}
                onChange={handleChange}
              >
                {danhSachKhoa.length > 0 ? (
                  danhSachKhoa.map((khoa) => (
                    <option key={khoa.id} value={khoa.id}>
                      {khoa.ten_khoa}
                    </option>
                  ))
                ) : (
                  <option>Đang tải...</option>
                )}
              </select>
            </div>

            <div className="form__group">
              <label>Học vị / học hàm</label>
              <input
                type="text"
                name="trinh_do"
                onChange={handleChange}
                value={formData.trinh_do}
              />
            </div>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Kinh nghiệm giảng dạy</label>
              <input
                type="number"
                name="kinh_nghiem_giang_day"
                onChange={handleChange}
                value={formData.kinh_nghiem_giang_day}
              />
            </div>

            <div className="form__group">
              <label htmlFor="excelUpload">Tải lên file Excel:</label>
              <input
                type="file"
                id="excelUpload"
                accept=".xls,.xlsx"
                onChange={(e) => setExcelFile(e.target.files[0])}
              />
            </div>
          </div>

          <div className="modal-popup-row">
            <button type="button" className="md-btn-add" onClick={handleSubmit}>
              Thêm thủ công
            </button>
            <button
              type="button"
              className="md-btn-add"
              onClick={handleExcelUpload}
            >
              Tải từ Excel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalThemGiangVien;
