import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../css/reset.css";
import "../css/menu.css";

function DanhSachSinhVienLHP() {
  const { id } = useParams(); // id lớp học phần
  const [ds, setDs] = useState([]);
  const [maLop, setMaLop] = useState("");

  useEffect(() => {
    // API lấy danh sách sinh viên
    axios
      .get(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/lay-danh-sach-sinh-vien-lhp/${id}`
      )
      .then((res) => {
        const sorted = res.data.sort((a, b) =>
          a.ho_ten.localeCompare(b.ho_ten, "vi", { sensitivity: "base" })
        );
        setDs(sorted);
      });

    // API lấy mã lớp học phần (nếu có)
    axios
      .get(
        `https://dangkyhocphanhcmue-backend-ooad.onrender.com/api/chi-tiet-lop-hoc-phan/${id}`
      )
      .then((res) => {
        setMaLop(res.data?.ma_lop || "");
      })
      .catch((err) => {
        console.error("Không lấy được mã lớp học phần:", err);
      });
  }, [id]);

  return (
    <section className="main__body">
      <div className="body__title">
        <p className="body__title-text">
          DANH SÁCH LỚP HỌC PHẦN ({maLop || id})
        </p>
      </div>
      <div className="body__inner">
        <fieldset className="fieldset__thongke">
          <legend>Tổng: {ds.length} sinh viên</legend>

          <table className="table table_quanly">
            <thead>
              <tr>
                <th>STT</th>
                <th>MSSV</th>
                <th>Tên SV</th>
                <th>Khoa</th>
              </tr>
            </thead>
            <tbody>
              {ds.map((sv, index) => (
                <tr key={sv.id}>
                  <td>{index + 1}</td>
                  <td>{sv.ma_so_sinh_vien}</td>
                  <td>{sv.ho_ten}</td>
                  <td>{sv.ten_khoa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>
    </section>
  );
}

export default DanhSachSinhVienLHP;
