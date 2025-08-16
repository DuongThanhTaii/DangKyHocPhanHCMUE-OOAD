
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalCapNhatMonHoc = ({ onClose, monHocId }) => {
  const { openNotify } = useModalContext();

  const [formData, setFormData] = useState({
    ma_mon: "",
    ten_mon: "",
    so_tin_chi: "",
    khoa_id: "",
    loai_mon: "chuyen_nganh",
    la_mon_chung: false,
    thu_tu_hoc: 1,
  });

  const [danhSachKhoa, setDanhSachKhoa] = useState([]);
  const [danhSachNganh, setDanhSachNganh] = useState([]);
  const [selectedNganhIds, setSelectedNganhIds] = useState([]);
  const [showNganhList, setShowNganhList] = useState(false);

  const nganhDropdownRef = useRef(null);

  // Lấy thông tin môn học theo ID
  useEffect(() => {
    if (!monHocId) return;

    const fetchMonHoc = async () => {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/show-update-mon-hoc/${monHocId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const mh = res.data;
        setFormData({
          ma_mon: mh.ma_mon || "",
          ten_mon: mh.ten_mon || "",
          so_tin_chi: mh.so_tin_chi || "",
          khoa_id: mh.khoa_id || "",
          loai_mon: mh.loai_mon || "chuyen_nganh",
          la_mon_chung: mh.la_mon_chung || false,
          thu_tu_hoc: mh.thu_tu_hoc || 1,
        });
        setSelectedNganhIds(mh.nganh_ids || []);
      } catch (error) {
        console.error("Lỗi tải môn học:", error);
      }
    };

    fetchMonHoc();
  }, [monHocId]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        nganhDropdownRef.current &&
        !nganhDropdownRef.current.contains(event.target)
      ) {
        setShowNganhList(false);
      }
    }
    if (showNganhList) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNganhList]);

  // Load danh sách khoa
  useEffect(() => {
    const fetchKhoa = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/khoa", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (Array.isArray(res.data) && res.data.length > 0) {
          setDanhSachKhoa(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách khoa:", error);
      }
    };
    fetchKhoa();
  }, []);

  // Load ngành học theo khoa
  useEffect(() => {
    if (!formData.khoa_id) return;

    const fetchNganh = async () => {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/khoa/${formData.khoa_id}/nganh`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (Array.isArray(res.data)) {
          setDanhSachNganh(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách ngành:", error);
        setDanhSachNganh([]);
      }
    };
    fetchNganh();
  }, [formData.khoa_id]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    if (type === "number") val = Number(value);
    if (name === "la_mon_chung") val = value === "true";
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const toggleNganh = (id) => {
    setSelectedNganhIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleUpdate = async () => {
    try {
      // Sửa URL API tại đây để khớp với backend
      await axios.put(
        `http://localhost:3000/api/update-mon-hoc/${monHocId}`,
        { ...formData, nganh_ids: selectedNganhIds },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      openNotify("Cập nhật môn học thành công", "success");
      onClose();
    } catch (error) {
      console.error(error);
      openNotify("Lỗi cập nhật môn học", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Cập nhật môn học</h1>
            <button type="button" className="md-btn-cancel" onClick={onClose}>
              X
            </button>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Mã môn</label>
              <input
                type="text"
                name="ma_mon"
                value={formData.ma_mon}
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Tên môn</label>
              <input
                type="text"
                name="ten_mon"
                value={formData.ten_mon}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Số tín chỉ</label>
              <input
                type="number"
                name="so_tin_chi"
                value={formData.so_tin_chi}
                onChange={handleChange}
              />
            </div>
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
                  <option>Đang tải...</option>
                )}
              </select>
            </div>
          </div>

          {/* Phần chọn ngành học */}
          <label>Học phần thuộc ngành</label>
          <div
            ref={nganhDropdownRef}
            className="md-hp-nganh"
            onClick={() => setShowNganhList((prev) => !prev)}
          >
            {selectedNganhIds.length > 0
              ? danhSachNganh
                  .filter((n) => selectedNganhIds.includes(n.id))
                  .map((n) => n.ten_nganh)
                  .join(", ")
              : "Chọn ngành học"}

            {showNganhList && (
              <div onClick={(e) => e.stopPropagation()}>
                {danhSachNganh.length > 0 ? (
                  danhSachNganh.map((nganh) => (
                    <div
                      key={nganh.id}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNganhIds.includes(nganh.id)}
                        onChange={() => toggleNganh(nganh.id)}
                      />
                      <label>{nganh.ten_nganh}</label>
                    </div>
                  ))
                ) : (
                  <div>Không có ngành học</div>
                )}
              </div>
            )}
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Loại môn</label>
              <select
                id="md-loaimon"
                name="loai_mon"
                value={formData.loai_mon}
                onChange={handleChange}
              >
                <option value="chuyen_nganh">Bắt buộc</option>
                <option value="tu_chon">Tự chọn</option>
              </select>
            </div>
            <div className="form__group">
              <label>Môn chung</label>
              <select
                id="md-monchung"
                name="la_mon_chung"
                value={formData.la_mon_chung.toString()}
                onChange={handleChange}
              >
                <option value="false">Không</option>
                <option value="true">Có</option>
              </select>
            </div>
          </div>

          <div className="modal-popup-row">
            <div className="form__group">
              <label>Thứ tự học</label>
              <input
                type="number"
                name="thu_tu_hoc"
                value={formData.thu_tu_hoc}
                onChange={handleChange}
                min={1}
              />
            </div>
          </div>

          <div className="modal-popup-row">
            <button type="button" className="md-btn-add" onClick={handleUpdate}>
              Cập nhật
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalCapNhatMonHoc;
