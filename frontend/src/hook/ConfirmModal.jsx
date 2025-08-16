import React from "react";
import "../css/modal.css"; // import style chung cho modal nếu có
import "../css/menu.css";

function ConfirmModal({ message, onCancel, onOk }) {
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
}

export default ConfirmModal;
