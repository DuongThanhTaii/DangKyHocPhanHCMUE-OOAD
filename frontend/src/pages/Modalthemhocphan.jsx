import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";
import "../css/modal.css";
import { useModalContext } from "../hook/ModalContext";

const ModalThemMonHoc = ({ onClose }) => {
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
  const [excelFile, setExcelFile] = useState(null);

  const nganhDropdownRef = useRef(null);

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

        console.log("Danh sách ngành trả về:", res.data);

        if (Array.isArray(res.data) && res.data.length > 0) {
          setDanhSachKhoa(res.data);
          setFormData((prev) => ({ ...prev, khoa_id: res.data[0].id }));
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
    console.log("Fetch ngành cho khoaId =", formData.khoa_id);

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
        console.log("Ngành nhận về:", res.data);
        if (Array.isArray(res.data)) {
          setDanhSachNganh(res.data);
          setSelectedNganhIds([]);
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

  const handleSubmit = async () => {
    try {
      await axios.post("http://localhost:3000/api/tao-mon-hoc", {
        ...formData,
        nganh_ids: selectedNganhIds,
      });
      openNotify("Thêm môn học thành công", "success");
      onClose();
    } catch (error) {
      console.error(error);
      openNotify("Lỗi thêm môn học", "error");
    }
  };

  const handleExcelSubmit = async () => {
    if (!excelFile) return openNotify("Vui lòng chọn file Excel", "error");
    const data = new FormData();
    data.append("file", excelFile);

    try {
      await axios.post("http://localhost:3000/api/upload-mon-hoc", data);
      openNotify("Tải lên môn học từ Excel thành công", "success");
      onClose();
    } catch (error) {
      console.error(error);
      openNotify("Lỗi tải lên file Excel", "error");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-popup">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="modal-header">
            <h1>Thêm môn học</h1>
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
                id="md-Nganh"
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
            className="md-hp-nganh"
            onClick={() => setShowNganhList((prev) => !prev)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <path d="M480 224C492.9 224 504.6 231.8 509.6 243.8C514.6 255.8 511.8 269.5 502.7 278.7L342.7 438.7C330.2 451.2 309.9 451.2 297.4 438.7L137.4 278.7C128.2 269.5 125.5 255.8 130.5 243.8C135.5 231.8 147.1 224 160 224L480 224z" />
            </svg>
            {/* Chỉ hiện tên ngành khi dropdown đang mở */}
            {showNganhList && (
              <div>
                {selectedNganhIds.length > 0
                  ? danhSachNganh
                      .filter((n) => selectedNganhIds.includes(n.id))
                      .map((n) => n.ten_nganh)
                      .join(", ")
                  : "Chọn ngành học"}
              </div>
            )}

            {/* Phần dropdown checkbox ngành */}
            {showNganhList && (
              <div onClick={(e) => e.stopPropagation()}>
                {danhSachNganh.length > 0 ? (
                  danhSachNganh.map((nganh) => (
                    <div
                      key={nganh.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`nganh_${nganh.id}`}
                        checked={selectedNganhIds.includes(nganh.id)}
                        onChange={() => toggleNganh(nganh.id)}
                      />
                      <label htmlFor={`nganh_${nganh.id}`}>
                        {nganh.ten_nganh}
                      </label>
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
            <div className="form__group">
              <label>Tải lên file Excel:</label>
              <input
                id="excelUpload"
                type="file"
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
              onClick={handleExcelSubmit}
            >
              Tải từ Excel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ModalThemMonHoc;
