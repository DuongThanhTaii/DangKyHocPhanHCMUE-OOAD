import React from "react";
import "../css/modal.css";
import "../css/reset.css";

function NotifyModal({ message, type = "success", onClose }) {
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
}

export default NotifyModal;
