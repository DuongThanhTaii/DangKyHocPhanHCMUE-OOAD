import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalCapNhatGiangVien = ({ giangVienId, onClose }) => {
  const { openNotify } = useModalContext();

  const [formData, setFormData] = useState({
    ma_nhan_vien: "",
    ho_ten: "",
    khoa_id: "",
    trinh_do: "",
    kinh_nghiem_giang_day: 10,
  });

  const [danhSachKhoa, setDanhSachKhoa] = useState([]);

  // Lấy danh sách khoa
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
        if (Array.isArray(res.data)) {
          setDanhSachKhoa(res.data);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách khoa:", err);
      }
    };
    fetchKhoa();
  }, []);

  // Lấy thông tin giảng viên để fill form
  useEffect(() => {
    if (giangVienId) {
      console.log("GiangVienId gửi lên BE:", giangVienId); // 👈 Thêm dòng này
      const fetchGiangVien = async () => {
        try {
          const res = await axios.get(
            `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/show-update-giang-vien/${giangVienId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          console.log("Dữ liệu trả về từ BE:", res.data); // 👈 Thêm dòng này
          if (res.data) {
            setFormData(res.data);
          }
        } catch (err) {
          console.error("Lỗi tải thông tin giảng viên:", err);
        }
      };
      fetchGiangVien();
    }
  }, [giangVienId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/update-giang-vien/${giangVienId}`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      openNotify("Cập nhật giảng viên thành công", "success");
      onClose();
    } catch (err) {
      console.error(err);
      openNotify("Lỗi cập nhật giảng viên", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Cập nhật giảng viên</h1>
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
              <label>Khoa</label>
              <select
                id="md-Khoa"
                name="khoa_id"
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
                  <option>Không có dữ liệu</option>
                )}
              </select>
            </div>

            <div className="form__group">
              <label>Trình độ</label>
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
          </div>

          <div className="modal-popup-row">
            <button type="button" className="md-btn-add" onClick={handleUpdate}>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalCapNhatGiangVien;
