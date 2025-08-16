import { NavLink, Outlet } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import "../css/reset.css";
import "../css/menu.css";
import logo from "../assets/img/logo2.png";
import vnFlag from "../assets/icon/Flag_of_Vietnam.svg";
import SettingModal from "../pages/Modalsetting";

function Menu() {
  useEffect(() => {
    const accountClick = document.getElementById("user__icon");
    const accountPopup = document.getElementById("modal");
    const langClick = document.getElementById("header__country");
    const langPopup = document.getElementById("language");

    const toggleAccount = () => {
      if (accountPopup)
        accountPopup.style.display =
          accountPopup.style.display === "block" ? "none" : "block";
    };

    const toggleLanguage = () => {
      if (langPopup)
        langPopup.style.display =
          langPopup.style.display === "flex" ? "none" : "flex";
    };

    const clickOutside = (e) => {
      if (
        accountPopup &&
        accountClick &&
        !accountClick.contains(e.target) &&
        !accountPopup.contains(e.target)
      ) {
        accountPopup.style.display = "none";
      }

      if (
        langPopup &&
        langClick &&
        !langClick.contains(e.target) &&
        !langPopup.contains(e.target)
      ) {
        langPopup.style.display = "none";
      }
    };

    // Ripple effect khi click navbar__link
    const links = document.querySelectorAll(".navbar__link");
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = `${e.offsetX}px`;
        ripple.style.top = `${e.offsetY}px`;
        link.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    accountClick?.addEventListener("click", toggleAccount);
    langClick?.addEventListener("click", toggleLanguage);
    document.addEventListener("click", clickOutside);

    return () => {
      accountClick?.removeEventListener("click", toggleAccount);
      langClick?.removeEventListener("click", toggleLanguage);
      document.removeEventListener("click", clickOutside);
    };
  }, []);

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("token"); // Hoặc sessionStorage nếu bạn dùng nó
    window.location.href = "/"; // Chuyển về trang login
  };

  // Trả về tên,.. theo giá trị của từng user
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const formatRole = (role) => {
    switch (role) {
      case "sinh_vien":
        return "Sinh viên";
      case "giang_vien":
        return "Giảng viên";
      case "phong_dao_tao":
        return "Phòng đào tạo";
      case "truong_khoa":
        return "Trưởng khoa";
      case "tro_ly_khoa":
        return "Trợ lý khoa";
      default:
        return "Người dùng";
    }
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "navbar__link active" : "navbar__link";

  const [showSetting, setShowSetting] = useState(false);

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="sidebar__logo">
          <img src={logo} alt="logo" className="logo-img" />
        </div>
        <div className="sidebar__info">
          <div className="sidebar__user">
            <div className="user__icon">
              <svg
                className="user__icon-img"
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="37"
                viewBox="0 0 36 37"
                fill="none"
              >
                <path
                  d="M18 18.475C21.315 18.475 24 15.79 24 12.475C24 9.16001 21.315 6.47501 18 6.47501C14.685 6.47501 12 9.16001 12 12.475C12 15.79 14.685 18.475 18 18.475ZM18 21.475C13.995 21.475 6 23.485 6 27.475V30.475H30V27.475C30 23.485 22.005 21.475 18 21.475Z"
                  fill="#172B4D"
                />
              </svg>
            </div>
            <div className="user__body">
              <p className="user__name">{user.ho_ten}</p>
              <p className="user__score">{user.ma_so_sinh_vien}</p>
              <p className="user__role">{formatRole(user.loai_tai_khoan)}</p>
            </div>
          </div>
        </div>
        <div className="sidebar__menu">
          <h3 className="sidebar__menu-title">Chức năng</h3>
          <nav className="navbar">
            <ul className="navbar__list">
              <li className="navbar__item">
                <NavLink to="duyet-hoc-phan" className={getNavLinkClass}>
                  <span className="navbar__link-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                    >
                      <path
                        d="M7.5 10.46L9.16667 12.1267L12.5 8.79336M17.5 10.46C17.5 11.4449 17.306 12.4202 16.9291 13.3301C16.5522 14.2401 15.9997 15.0669 15.3033 15.7633C14.6069 16.4598 13.7801 17.0122 12.8701 17.3891C11.9602 17.766 10.9849 17.96 10 17.96C9.01509 17.96 8.03982 17.766 7.12987 17.3891C6.21993 17.0122 5.39314 16.4598 4.6967 15.7633C4.00026 15.0669 3.44781 14.2401 3.0709 13.3301C2.69399 12.4202 2.5 11.4449 2.5 10.46C2.5 8.4709 3.29018 6.56324 4.6967 5.15672C6.10322 3.7502 8.01088 2.96002 10 2.96002C11.9891 2.96002 13.8968 3.7502 15.3033 5.15672C16.7098 6.56324 17.5 8.4709 17.5 10.46Z"
                        stroke="currentColor"
                        strokeWidth="1.66667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="navbar__link-text">
                    Duyệt danh sách học phần
                  </span>
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
      <main className="layout__main">
        <header className="header__menu">
          <h1 className="header__title">
            TRƯỜNG ĐẠI HỌC SƯ PHẠM THÀNH PHỐ HỒ CHÍ MINH
          </h1>
          <div className="header__user">
            <div className="header__country" id="header__country">
              <img className="header__country-img" src={vnFlag} alt="vn" />
            </div>
            <div className="language hidden__language" id="language">
              <img src={vnFlag} alt="Vietnamese" />
              <p>Vietnamese</p>
            </div>
            <div className="user__icon" id="user__icon">
              <svg
                className="user__icon-img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 36 37"
                fill="currentColor"
              >
                <path d="M18 18.475C21.315 18.475 24 15.79 24 12.475C24 9.16001 21.315 6.47501 18 6.47501C14.685 6.47501 12 9.16001 12 12.475C12 15.79 14.685 18.475 18 18.475ZM18 21.475C13.995 21.475 6 23.485 6 27.475V30.475H30V27.475C30 23.485 22.005 21.475 18 21.475Z" />
              </svg>
            </div>
            <div className="modal" id="modal">
              <div className="name__student">
                <h6>{user.ho_ten}</h6>
              </div>
              <div className="sign__out">
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            </div>
          </div>
        </header>
        <section className="main__body">
          <Outlet />
        </section>
      </main>

      <button className="btn__setting" onClick={() => setShowSetting(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
          <path
            fill="currentColor"
            d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"
          />
        </svg>
      </button>

      <SettingModal
        isOpen={showSetting}
        onClose={() => setShowSetting(false)}
      />
    </div>
  );
}

export default Menu;
