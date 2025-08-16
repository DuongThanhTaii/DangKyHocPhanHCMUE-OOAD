import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmModal from "./ConfirmModal";
import NotifyModal from "./NotifyModal";

const ModalContext = createContext();

export const useModalContext = () => useContext(ModalContext);

export function ModalProvider({ children }) {
  // Confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirm, setOnConfirm] = useState(() => () => {});

  // Notify modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState("success");

  // Mở Confirm
  const openConfirm = (message, onOk) => {
    setConfirmMessage(message);
    setOnConfirm(() => onOk);
    setShowConfirmModal(true);
  };

  // Mở Notify
  const openNotify = (message, type = "success") => {
    setNotifyMessage(message);
    setNotifyType(type);
    setShowNotifyModal(true);
  };

  // Render modal qua portal
  const modalUI = createPortal(
    <>
      {showConfirmModal && (
        <ConfirmModal
          message={confirmMessage}
          onCancel={() => setShowConfirmModal(false)}
          onOk={() => {
            setShowConfirmModal(false);
            onConfirm();
          }}
        />
      )}
      {showNotifyModal && (
        <NotifyModal
          message={notifyMessage}
          type={notifyType}
          onClose={() => setShowNotifyModal(false)}
        />
      )}
    </>,
    document.body
  );

  return (
    <ModalContext.Provider value={{ openConfirm, openNotify }}>
      {children}
      {modalUI}
    </ModalContext.Provider>
  );
}
