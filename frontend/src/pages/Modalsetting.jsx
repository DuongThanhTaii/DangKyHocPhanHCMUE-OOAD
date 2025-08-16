import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/settingmodal.css";
import "../css/reset.css";
import "../css/menu.css";
import { useModalContext } from "../hook/ModalContext";

function SettingModal({ isOpen, onClose }) {
  const { openNotify, openConfirm } = useModalContext();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // Lấy role từ localStorage khi component được render hoặc modal được mở
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserRole(user.loai_tai_khoan);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
      }
    }

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const handleChangePassword = async () => {
    // Kiểm tra trên FE trước khi gửi
    if (!oldPassword || !newPassword || !confirmPassword) {
      openNotify("Vui lòng nhập đầy đủ thông tin", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      openNotify("Mật khẩu mới và xác nhận không khớp", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        openNotify("Bạn chưa đăng nhập", "error");
        return;
      }

      const res = await axios.put(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/auth/change-password", // URL API backend
        {
          oldPassword: oldPassword,
          newPassword: newPassword,
          confirmNewPassword: confirmPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      openNotify(res.data.message || "Đổi mật khẩu thành công", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      openNotify(err.response?.data?.error || "Lỗi đổi mật khẩu", "error");
    }
  };

  const handleClear = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClearData = async () => {
    openConfirm(
      "Bạn có chắc chắn muốn làm sạch toàn bộ dữ liệu hệ thống? Thao tác này không thể hoàn tác.",
      async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            openNotify("Bạn chưa đăng nhập", "error");
            return;
          }

          const res = await axios.post(
            "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/system/clean",
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          openNotify(res.data.message, "success");
          onClose();
        } catch (err) {
          openNotify(
            err.response?.data?.error || "Lỗi khi làm sạch dữ liệu",
            "error"
          );
        }
      }
    );
  };

  return (
    <div className="modal__overlay" onClick={onClose}>
      <div
        className="modal__content animate"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="setting__title">Cài đặt</p>

        <div className="form__group">
          <input
            type="password"
            className="form__input"
            placeholder=" "
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <label className="form__floating-label">Mật khẩu cũ</label>
        </div>

        <div className="form__group">
          <input
            type="password"
            className="form__input"
            placeholder=" "
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <label className="form__floating-label">Mật khẩu mới</label>
        </div>

        <div className="form__group">
          <input
            type="password"
            className="form__input"
            placeholder=" "
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <label className="form__floating-label">Xác nhận mật khẩu mới</label>
        </div>

        <button
          className="btn__setting__submit btn__chung"
          onClick={handleChangePassword}
        >
          Xác nhận
        </button>
        {userRole === "phong_dao_tao" && (
          <button
            className="btn__setting__clean btn__cancel"
            onClick={handleClearData}
          >
            Làm sạch dữ liệu
          </button>
        )}
      </div>
    </div>
  );
}

export default SettingModal;
