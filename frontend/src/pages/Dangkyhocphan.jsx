import { useState } from "react";
import HocPhanDaGhiDanh from "./Dangkyhocphan1"; // file bạn đã làm
import LopHocPhanTheoHocPhan from "./Dangkyhocphan2"; // file bạn đã làm

function DangKyHocPhan() {
  const [hocPhanDuocChon, setHocPhanDuocChon] = useState(null);

  return (
    <>
      {!hocPhanDuocChon ? (
        <HocPhanDaGhiDanh onChonHocPhan={setHocPhanDuocChon} />
      ) : (
        <LopHocPhanTheoHocPhan hocPhan={hocPhanDuocChon} />
      )}
    </>
  );
}

export default DangKyHocPhan;
