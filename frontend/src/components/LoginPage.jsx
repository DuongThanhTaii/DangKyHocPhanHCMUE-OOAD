import "../css/dangnhap.css";
import "../css/reset.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        "https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenDangNhap: username,
            matKhau: password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Đăng nhập thất bại");
        return;
      }

      // Lưu token
      localStorage.setItem("token", data.token);

      // Lưu user vào localStorage nếu cần
      localStorage.setItem("user", JSON.stringify(data.user));

      // Điều hướng sau khi đăng nhập
      if (data.user.loai_tai_khoan === "phong_dao_tao") {
        navigate("/pdt");
      } else if (data.user.loai_tai_khoan === "tro_ly_khoa") {
        navigate("/tlk");
      } else if (data.user.loai_tai_khoan === "truong_khoa") {
        navigate("/tk");
      } else {
        navigate("/main");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ");
    }
  };

  return (
    <div className="container">
      <div className="school">
        <img src="/assets/img/school.jpg" alt="" className="school__img" />
      </div>
      <div className="main">
        <div className="header">
          <div className="header__logo">
            <img
              src="/assets/img/logohcmue.png"
              alt=""
              className="header__logo-img"
            />
          </div>
          <div className="header__info">
            <h1 className="header__name-school">
              TRƯỜNG ĐẠI HỌC SƯ PHẠM THÀNH PHỐ HỒ CHÍ MINH
            </h1>
            <p className="header__label">CỔNG ĐĂNG KÝ HỌC PHẦN</p>
          </div>
        </div>

        <form className="form" onSubmit={handleLogin}>
          <h2 className="form__title">ĐĂNG NHẬP</h2>
          <p className="form__desc">Cổng đăng ký học phần</p>

          <div className="form__group">
            <input
              type="text"
              name="username"
              placeholder=" "
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label>Tên đăng nhập</label>
            <p className="form__message">Tên đăng nhập là bắt buộc</p>
          </div>

          <div className="form__group">
            <input
              type="password"
              name="password"
              placeholder=" "
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label>Mật khẩu</label>
            <p className="form__message">Mật khẩu là bắt buộc</p>
          </div>

          {errorMsg && (
            <p
              style={{
                color: "red",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {errorMsg}
            </p>
          )}

          <button type="submit" className="submit">
            Đăng nhập
          </button>
        </form>

        <div className="copyright">
          <p className="copyright__text">
            © 2025 OOAD | Developed by Anh Trai Say Ges{" "}
            <a
              href="https://psctelecom.com.vn/"
              target="_blank"
              rel="noreferrer"
            >
              <img src="/assets/icon/Logo_PSC_white.png" alt="" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
