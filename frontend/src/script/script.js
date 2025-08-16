const accountclick = document.getElementById("user__icon");
const accountpopup = document.getElementById("modal");

accountclick.addEventListener("click", () => {
  accountpopup.style.display =
    accountpopup.style.display === "block" ? "none" : "block";
});

// Click bên ngoài thì ẩn accountpopup
document.addEventListener("click", (e) => {
  if (!accountclick.contains(e.target) && !accountpopup.contains(e.target)) {
    accountpopup.style.display = "none";
  }
});

const languageclick = document.getElementById("header__country");
const languagepopup = document.getElementById("language");

languageclick.addEventListener("click", () => {
  languagepopup.style.display =
    languagepopup.style.display === "flex" ? "none" : "flex";
});

// Click bên ngoài thì ẩn languagepopup
document.addEventListener("click", (e) => {
  if (!languageclick.contains(e.target) && !languagepopup.contains(e.target)) {
    languagepopup.style.display = "none";
  }
});

document.querySelectorAll(".navbar__link").forEach((link) => {
  link.addEventListener("click", () => {
    // Bỏ class active khỏi tất cả các link
    document
      .querySelectorAll(".navbar__link")
      .forEach((el) => el.classList.remove("active"));
    // Thêm class active vào link được click
    link.classList.add("active");
  });
});
