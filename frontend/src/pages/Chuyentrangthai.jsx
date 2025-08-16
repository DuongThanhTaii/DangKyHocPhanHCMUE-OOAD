// console.log("Token gửi đi là:", localStorage.getItem("token"));

import React, { useEffect, useState } from "react";
import "../css/reset.css";
import "../css/menu.css";

function SystemPhase() {
  const [currentPhase, setCurrentPhase] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");

  const [nienKhoas, setNienKhoas] = useState([]);
  const [hocKys, setHocKys] = useState([]);
  const [selectedNienKhoa, setSelectedNienKhoa] = useState("");
  const [selectedHocKy, setSelectedHocKy] = useState("");
  const [currentSemester, setCurrentSemester] = useState({});
  const [semesterMessage, setSemesterMessage] = useState("");

  const phaseNames = {
    1: "Tiền ghi danh",
    2: "Ghi danh",
    3: "Sắp xếp thời khóa biểu",
    4: "Đăng ký học phần",
    5: "Bình thường",
  };

  const fetchPhase = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/system/phase", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setCurrentPhase(data?.trang_thai_phase || 1);
    } catch (err) {
      console.error("Lỗi lấy phase:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/metadata/semesters", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        // Lấy danh sách niên khóa duy nhất
        const uniqueNienKhoas = [...new Set(data.map((s) => s.ten_nien_khoa))];
        setNienKhoas(uniqueNienKhoas);

        // Lấy danh sách học kỳ duy nhất
        const uniqueHocKys = [...new Set(data.map((s) => s.ma_hoc_ky))];
        setHocKys(uniqueHocKys);

        // Tìm học kỳ hiện tại
        const current = data.find((s) => s.trang_thai_hien_tai);
        if (current) {
          setCurrentSemester(current);
          setSelectedNienKhoa(current.ten_nien_khoa);
          setSelectedHocKy(current.ma_hoc_ky);
        } else {
          // Set giá trị mặc định nếu không có học kỳ nào được đặt là hiện tại
          if (uniqueNienKhoas.length > 0)
            setSelectedNienKhoa(uniqueNienKhoas[0]);
          if (uniqueHocKys.length > 0) setSelectedHocKy(uniqueHocKys[0]);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách học kỳ:", err);
    }
  };

  useEffect(() => {
    fetchPhase();
    fetchSemesters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/system/phase", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ phase: Number(selectedPhase) }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Chuyển trạng thái thành công");
        setCurrentPhase(data.phase.trang_thai_phase);
      } else {
        setMessage("❌ " + (data.error || "Lỗi chuyển trạng thái"));
      }
    } catch (err) {
      setMessage("❌ Lỗi kết nối server");
    }
  };

  const handleSubmitSemester = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        "http://localhost:3000/api/system/set-current-semester",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            ma_hoc_ky: selectedHocKy,
            ten_nien_khoa: selectedNienKhoa,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSemesterMessage(`✅ ${data.message}`);
        fetchSemesters(); // Cập nhật lại trạng thái học kỳ hiện tại
      } else {
        setSemesterMessage("❌ " + (data.error || "Lỗi thiết lập học kỳ"));
      }
    } catch (err) {
      setSemesterMessage("❌ Lỗi kết nối server");
    }
  };

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">TRẠNG THÁI HỆ THỐNG</p>
      </div>
      <div className="body__inner">
        <form className="search-form" onSubmit={handleSubmit}>
          {/* Dropdown trạng thái */}
          <div className="form__group">
            <select
              className="form__select"
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
            >
              <option value={1}>Tiền ghi danh</option>
              <option value={2}>Ghi danh học phần</option>
              <option value={3}>Sắp xếp thời khóa biểu</option>
              <option value={4}>Đăng ký học phần</option>
              <option value={5}>Bình thường</option>
            </select>
            <label className="form__label">Loại trạng thái</label>
          </div>

          {/* Thời gian bắt đầu */}
          <div className="form__group form__group__ctt">
            <input
              type="datetime-local"
              className="form__input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <label className="form__floating-label">Thời gian bắt đầu</label>
          </div>

          {/* Thời gian kết thúc */}
          <div className="form__group form__group__ctt">
            <input
              type="datetime-local"
              className="form__input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            <label className="form__floating-label">Thời gian kết thúc</label>
          </div>

          {/* Nút chuyển */}
          <button type="submit" className="form__button btn__chung">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25">
              <path
                d="M15.8331 14.5H15.0431L14.7631 14.23C15.7431 13.09 16.3331 11.61 16.3331 10C16.3331 6.41 13.4231 3.5 9.83313 3.5C6.24313 3.5 3.33313 6.41 3.33313 10C3.33313 13.59 6.24313 16.5 9.83313 16.5C11.4431 16.5 12.9231 15.91 14.0631 14.93L14.3331 15.21V16L19.3331 20.99L20.8231 19.5L15.8331 14.5ZM9.83313 14.5C7.34313 14.5 5.33313 12.49 5.33313 10C5.33313 7.51 7.34313 5.5 9.83313 5.5C12.3231 5.5 14.3331 7.51 14.3331 10C14.3331 12.49 12.3231 14.5 9.83313 14.5Z"
                fill="currentColor"
              />
            </svg>
            Chuyển
          </button>
        </form>

        {/* Hiển thị trạng thái hiện tại */}
        <p className="phase">
          Trạng thái hiện tại:{" "}
          <strong>{phaseNames[currentPhase] || "Không xác định"}</strong>
        </p>

        {message && (
          <p
            style={{
              marginTop: "1rem",
              color: message.includes("✅") ? "green" : "red",
            }}
          >
            {message}
          </p>
        )}

        <div className="form-section">
          <h3 className="sub__title_chuyenphase">
            Thiết lập Niên khóa & Học kỳ hiện tại
          </h3>
          <form className="search-form" onSubmit={handleSubmitSemester}>
            <div className="form__group">
              <select
                className="form__select"
                value={selectedNienKhoa}
                onChange={(e) => setSelectedNienKhoa(e.target.value)}
              >
                {nienKhoas.map((nk) => (
                  <option key={nk} value={nk}>
                    {nk}
                  </option>
                ))}
              </select>
              <label className="form__label">Niên khóa</label>
            </div>

            <div className="form__group">
              <select
                className="form__select"
                value={selectedHocKy}
                onChange={(e) => setSelectedHocKy(e.target.value)}
              >
                {hocKys.map((hk) => (
                  <option key={hk} value={hk}>
                    {hk}
                  </option>
                ))}
              </select>
              <label className="form__label">Học kỳ</label>
            </div>

            <button type="submit" className="form__button btn__chung">
              Chuyển đổi
            </button>
          </form>
          {currentSemester.ten_nien_khoa && (
            <p className="phase">
              Học kỳ hiện tại:{" "}
              <strong>
                {currentSemester.ten_hoc_ky} ({currentSemester.ten_nien_khoa})
              </strong>
            </p>
          )}
          {semesterMessage && (
            <p
              style={{
                color: semesterMessage.includes("✅") ? "green" : "red",
              }}
            >
              {semesterMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default SystemPhase;
