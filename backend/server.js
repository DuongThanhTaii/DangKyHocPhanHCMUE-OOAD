// =============================================
// COURSE REGISTRATION SYSTEM - BACKEND API
// Node.js + Express + PostgreSQL
// =============================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
// mới thêm
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith(".xlsx")) {
      return cb(new Error("Chỉ nhận file Excel (.xlsx)"));
    }
    cb(null, true);
  },
});

// mới thêm

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// DATABASE CONNECTION
// =============================================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
  family: 4,// bắt buộc với Supabase
});

pool.connect()
  .then(() => console.log("✅ Connected to database"))
  .catch(err => console.error("❌ Error connecting to database:", err));

// =============================================
// MIDDLEWARE
// =============================================

app.use(helmet()); // Security headers
app.use(morgan("combined")); // Logging
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// =============================================
// AUTH MIDDLEWARE
// =============================================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Get user info from database
    const userQuery = `
            SELECT u.*, tk.loai_tai_khoan 
            FROM users u 
            JOIN tai_khoan tk ON u.tai_khoan_id = tk.id 
            WHERE u.id = $1 AND tk.trang_thai_hoat_dong = true
        `;
    const userResult = await pool.query(userQuery, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Role-based authorization
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.loai_tai_khoan)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" }
  );
};

// =============================================
// AUTH ROUTES
// =============================================

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { tenDangNhap, matKhau } = req.body;

    if (!tenDangNhap || !matKhau) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Get user from database
    const query = `
            SELECT 
              u.*, 
              tk.mat_khau, 
              tk.loai_tai_khoan,
              sv.ma_so_sinh_vien
            FROM users u
            JOIN tai_khoan tk 
              ON u.tai_khoan_id = tk.id
            LEFT JOIN sinh_vien sv
              ON u.id = sv.id
            WHERE tk.ten_dang_nhap = $1
              AND tk.trang_thai_hoat_dong = true
        `;
    const result = await pool.query(query, [tenDangNhap]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const user = result.rows[0];
    const isValidPassword = await comparePassword(matKhau, user.mat_khau);
    // const isValidPassword = matKhau === user.mat_khau;

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const token = generateToken(user.id, user.loai_tai_khoan);

    // Remove password from response
    delete user.mat_khau;

    res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user info
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// =============================================
// SYSTEM MANAGEMENT ROUTES
// =============================================

// Get current system phase
app.get("/api/system/phase", authenticateToken, async (req, res) => {
  try {
    const query = "SELECT * FROM he_thong ORDER BY created_at DESC LIMIT 1";
    const result = await pool.query(query);
    res.json(result.rows[0] || { trang_thai_phase: 5 });
  } catch (error) {
    console.error("Get phase error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Change system phase (Only Phòng Đào Tạo)
app.put(
  "/api/system/phase",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      const { phase } = req.body;

      if (!phase || phase < 1 || phase > 5) {
        return res.status(400).json({ error: "Invalid phase number" });
      }

      const phaseNames = {
        1: "Tiền ghi danh",
        2: "Ghi danh",
        3: "Sắp xếp thời khóa biểu",
        4: "Đăng ký học phần",
        5: "Bình thường",
      };

      const query = `
            INSERT INTO he_thong (trang_thai_phase, ten_phase, ngay_bat_dau)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING *
        `;
      const result = await pool.query(query, [phase, phaseNames[phase]]);

      res.json({
        message: "System phase updated successfully",
        phase: result.rows[0],
      });
    } catch (error) {
      console.error("Update phase error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// API để lấy danh sách niên khóa và học kỳ
app.get(
  "/api/metadata/semesters",
  authenticateToken,
  authorize(["phong_dao_tao", "truong_khoa", "tro_ly_khoa"]),
  async (req, res) => {
    try {
      const result = await pool.query(`
                SELECT
                    hk.id AS hoc_ky_id,
                    hk.ma_hoc_ky,
                    hk.ten_hoc_ky,
                    nk.id AS nien_khoa_id,
                    nk.ten_nien_khoa,
                    hk.trang_thai_hien_tai
                FROM hoc_ky hk
                JOIN nien_khoa nk ON hk.id_nien_khoa = nk.id
                ORDER BY nk.ten_nien_khoa DESC, hk.ma_hoc_ky ASC
            `);
      res.json(result.rows);
    } catch (error) {
      console.error("Get semesters error:", error);
      res.status(500).json({ error: "Lỗi server nội bộ." });
    }
  }
);

// API MỚI để thiết lập niên khóa và học kỳ hiện tại
app.put(
  "/api/system/set-current-semester",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    const { ma_hoc_ky, ten_nien_khoa } = req.body;

    if (!ma_hoc_ky || !ten_nien_khoa) {
      return res
        .status(400)
        .json({ error: "Thiếu thông tin mã học kỳ hoặc niên khóa." });
    }

    // Bắt đầu một giao dịch để đảm bảo tính toàn vẹn dữ liệu
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Tìm ID của học kỳ muốn thiết lập
      const findIdQuery = `
        SELECT hk.id
        FROM hoc_ky hk
        JOIN nien_khoa nk ON hk.id_nien_khoa = nk.id
        WHERE hk.ma_hoc_ky = $1 AND nk.ten_nien_khoa = $2
      `;
      const result = await client.query(findIdQuery, [
        ma_hoc_ky,
        ten_nien_khoa,
      ]);
      const newHocKyId = result.rows[0]?.id;

      if (!newHocKyId) {
        throw new Error(
          `Học kỳ với mã ${ma_hoc_ky} và niên khóa ${ten_nien_khoa} không tồn tại.`
        );
      }

      // 2. Đặt lại tất cả các học kỳ về trạng thái FALSE
      const resetQuery = `
        UPDATE hoc_ky SET trang_thai_hien_tai = FALSE
      `;
      await client.query(resetQuery);

      // 3. Cập nhật học kỳ được chọn thành TRUE
      const updateQuery = `
        UPDATE hoc_ky SET trang_thai_hien_tai = TRUE WHERE id = $1
      `;
      await client.query(updateQuery, [newHocKyId]);

      // 4. Commit giao dịch
      await client.query("COMMIT");

      res.json({
        message: `Đã thiết lập Học kỳ ${ma_hoc_ky} - Niên khóa ${ten_nien_khoa} thành công.`,
      });
    } catch (error) {
      // Rollback giao dịch nếu có lỗi
      await client.query("ROLLBACK");
      console.error("Set current semester error:", error);
      res.status(500).json({ error: error.message || "Lỗi server nội bộ." });
    } finally {
      client.release();
    }
  }
);

app.get("/api/get-academic-terms", authenticateToken, async (req, res) => {
  try {
    const namHocQuery =
      "SELECT DISTINCT ten_nien_khoa FROM nien_khoa ORDER BY ten_nien_khoa DESC";
    const hocKyQuery =
      "SELECT DISTINCT ma_hoc_ky FROM hoc_ky ORDER BY ma_hoc_ky ASC";

    const namHocResult = await pool.query(namHocQuery);
    const hocKyResult = await pool.query(hocKyQuery);

    const namHocList = namHocResult.rows.map((row) => row.ten_nien_khoa);
    const hocKyList = hocKyResult.rows.map((row) => row.ma_hoc_ky);

    res.json({
      success: true,
      namHocList: namHocList,
      hocKyList: hocKyList,
    });
  } catch (error) {
    console.error("Error fetching academic terms:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// =============================================
// KHOA MANAGEMENT ROUTES
// =============================================

// Get all khoa
app.get("/api/khoa", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, ma_khoa, ten_khoa, ngay_thanh_lap 
      FROM khoa 
      WHERE trang_thai_hoat_dong = true 
      ORDER BY ten_khoa
    `;
    const result = await pool.query(query);

    // Luôn trả về mảng
    res.json(Array.isArray(result.rows) ? result.rows : []);
  } catch (error) {
    console.error("Get khoa error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new khoa (Only Phòng Đào Tạo)
app.post(
  "/api/khoa",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      const { maKhoa, tenKhoa, moTa, diaChi, soDienThoai, email } = req.body;

      if (!maKhoa || !tenKhoa) {
        return res
          .status(400)
          .json({ error: "Ma khoa and ten khoa are required" });
      }

      const query = `
            INSERT INTO khoa (ma_khoa, ten_khoa, ngay_thanh_lap)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
            RETURNING *
        `;
      const result = await pool.query(query, [maKhoa, tenKhoa]);

      res.status(201).json({
        message: "Khoa created successfully",
        khoa: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation
        return res.status(400).json({ error: "Ma khoa already exists" });
      }
      console.error("Create khoa error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all nganh by khoa_id
app.get("/api/khoa/:khoaId/nganh", authenticateToken, async (req, res) => {
  try {
    const { khoaId } = req.params;
    const query = `
      SELECT * FROM nganh_hoc
      WHERE khoa_id = $1
      ORDER BY ten_nganh
    `;
    const result = await pool.query(query, [khoaId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Get nganh by khoa error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================
// MON HOC MANAGEMENT ROUTES
// =============================================

// Get all mon hoc with filters
app.get("/api/mon-hoc", authenticateToken, async (req, res) => {
  try {
    const { khoaId, loaiMon, keyword, page = 1, limit = 50 } = req.query;

    let query = `
            SELECT mh.*, k.ten_khoa 
            FROM mon_hoc mh 
            JOIN khoa k ON mh.khoa_id = k.id 
            WHERE 1=1
        `;
    const params = [];
    let paramCount = 0;

    if (khoaId) {
      paramCount++;
      query += ` AND mh.khoa_id = $${paramCount}`;
      params.push(khoaId);
    }

    if (loaiMon) {
      paramCount++;
      query += ` AND mh.loai_mon = $${paramCount}`;
      params.push(loaiMon);
    }

    if (keyword) {
      paramCount++;
      query += ` AND (mh.ten_mon ILIKE $${paramCount} OR mh.ma_mon ILIKE $${paramCount})`;
      params.push(`%${keyword}%`);
    }

    query += ` ORDER BY mh.thu_tu_hoc, mh.ten_mon`;

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
            SELECT COUNT(*) 
            FROM mon_hoc mh 
            JOIN khoa k ON mh.khoa_id = k.id 
            WHERE 1=1
        `;
    const countParams = [];
    let countParamCount = 0;

    if (khoaId) {
      countParamCount++;
      countQuery += ` AND mh.khoa_id = $${countParamCount}`;
      countParams.push(khoaId);
    }

    if (loaiMon) {
      countParamCount++;
      countQuery += ` AND mh.loai_mon = $${countParamCount}`;
      countParams.push(loaiMon);
    }

    if (keyword) {
      countParamCount++;
      countQuery += ` AND (mh.ten_mon ILIKE $${countParamCount} OR mh.ma_mon ILIKE $${countParamCount})`;
      countParams.push(`%${keyword}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("Get mon hoc error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get mon hoc prerequisites
app.get(
  "/api/mon-hoc/:id/prerequisites",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
            SELECT mtq.*, mh.ma_mon, mh.ten_mon, mh.so_tin_chi
            FROM mon_tien_quyet mtq
            JOIN mon_hoc mh ON mtq.mon_tien_quyet_id = mh.id
            WHERE mtq.mon_hoc_id = $1
            ORDER BY mh.thu_tu_hoc
        `;
      const result = await pool.query(query, [id]);
      res.json(result.rows);
    } catch (error) {
      console.error("Get prerequisites error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create mon hoc (Khoa users only)
app.post(
  "/api/mon-hoc",
  authenticateToken,
  authorize(["truong_khoa", "tro_ly_khoa", "phong_dao_tao"]),
  async (req, res) => {
    try {
      const {
        maMon,
        tenMon,
        soTinChi,
        khoaId,
        loaiMon,
        moTa,
        laMonChung,
        thuTuHoc,
        prerequisites,
      } = req.body;

      if (!maMon || !tenMon || !soTinChi || !khoaId) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      // Check permission: user must belong to the khoa or be PDT
      if (req.user.loai_tai_khoan !== "phong_dao_tao") {
        const userKhoaQuery = `
                SELECT khoa_id FROM ${req.user.loai_tai_khoan} WHERE id = $1
            `;
        const userKhoaResult = await pool.query(userKhoaQuery, [req.user.id]);

        if (
          userKhoaResult.rows.length === 0 ||
          userKhoaResult.rows[0].khoa_id !== khoaId
        ) {
          return res
            .status(403)
            .json({ error: "Cannot create mon hoc for other khoa" });
        }
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Insert mon hoc
        const insertQuery = `
                INSERT INTO mon_hoc (ma_mon, ten_mon, so_tin_chi, khoa_id, loai_mon, mo_ta, la_mon_chung, thu_tu_hoc)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
        const result = await client.query(insertQuery, [
          maMon,
          tenMon,
          soTinChi,
          khoaId,
          loaiMon || "chuyen_nganh",
          moTa,
          laMonChung || false,
          thuTuHoc || 1,
        ]);

        const monHocId = result.rows[0].id;

        // Insert prerequisites if provided
        if (prerequisites && prerequisites.length > 0) {
          for (const prereq of prerequisites) {
            await client.query(
              "INSERT INTO mon_tien_quyet (mon_hoc_id, mon_tien_quyet_id, bat_buoc, ghi_chu) VALUES ($1, $2, $3, $4)",
              [monHocId, prereq.id, prereq.batBuoc || true, prereq.ghiChu]
            );
          }
        }

        await client.query("COMMIT");

        res.status(201).json({
          message: "Mon hoc created successfully",
          monHoc: result.rows[0],
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation
        return res.status(400).json({ error: "Ma mon already exists" });
      }
      console.error("Create mon hoc error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// DE XUAT HOC PHAN ROUTES
// =============================================

// Get de xuat hoc phan (with filters by role)
// app.get("/api/de-xuat-hoc-phan", authenticateToken, async (req, res) => {
//   try {
//     const { trangThai, idHocKy } = req.query;

//     let query = `
//             SELECT dxhp.*, mh.ma_mon, mh.ten_mon, mh.so_tin_chi, k.ten_khoa,
//                   u1.ho_ten as ten_tro_ly, u2.ho_ten as ten_truong_khoa, u3.ho_ten as ten_giang_vien
//             FROM de_xuat_hoc_phan dxhp
//             JOIN mon_hoc mh ON dxhp.mon_hoc_id = mh.id
//             JOIN khoa k ON mh.khoa_id = k.id
//             JOIN tro_ly_khoa tlk ON dxhp.tro_ly_khoa_id = tlk.id
//             JOIN users u1 ON tlk.id = u1.id
//             LEFT JOIN truong_khoa tk ON dxhp.truong_khoa_id = tk.id
//             LEFT JOIN users u2 ON tk.id = u2.id
//             LEFT JOIN giang_vien gv ON dxhp.giang_vien_id = gv.id
//             LEFT JOIN users u3 ON gv.id = u3.id
//             LEFT JOIN hoc_ky hk ON hk.ten_hoc_ky = dxhp.hoc_ky
//             WHERE 1=1

//         `;
//     const params = [];
//     let paramCount = 0;

//     // Filter by user role
//     if (req.user.loai_tai_khoan === "tro_ly_khoa") {
//       paramCount++;
//       query += ` AND dxhp.tro_ly_khoa_id = $${paramCount}`;
//       params.push(req.user.id);
//     } else if (req.user.loai_tai_khoan === "truong_khoa") {
//       paramCount++;
//       query += ` AND k.id IN (SELECT khoa_id FROM truong_khoa WHERE id = $${paramCount})`;
//       params.push(req.user.id);
//     }

//     if (idHocKy) {
//       paramCount++;
//       query += ` AND hk.id = $${paramCount}`;
//       params.push(idHocKy);
//     }

//     if (trangThai) {
//       paramCount++;
//       query += ` AND dxhp.trang_thai = $${paramCount}`;
//       params.push(trangThai);
//     }

//     query += ` ORDER BY dxhp.ngay_tao DESC`;

//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (error) {
//     console.error("Get de xuat error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// Đoạn code API đã được sửa
app.get("/api/de-xuat-hoc-phan", authenticateToken, async (req, res) => {
  try {
    const { trangThai, idHocKy } = req.query;
    let query = `
            SELECT dxhp.*, mh.ma_mon, mh.ten_mon, mh.so_tin_chi, k.ten_khoa,
                   u1.ho_ten as ten_tro_ly, u2.ho_ten as ten_truong_khoa, u3.ho_ten as ten_giang_vien
            FROM de_xuat_hoc_phan dxhp
            JOIN mon_hoc mh ON dxhp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            JOIN tro_ly_khoa tlk ON dxhp.tro_ly_khoa_id = tlk.id
            JOIN users u1 ON tlk.id = u1.id
            LEFT JOIN truong_khoa tk ON dxhp.truong_khoa_id = tk.id
            LEFT JOIN users u2 ON tk.id = u2.id
            LEFT JOIN giang_vien gv ON dxhp.giang_vien_id = gv.id
            LEFT JOIN users u3 ON gv.id = u3.id
            -- SỬA Ở ĐÂY: JOIN trực tiếp qua ID
            LEFT JOIN hoc_ky hk ON hk.id = dxhp.id_hoc_ky
            WHERE 1=1
 `;
    const params = [];
    let paramCount = 0; // ... (phần code còn lại giữ nguyên)

    // Phần lọc theo idHocKy sẽ hoạt động chính xác
    if (idHocKy) {
      paramCount++;
      query += ` AND hk.id = $${paramCount}`;
      params.push(idHocKy);
    }

    if (trangThai) {
      paramCount++;
      query += ` AND dxhp.trang_thai = $${paramCount}`;
      params.push(trangThai);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get de xuat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create de xuat hoc phan (Tro ly khoa only)
app.post(
  "/api/de-xuat-hoc-phan",
  authenticateToken,
  authorize(["tro_ly_khoa"]),
  async (req, res) => {
    try {
      const { monHocId, soLuongLop, giangVienId, hocKy, namHoc, ghiChu } =
        req.body;

      if (!monHocId || !soLuongLop || !hocKy || !namHoc) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      // Check if mon hoc belongs to user's khoa
      const checkQuery = `
            SELECT mh.* FROM mon_hoc mh
            JOIN tro_ly_khoa tlk ON mh.khoa_id = tlk.khoa_id
            WHERE mh.id = $1 AND tlk.id = $2
        `;
      const checkResult = await pool.query(checkQuery, [monHocId, req.user.id]);

      if (checkResult.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Cannot create de xuat for mon hoc from other khoa" });
      }

      const query = `
            INSERT INTO de_xuat_hoc_phan (mon_hoc_id, tro_ly_khoa_id, so_luong_lop, giang_vien_id, hoc_ky, nam_hoc, ghi_chu)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
      const result = await pool.query(query, [
        monHocId,
        req.user.id,
        soLuongLop,
        giangVienId,
        hocKy,
        namHoc,
        ghiChu,
      ]);

      res.status(201).json({
        message: "De xuat created successfully",
        deXuat: result.rows[0],
      });
    } catch (error) {
      console.error("Create de xuat error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Phiên bản 2
app.post(
  "/api/de-xuat-hoc-phan/multi",
  authenticateToken,
  authorize(["tro_ly_khoa"]),
  async (req, res) => {
    const { danhSachDeXuat } = req.body;
    const troLyKhoaId = req.user.id;

    if (
      !danhSachDeXuat ||
      !Array.isArray(danhSachDeXuat) ||
      danhSachDeXuat.length === 0
    ) {
      return res.status(400).json({
        error:
          "Dữ liệu đề xuất không hợp lệ. Vui lòng gửi một mảng không rỗng.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Bước 1: Tìm ID của học kỳ hiện tại
      const currentHocKyQuery =
        "SELECT id FROM hoc_ky WHERE trang_thai_hien_tai = TRUE";
      const currentHocKyResult = await client.query(currentHocKyQuery);
      const currentHocKyId = currentHocKyResult.rows[0]?.id;

      if (!currentHocKyId) {
        throw new Error(
          "Không có học kỳ nào đang được thiết lập là học kỳ hiện tại."
        );
      }

      const insertQuery = `
        INSERT INTO de_xuat_hoc_phan (
          mon_hoc_id,
          tro_ly_khoa_id,
          so_luong_lop,
          id_hoc_ky,
          giang_vien_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;

      for (const deXuat of danhSachDeXuat) {
        const { mon_hoc_id, so_luong_lop, giang_vien_id } = deXuat;
        if (!mon_hoc_id || !so_luong_lop) {
          throw new Error(
            "Thông tin đề xuất không đầy đủ (thiếu mon_hoc_id hoặc so_luong_lop)."
          );
        }

        const queryParams = [
          mon_hoc_id,
          troLyKhoaId,
          so_luong_lop,
          currentHocKyId, // Sử dụng ID học kỳ hiện tại
          giang_vien_id || null, // Chấp nhận giang_vien_id null
        ];

        await client.query(insertQuery, queryParams);
      }

      await client.query("COMMIT");
      res.json({ message: "Tạo đề xuất học phần thành công." });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create multi de_xuat error:", error);
      res.status(500).json({ error: error.message || "Lỗi server nội bộ." });
    } finally {
      client.release();
    }
  }
);

// Approve/Reject de xuat hoc phan
app.put(
  "/api/de-xuat-hoc-phan/:id/approve",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, ghiChu } = req.body; // action: 'approve' or 'reject'

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Get current de xuat
      const getCurrentQuery = "SELECT * FROM de_xuat_hoc_phan WHERE id = $1";
      const currentResult = await pool.query(getCurrentQuery, [id]);

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: "De xuat not found" });
      }

      const deXuat = currentResult.rows[0];
      let newStatus;
      let updateFields = [];
      let params = [id];
      let paramCount = 1;

      // Determine new status based on user role and current status
      if (req.user.loai_tai_khoan === "truong_khoa") {
        if (deXuat.trang_thai !== "cho_duyet") {
          return res
            .status(400)
            .json({ error: "Cannot approve at this stage" });
        }

        // Check if user is truong khoa of the correct khoa
        const checkQuery = `
                SELECT tk.* FROM truong_khoa tk
                JOIN khoa k ON tk.khoa_id = k.id
                JOIN mon_hoc mh ON mh.khoa_id = k.id
                WHERE mh.id = $1 AND tk.id = $2
            `;
        const checkResult = await pool.query(checkQuery, [
          deXuat.mon_hoc_id,
          req.user.id,
        ]);

        if (checkResult.rows.length === 0) {
          return res
            .status(403)
            .json({ error: "Not authorized for this khoa" });
        }

        newStatus = action === "approve" ? "truong_khoa_duyet" : "tu_choi";
        updateFields.push("truong_khoa_id");
        paramCount++;
        params.push(req.user.id);
      } else if (req.user.loai_tai_khoan === "phong_dao_tao") {
        if (deXuat.trang_thai !== "truong_khoa_duyet") {
          return res
            .status(400)
            .json({ error: "Cannot approve at this stage" });
        }
        newStatus = action === "approve" ? "pdt_duyet" : "tu_choi";
      } else {
        return res.status(403).json({ error: "Not authorized to approve" });
      }

      // Build update query
      updateFields.push("trang_thai", "ngay_duyet");
      paramCount++;
      params.push(newStatus);
      paramCount++;
      params.push(new Date());

      if (ghiChu) {
        updateFields.push("ghi_chu");
        paramCount++;
        params.push(ghiChu);
      }

      const setClause = updateFields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(", ");

      const updateQuery = `
            UPDATE de_xuat_hoc_phan 
            SET ${setClause}
            WHERE id = $1 
            RETURNING *
        `;

      const result = await pool.query(updateQuery, params);

      // If PDT approved, create hoc phan
      if (newStatus === "pdt_duyet") {
        const createHocPhanQuery = `
                INSERT INTO hoc_phan (mon_hoc_id, ten_hoc_phan, so_lop, trang_thai_mo, id_hoc_ky)
                SELECT
                    mon_hoc_id,
                    (SELECT ten_mon FROM mon_hoc WHERE id = mon_hoc_id),
                    so_luong_lop,
                    TRUE,
                    (SELECT id FROM hoc_ky WHERE trang_thai_hien_tai = TRUE)  -- Thêm subquery này
                FROM de_xuat_hoc_phan
                WHERE id = $1
                RETURNING *;

            `;
        await pool.query(createHocPhanQuery, [id]);
      }

      res.json({
        message: `De xuat ${action}d successfully`,
        deXuat: result.rows[0],
      });
    } catch (error) {
      console.error("Approve de xuat error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// Lấy danh sách giảng viên thuộc Khoa của môn học
// =============================================
app.get(
  "/api/giang-vien/mon-hoc/:monHocId",
  authenticateToken,
  authorize(["tro_ly_khoa"]),
  async (req, res) => {
    try {
      const { monHocId } = req.params;

      const query = `
        SELECT gv.id, u.ho_ten
        FROM mon_hoc mh
        JOIN giang_vien gv ON mh.khoa_id = gv.khoa_id
        JOIN users u ON gv.id = u.id
        WHERE mh.id = $1
      `;

      const result = await pool.query(query, [monHocId]);

      res.json(result.rows); // [{ id: ..., ho_ten: ... }]
    } catch (error) {
      console.error("Lỗi lấy danh sách giảng viên:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Trưởng khoa / PĐT xem danh sách đề xuất phù hợp
app.get("/api/de-xuat-hoc-phan", authenticateToken, async (req, res) => {
  const user = req.user;
  let query = `
    SELECT dx.*, mh.ten_mon, mh.ma_mon, gv.ho_ten AS ten_giang_vien
    FROM de_xuat_hoc_phan dx
    JOIN mon_hoc mh ON dx.mon_hoc_id = mh.id
    LEFT JOIN giang_vien gv ON dx.giang_vien_id = gv.id
  `;

  let rows;

  try {
    if (user.loai_tai_khoan === "truong_khoa") {
      query += ` WHERE mh.khoa_id = $1 AND dx.trang_thai = 'cho_duyet'`;
      rows = await db.any(query, [user.khoa_id]);
    } else if (user.loai_tai_khoan === "phong_dao_tao") {
      query += ` WHERE dx.trang_thai IN ('truong_khoa_duyet', 'pdt_duyet', 'tu_choi')`;
      rows = await db.any(query);
    } else if (user.loai_tai_khoan === "tro_ly_khoa") {
      query += ` WHERE dx.tro_ly_khoa_id = $1`;
      rows = await db.any(query, [user.id]);
    } else {
      return res.status(403).json({ error: "Không có quyền truy cập" });
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

app.post(
  "/api/de-xuat-hoc-phan/bulk-update",
  authenticateToken,
  async (req, res) => {
    const nguoiDuyet = req.user;
    const { ids, hanhDong } = req.body; // mảng id + hành động: "duyet" hoặc "tu_choi"

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Danh sách đề xuất không hợp lệ" });
    }

    let trangThaiHienTai, trangThaiMoi;
    if (nguoiDuyet.loai_tai_khoan === "truong_khoa") {
      trangThaiHienTai = "cho_duyet";
      trangThaiMoi = hanhDong === "duyet" ? "truong_khoa_duyet" : "tu_choi";
    } else if (nguoiDuyet.loai_tai_khoan === "phong_dao_tao") {
      trangThaiHienTai = "truong_khoa_duyet";
      trangThaiMoi = hanhDong === "duyet" ? "pdt_duyet" : "tu_choi";
    } else {
      return res.status(403).json({ error: "Không có quyền" });
    }

    try {
      const result = await db.result(
        `UPDATE de_xuat_hoc_phan 
       SET trang_thai = $1, ngay_duyet = CURRENT_TIMESTAMP,
           truong_khoa_id = CASE 
             WHEN $3 = 'truong_khoa' THEN $2 
             ELSE truong_khoa_id 
           END
       WHERE id = ANY($4) AND trang_thai = $5`,
        [
          trangThaiMoi,
          nguoiDuyet.id,
          nguoiDuyet.loai_tai_khoan,
          ids,
          trangThaiHienTai,
        ]
      );

      res.json({ message: "Cập nhật thành công", rowCount: result.rowCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// =============================================
// HOC PHAN ROUTES
// =============================================

// Get hoc phan (approved ones only)
app.get("/api/hoc-phan", authenticateToken, async (req, res) => {
  try {
    const { hocKy, namHoc, khoaId } = req.query;

    let query = `
            SELECT hp.*, mh.ma_mon, mh.ten_mon, mh.so_tin_chi, k.ten_khoa
            FROM hoc_phan hp
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            WHERE hp.trang_thai_mo = true
        `;
    const params = [];
    let paramCount = 0;

    if (hocKy) {
      paramCount++;
      query += ` AND hp.hoc_ky = $${paramCount}`;
      params.push(hocKy);
    }

    if (namHoc) {
      paramCount++;
      query += ` AND hp.nam_hoc = $${paramCount}`;
      params.push(namHoc);
    }

    if (khoaId) {
      paramCount++;
      query += ` AND mh.khoa_id = $${paramCount}`;
      params.push(khoaId);
    }

    query += ` ORDER BY k.ten_khoa, mh.ten_mon`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get hoc phan error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get(
  "/api/hoc-phan/co-the-ghi-danh",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      // Check current phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 2) {
        return res.status(400).json({ error: "Chưa đến giai đoạn ghi danh" });
      }

      // --- Sửa logic lấy Học kỳ và Niên khóa hiện tại ---
      // Lấy học kỳ hiện tại từ bảng hoc_ky
      const currentAcademicStateQuery = `
          SELECT hk.ma_hoc_ky AS hoc_ky_hien_tai, nk.ten_nien_khoa AS nien_khoa_hien_tai
          FROM hoc_ky hk
          JOIN nien_khoa nk ON hk.id_nien_khoa = nk.id
          WHERE hk.trang_thai_hien_tai = true;
      `;
      const academicStateResult = await pool.query(currentAcademicStateQuery);
      const currentAcademicState = academicStateResult.rows[0];

      if (!currentAcademicState) {
        return res
          .status(400)
          .json({ error: "Không thể xác định học kỳ và niên khóa hiện tại" });
      }
      // --- Kết thúc phần đã sửa ---

      const query = `
        SELECT
          hp.id,
          mh.ma_mon,
          mh.ten_mon,
          mh.so_tin_chi,
          mh.loai_mon,
          k.ten_khoa,
          u.ho_ten AS ten_giang_vien,
          CASE WHEN gd.id IS NOT NULL THEN TRUE ELSE FALSE END AS da_ghi_danh
        FROM hoc_phan hp
        JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
        JOIN khoa k ON mh.khoa_id = k.id
        LEFT JOIN de_xuat_hoc_phan dx ON dx.mon_hoc_id = mh.id
        LEFT JOIN giang_vien gv ON dx.giang_vien_id = gv.id
        LEFT JOIN users u ON gv.id = u.id
        JOIN hoc_ky h_k ON hp.id_hoc_ky = h_k.id
        JOIN nien_khoa n_k ON h_k.id_nien_khoa = n_k.id
        LEFT JOIN ghi_danh gd ON gd.hoc_phan_id = hp.id AND gd.sinh_vien_id = $3 AND gd.trang_thai = 'da_ghi_danh'
        WHERE
          hp.trang_thai_mo = true
          AND h_k.ma_hoc_ky = $1
          AND n_k.ten_nien_khoa = $2
        ORDER BY k.ten_khoa, mh.ten_mon;
      `;

      const result = await pool.query(query, [
        currentAcademicState.hoc_ky_hien_tai,
        currentAcademicState.nien_khoa_hien_tai,
        req.user.id,
      ]);
      res.json(result.rows);
    } catch (error) {
      console.error("Get hoc phan co the ghi danh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// GHI DANH ROUTES (Phase 2)
// =============================================

// Get sinh vien's ghi danh
app.get(
  "/api/ghi-danh/my",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const query = `
            SELECT gd.*,gd.hoc_phan_id, hp.ten_hoc_phan, mh.ma_mon, mh.ten_mon, mh.so_tin_chi, k.ten_khoa,
                  u.ho_ten AS ten_giang_vien
            FROM ghi_danh gd
            JOIN hoc_phan hp ON gd.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            LEFT JOIN de_xuat_hoc_phan dx ON dx.mon_hoc_id = mh.id
            LEFT JOIN giang_vien gv ON dx.giang_vien_id = gv.id
            LEFT JOIN users u ON gv.id = u.id
            WHERE gd.sinh_vien_id = $1 AND gd.trang_thai = 'da_ghi_danh'
            ORDER BY k.ten_khoa, mh.ten_mon
        `;
      const result = await pool.query(query, [req.user.id]);
      res.json(result.rows);
    } catch (error) {
      console.error("Get my ghi danh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Ghi danh hoc phan
app.post(
  "/api/ghi-danh",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 2) {
        return res
          .status(400)
          .json({ error: "Ghi danh is not available in current phase" });
      }

      const { hocPhanIds } = req.body;

      if (!hocPhanIds || !Array.isArray(hocPhanIds)) {
        return res.status(400).json({ error: "Hoc phan IDs required" });
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const results = [];

        for (const hocPhanId of hocPhanIds) {
          // Check if already registered
          const existQuery = `
                    SELECT id FROM ghi_danh 
                    WHERE sinh_vien_id = $1 AND hoc_phan_id = $2
                `;
          const existResult = await client.query(existQuery, [
            req.user.id,
            hocPhanId,
          ]);

          if (existResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
                        UPDATE ghi_danh 
                        SET trang_thai = 'da_ghi_danh', ngay_ghi_danh = CURRENT_TIMESTAMP
                        WHERE sinh_vien_id = $1 AND hoc_phan_id = $2
                        RETURNING *
                    `;
            const updateResult = await client.query(updateQuery, [
              req.user.id,
              hocPhanId,
            ]);
            results.push(updateResult.rows[0]);
          } else {
            // Insert new record
            const insertQuery = `
                        INSERT INTO ghi_danh (sinh_vien_id, hoc_phan_id)
                        VALUES ($1, $2)
                        RETURNING *
                    `;
            const insertResult = await client.query(insertQuery, [
              req.user.id,
              hocPhanId,
            ]);
            results.push(insertResult.rows[0]);
          }
        }

        await client.query("COMMIT");

        res.json({
          message: "Ghi danh successful",
          ghiDanh: results,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Ghi danh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Huy ghi danh
app.delete(
  "/api/ghi-danh/:hocPhanId",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const { hocPhanId } = req.params;

      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 2) {
        return res
          .status(400)
          .json({ error: "Cannot cancel ghi danh in current phase" });
      }

      const query = `
            UPDATE ghi_danh 
            SET trang_thai = 'da_huy'
            WHERE sinh_vien_id = $1 AND hoc_phan_id = $2
            RETURNING *
        `;
      const result = await pool.query(query, [req.user.id, hocPhanId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Ghi danh not found" });
      }

      res.json({
        message: "Ghi danh cancelled successfully",
        ghiDanh: result.rows[0],
      });
    } catch (error) {
      console.error("Cancel ghi danh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// LOP HOC PHAN ROUTES (Phase 3 - Sap xep TKB)
// =============================================

// Get lop hoc phan
app.get("/api/lop-hoc-phan", authenticateToken, async (req, res) => {
  try {
    const { hocPhanId, hocKy, namHoc } = req.query;

    let query = `
            SELECT lhp.*, hp.ten_hoc_phan, mh.ma_mon, mh.ten_mon, mh.so_tin_chi,
                   u.ho_ten as ten_giang_vien, k.ten_khoa
            FROM lop_hoc_phan lhp
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            LEFT JOIN giang_vien gv ON lhp.giang_vien_id = gv.id
            LEFT JOIN users u ON gv.id = u.id
            WHERE 1=1
        `;
    const params = [];
    let paramCount = 0;

    if (hocPhanId) {
      paramCount++;
      query += ` AND lhp.hoc_phan_id = ${paramCount}`;
      params.push(hocPhanId);
    }

    if (hocKy) {
      paramCount++;
      query += ` AND hp.hoc_ky = ${paramCount}`;
      params.push(hocKy);
    }

    if (namHoc) {
      paramCount++;
      query += ` AND hp.nam_hoc = ${paramCount}`;
      params.push(namHoc);
    }

    query += ` ORDER BY k.ten_khoa, mh.ten_mon, lhp.ma_lop`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get lop hoc phan error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create lop hoc phan (PDT only, Phase 3)
app.post(
  "/api/lop-hoc-phan",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 3) {
        return res
          .status(400)
          .json({ error: "Can only create lop hoc phan in phase 3" });
      }

      const {
        hocPhanId,
        maLop,
        giangVienId,
        soLuongToiDa,
        phongHoc,
        ngayHoc,
        tietBatDau,
        tietKetThuc,
        gioHoc,
      } = req.body;

      if (!hocPhanId || !maLop || !soLuongToiDa) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      const query = `
            INSERT INTO lop_hoc_phan (
                hoc_phan_id, ma_lop, giang_vien_id, so_luong_toi_da, 
                phong_hoc, ngay_hoc, tiet_bat_dau, tiet_ket_thuc, gio_hoc
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
      const result = await pool.query(query, [
        hocPhanId,
        maLop,
        giangVienId,
        soLuongToiDa,
        phongHoc,
        ngayHoc,
        tietBatDau,
        tietKetThuc,
        gioHoc,
      ]);

      res.status(201).json({
        message: "Lop hoc phan created successfully",
        lopHocPhan: result.rows[0],
      });
    } catch (error) {
      console.error("Create lop hoc phan error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update lop hoc phan schedule (PDT only)
app.put(
  "/api/lop-hoc-phan/:id",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { phongHoc, ngayHoc, tietBatDau, tietKetThuc, gioHoc } = req.body;

      const query = `
            UPDATE lop_hoc_phan 
            SET phong_hoc = $1, ngay_hoc = $2, tiet_bat_dau = $3, 
                tiet_ket_thuc = $4, gio_hoc = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;
      const result = await pool.query(query, [
        phongHoc,
        ngayHoc,
        tietBatDau,
        tietKetThuc,
        gioHoc,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lop hoc phan not found" });
      }

      res.json({
        message: "Schedule updated successfully",
        lopHocPhan: result.rows[0],
      });
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ================================
// 1. API: Lấy danh sách học phần và số SV ghi danh
// ================================
app.get(
  "/api/pdt/tao-lop-hoc-phan/danh-sach",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      const { idHocKy } = req.query;

      if (!idHocKy) {
        return res.status(400).json({ error: "Tham số idHocKy là bắt buộc." });
      }

      const query = `
        SELECT hp.id AS hoc_phan_id, mh.ma_mon, mh.ten_mon, mh.so_tin_chi,
                COUNT(gd.id) AS so_luong_sv,
                u.ho_ten AS ten_giang_vien,
                gv.id AS giang_vien_id,
                mh.khoa_id
        FROM hoc_phan hp
        JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
        LEFT JOIN ghi_danh gd ON gd.hoc_phan_id = hp.id AND gd.trang_thai = 'da_ghi_danh'
        LEFT JOIN de_xuat_hoc_phan dx ON dx.mon_hoc_id = mh.id AND dx.trang_thai = 'pdt_duyet'
        LEFT JOIN giang_vien gv ON dx.giang_vien_id = gv.id
        LEFT JOIN users u ON gv.id = u.id
        WHERE hp.trang_thai_mo = true AND hp.id_hoc_ky = $1
        GROUP BY hp.id, mh.ma_mon, mh.ten_mon, mh.so_tin_chi, u.ho_ten, gv.id, mh.khoa_id
        ORDER BY mh.ten_mon
      `;

      // Truyền idHocKy vào mảng tham số của pool.query
      const result = await pool.query(query, [idHocKy]);
      res.json(result.rows);
    } catch (error) {
      console.error("Lỗi lấy danh sách học phần ghi danh:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  }
);

// ================================
// 2. API: Xác nhận tạo lớp học phần
// ================================

app.post(
  "/api/pdt/tao-lop-hoc-phan",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    const { danhSachLop } = req.body;

    if (!Array.isArray(danhSachLop)) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const item of danhSachLop) {
        const {
          hocPhanId,
          giangVienId,
          soLuongLop,
          tietBatDau,
          tietKetThuc,
          soTietMoiBuoi,
          tongSoTiet,
          ngayBatDau,
          ngayKetThuc,
          ngayHoc,
          phongHoc,
        } = item;

        // Lấy mã môn học từ bảng mon_hoc và số lớp đã có từ hoc_phan
        const hpRes = await client.query(
          `SELECT T2.ma_mon, T1.so_lop
           FROM hoc_phan AS T1
           JOIN mon_hoc AS T2 ON T1.mon_hoc_id = T2.id
           WHERE T1.id = $1`,
          [hocPhanId]
        );
        if (hpRes.rowCount === 0) {
          throw new Error(`Không tìm thấy học phần với id ${hocPhanId}`);
        }
        const maMon = hpRes.rows[0].ma_mon;
        let soLopDaCo = hpRes.rows[0].so_lop || 0;

        // Tạo lớp mới
        for (let i = 1; i <= soLuongLop; i++) {
          soLopDaCo += 1;
          const soThuTu = String(soLopDaCo).padStart(2, "0"); // 01, 02...
          const maLop = `${maMon}${soThuTu}`;

          await client.query(
            `INSERT INTO lop_hoc_phan (
              hoc_phan_id, ma_lop, tiet_bat_dau, tiet_ket_thuc, so_tiet_moi_buoi,
              tong_so_tiet, ngay_bat_dau, ngay_ket_thuc, ngay_hoc, phong_hoc, giang_vien_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              hocPhanId,
              maLop,
              tietBatDau,
              tietKetThuc,
              soTietMoiBuoi,
              tongSoTiet,
              ngayBatDau,
              ngayKetThuc,
              ngayHoc || null,
              phongHoc || null,
              giangVienId || null,
            ]
          );
        }

        // Cập nhật số lớp trong bảng hoc_phan
        await client.query(
          `UPDATE hoc_phan 
           SET so_lop = $1 
           WHERE id = $2`,
          [soLopDaCo, hocPhanId]
        );
      }

      await client.query("COMMIT");
      res.json({ message: "Tạo lớp học phần thành công" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Lỗi tạo lớp học phần:", error);
      res.status(500).json({ error: "Lỗi server" });
    } finally {
      client.release();
    }
  }
);

// =============================================
// DANG KY HOC PHAN ROUTES (Phase 4)
// =============================================

app.get(
  "/api/dang-ky/available",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      console.log("req.user.id:", req.user.id);
      console.log("currentPhase:", currentPhase);

      if (currentPhase !== 4) {
        return res
          .status(400)
          .json({ error: "Registration not available in current phase" });
      }

      // --- Bổ sung logic lấy Học kỳ và Niên khóa hiện tại ---
      // Lấy học kỳ hiện tại từ bảng hoc_ky
      const currentAcademicStateQuery = `
          SELECT hk.id AS hoc_ky_id, nk.id AS nien_khoa_id
          FROM hoc_ky hk
          JOIN nien_khoa nk ON hk.id_nien_khoa = nk.id
          WHERE hk.trang_thai_hien_tai = true;
      `;
      const academicStateResult = await pool.query(currentAcademicStateQuery);
      const currentAcademicState = academicStateResult.rows[0];

      if (!currentAcademicState) {
        return res
          .status(400)
          .json({ error: "Không thể xác định học kỳ và niên khóa hiện tại" });
      }
      // --- Kết thúc phần bổ sung ---

      // Get lop hoc phan from subjects student registered for in the current academic state
      const query = `
        SELECT DISTINCT
          lhp.*,
          hp.ten_hoc_phan,
          mh.ma_mon,
          mh.ten_mon,
          mh.so_tin_chi,
          mh.loai_mon,
          u.ho_ten AS ten_giang_vien,
          k.ten_khoa,
          CASE WHEN dkhp.id IS NOT NULL THEN true ELSE false END AS da_dang_ky
        FROM lop_hoc_phan lhp
        JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
        JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
        JOIN khoa k ON mh.khoa_id = k.id
        JOIN ghi_danh gd ON gd.hoc_phan_id = hp.id
        LEFT JOIN giang_vien gv ON lhp.giang_vien_id = gv.id
        LEFT JOIN users u ON gv.id = u.id
        LEFT JOIN dang_ky_hoc_phan dkhp ON dkhp.lop_hoc_phan_id = lhp.id AND dkhp.sinh_vien_id = $1 AND dkhp.trang_thai = 'da_dang_ky'
        WHERE
          gd.sinh_vien_id = $1
          AND gd.trang_thai = 'da_ghi_danh'
          AND lhp.so_luong_hien_tai < lhp.so_luong_toi_da
          AND hp.id_hoc_ky = $2
        ORDER BY
          k.ten_khoa,
          mh.ten_mon,
          lhp.ma_lop;
      `;
      const result = await pool.query(query, [
        req.user.id,
        currentAcademicState.hoc_ky_id,
      ]);
      res.json(result.rows);
    } catch (error) {
      console.error("Get available lop error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get sinh vien's current registrations
app.get(
  "/api/dang-ky/my",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const query = `
            SELECT dkhp.*, 
                  lhp.ma_lop, lhp.phong_hoc, lhp.ngay_hoc, lhp.gio_hoc,
                  lhp.tiet_bat_dau, lhp.tiet_ket_thuc, lhp.ngay_bat_dau, lhp.ngay_ket_thuc,
                  hp.ten_hoc_phan, mh.ma_mon, mh.ten_mon, mh.so_tin_chi,
                  u.ho_ten as ten_giang_vien, k.ten_khoa

            FROM dang_ky_hoc_phan dkhp
            JOIN lop_hoc_phan lhp ON dkhp.lop_hoc_phan_id = lhp.id
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            LEFT JOIN giang_vien gv ON lhp.giang_vien_id = gv.id
            LEFT JOIN users u ON gv.id = u.id
            WHERE dkhp.sinh_vien_id = $1 AND dkhp.trang_thai = 'da_dang_ky'
            ORDER BY k.ten_khoa, mh.ten_mon
        `;
      const result = await pool.query(query, [req.user.id]);
      res.json(result.rows);
    } catch (error) {
      console.error("Get my registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Register for lop hoc phan
app.post(
  "/api/dang-ky",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 4) {
        return res
          .status(400)
          .json({ error: "Registration not available in current phase" });
      }

      const { lopHocPhanId } = req.body;

      if (!lopHocPhanId) {
        return res.status(400).json({ error: "Lop hoc phan ID required" });
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Check if student registered for the hoc phan
        const checkGhiDanhQuery = `
                SELECT gd.* FROM ghi_danh gd
                JOIN lop_hoc_phan lhp ON gd.hoc_phan_id = lhp.hoc_phan_id
                WHERE gd.sinh_vien_id = $1 AND lhp.id = $2 AND gd.trang_thai = 'da_ghi_danh'
            `;
        const ghiDanhResult = await client.query(checkGhiDanhQuery, [
          req.user.id,
          lopHocPhanId,
        ]);

        if (ghiDanhResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "Must register for hoc phan first" });
        }

        // Check capacity
        const capacityQuery = `
                SELECT so_luong_hien_tai, so_luong_toi_da 
                FROM lop_hoc_phan 
                WHERE id = $1
            `;
        const capacityResult = await client.query(capacityQuery, [
          lopHocPhanId,
        ]);

        if (capacityResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Lop hoc phan not found" });
        }

        const { so_luong_hien_tai, so_luong_toi_da } = capacityResult.rows[0];

        if (so_luong_hien_tai >= so_luong_toi_da) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Lop hoc phan is full" });
        }

        // Check for schedule conflicts
        const conflictQuery = `
                SELECT COUNT(*) as conflicts
                FROM dang_ky_hoc_phan dkhp1
                JOIN lop_hoc_phan lhp1 ON dkhp1.lop_hoc_phan_id = lhp1.id
                JOIN lop_hoc_phan lhp2 ON lhp2.id = $2
                WHERE dkhp1.sinh_vien_id = $1 AND dkhp1.trang_thai = 'da_dang_ky'
                    AND lhp1.ngay_hoc = lhp2.ngay_hoc
                    AND (
                        (lhp1.tiet_bat_dau <= lhp2.tiet_ket_thuc AND lhp1.tiet_ket_thuc >= lhp2.tiet_bat_dau)
                    )
            `;
        const conflictResult = await client.query(conflictQuery, [
          req.user.id,
          lopHocPhanId,
        ]);
        const hasConflict = parseInt(conflictResult.rows[0].conflicts) > 0;

        // Check if already registered
        const existQuery = `
                SELECT id FROM dang_ky_hoc_phan 
                WHERE sinh_vien_id = $1 AND lop_hoc_phan_id = $2
            `;
        const existResult = await client.query(existQuery, [
          req.user.id,
          lopHocPhanId,
        ]);

        let result;
        if (existResult.rows.length > 0) {
          // Update existing record
          const updateQuery = `
                    UPDATE dang_ky_hoc_phan 
                    SET trang_thai = 'da_dang_ky', ngay_dang_ky = CURRENT_TIMESTAMP, co_xung_dot = $3
                    WHERE sinh_vien_id = $1 AND lop_hoc_phan_id = $2
                    RETURNING *
                `;
          result = await client.query(updateQuery, [
            req.user.id,
            lopHocPhanId,
            hasConflict,
          ]);
        } else {
          // Insert new record
          const insertQuery = `
                    INSERT INTO dang_ky_hoc_phan (sinh_vien_id, lop_hoc_phan_id, co_xung_dot)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `;
          result = await client.query(insertQuery, [
            req.user.id,
            lopHocPhanId,
            hasConflict,
          ]);
        }

        await client.query("COMMIT");

        res.json({
          message: "Registration successful",
          dangKy: result.rows[0],
          hasConflict,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Cancel registration
app.delete(
  "/api/dang-ky/:lopHocPhanId",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const { lopHocPhanId } = req.params;

      // Check system phase
      const phaseQuery =
        "SELECT trang_thai_phase FROM he_thong ORDER BY created_at DESC LIMIT 1";
      const phaseResult = await pool.query(phaseQuery);
      const currentPhase = phaseResult.rows[0]?.trang_thai_phase || 1;

      if (currentPhase !== 4) {
        return res
          .status(400)
          .json({ error: "Cannot cancel registration in current phase" });
      }

      const query = `
            UPDATE dang_ky_hoc_phan 
            SET trang_thai = 'da_huy'
            WHERE sinh_vien_id = $1 AND lop_hoc_phan_id = $2
            RETURNING *
        `;
      const result = await pool.query(query, [req.user.id, lopHocPhanId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Registration not found" });
      }

      res.json({
        message: "Registration cancelled successfully",
        dangKy: result.rows[0],
      });
    } catch (error) {
      console.error("Cancel registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// THOI KHOA BIEU ROUTES
// =============================================

// Get sinh vien's schedule
app.get(
  "/api/thoi-khoa-bieu",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const { hocKy, namHoc } = req.query;

      let query = `
            SELECT dkhp.*, lhp.ma_lop, lhp.phong_hoc, lhp.ngay_hoc, lhp.tiet_bat_dau, 
                   lhp.tiet_ket_thuc, lhp.gio_hoc, hp.ten_hoc_phan, mh.ma_mon, mh.ten_mon, 
                   mh.so_tin_chi, u.ho_ten as ten_giang_vien, k.ten_khoa
            FROM dang_ky_hoc_phan dkhp
            JOIN lop_hoc_phan lhp ON dkhp.lop_hoc_phan_id = lhp.id
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            LEFT JOIN giang_vien gv ON lhp.giang_vien_id = gv.id
            LEFT JOIN users u ON gv.id = u.id
            WHERE dkhp.sinh_vien_id = $1 AND dkhp.trang_thai = 'da_dang_ky'
        `;
      const params = [req.user.id];
      let paramCount = 1;

      if (hocKy) {
        paramCount++;
        query += ` AND hp.hoc_ky = ${paramCount}`;
        params.push(hocKy);
      }

      if (namHoc) {
        paramCount++;
        query += ` AND hp.nam_hoc = ${paramCount}`;
        params.push(namHoc);
      }

      query += ` ORDER BY lhp.ngay_hoc, lhp.tiet_bat_dau`;

      const result = await pool.query(query, params);

      // Group by day of week
      const schedule = {};
      result.rows.forEach((row) => {
        if (!schedule[row.ngay_hoc]) {
          schedule[row.ngay_hoc] = [];
        }
        schedule[row.ngay_hoc].push(row);
      });

      res.json({
        schedule,
        totalCredits: result.rows.reduce((sum, row) => sum + row.so_tin_chi, 0),
        totalSubjects: result.rows.length,
      });
    } catch (error) {
      console.error("Get schedule error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// HOC PHI ROUTES
// =============================================

// Get sinh vien's tuition
app.get(
  "/api/hoc-phi",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const { hocKy, namHoc } = req.query;

      // Calculate tuition based on registered courses
      let query = `
            SELECT SUM(mh.so_tin_chi * 500000) as tong_hoc_phi, 
                   COUNT(*) as so_mon_hoc,
                   SUM(mh.so_tin_chi) as tong_tin_chi,
                   hp.hoc_ky, hp.nam_hoc
            FROM dang_ky_hoc_phan dkhp
            JOIN lop_hoc_phan lhp ON dkhp.lop_hoc_phan_id = lhp.id
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            WHERE dkhp.sinh_vien_id = $1 AND dkhp.trang_thai = 'da_dang_ky'
        `;
      const params = [req.user.id];
      let paramCount = 1;

      if (hocKy) {
        paramCount++;
        query += ` AND hp.hoc_ky = ${paramCount}`;
        params.push(hocKy);
      }

      if (namHoc) {
        paramCount++;
        query += ` AND hp.nam_hoc = ${paramCount}`;
        params.push(namHoc);
      }

      query += ` GROUP BY hp.hoc_ky, hp.nam_hoc`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.json({
          tongHocPhi: 0,
          soMonHoc: 0,
          tongTinChi: 0,
          chiTiet: [],
        });
      }

      // Get detailed breakdown
      let detailQuery = `
            SELECT mh.ma_mon, mh.ten_mon, mh.so_tin_chi, 
                   (mh.so_tin_chi * 500000) as hoc_phi_mon,
                   lhp.ma_lop, k.ten_khoa
            FROM dang_ky_hoc_phan dkhp
            JOIN lop_hoc_phan lhp ON dkhp.lop_hoc_phan_id = lhp.id
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            JOIN khoa k ON mh.khoa_id = k.id
            WHERE dkhp.sinh_vien_id = $1 AND dkhp.trang_thai = 'da_dang_ky'
        `;
      const detailParams = [req.user.id];
      let detailParamCount = 1;

      if (hocKy) {
        detailParamCount++;
        detailQuery += ` AND hp.hoc_ky = ${detailParamCount}`;
        detailParams.push(hocKy);
      }

      if (namHoc) {
        detailParamCount++;
        detailQuery += ` AND hp.nam_hoc = ${detailParamCount}`;
        detailParams.push(namHoc);
      }

      detailQuery += ` ORDER BY k.ten_khoa, mh.ten_mon`;

      const detailResult = await pool.query(detailQuery, detailParams);

      res.json({
        ...result.rows[0],
        chiTiet: detailResult.rows,
      });
    } catch (error) {
      console.error("Get tuition error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// =============================================
// LICH SU DANG KY ROUTES
// =============================================

app.get(
  "/api/lich-su-dang-ky",
  authenticateToken,
  authorize(["sinh_vien"]),
  async (req, res) => {
    try {
      const { namHoc, hocKy } = req.query;
      const studentId = req.user.id;

      let query = `
        SELECT
          dkhp.id,
          dkhp.trang_thai,
          dkhp.ngay_dang_ky,
          lhp.ma_lop,
          mh.ma_mon,
          mh.ten_mon,
          mh.so_tin_chi,
          sv.ma_so_sinh_vien
        FROM dang_ky_hoc_phan dkhp
        JOIN lop_hoc_phan lhp ON dkhp.lop_hoc_phan_id = lhp.id
        JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
        JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
        JOIN sinh_vien sv ON dkhp.sinh_vien_id = sv.id
        JOIN hoc_ky hk ON hp.id_hoc_ky = hk.id
        JOIN nien_khoa nk ON hk.id_nien_khoa = nk.id
        WHERE
          dkhp.sinh_vien_id = $1
      `;
      const queryParams = [studentId];
      let paramIndex = 2;

      if (namHoc) {
        query += ` AND nk.ten_nien_khoa = $${paramIndex++}`;
        queryParams.push(namHoc);
      }
      if (hocKy) {
        query += ` AND hk.ma_hoc_ky = $${paramIndex++}`;
        queryParams.push(hocKy);
      }

      query += ` ORDER BY dkhp.ngay_dang_ky DESC;`;

      const result = await pool.query(query, queryParams);

      const formattedResult = result.rows.map((row) => ({
        ...row,
        trang_thai_text:
          row.trang_thai === "da_dang_ky" ? "Đã đăng ký" : "Đã hủy",
      }));

      res.json({
        success: true,
        data: formattedResult,
      });
    } catch (error) {
      console.error("Get registration history error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// =============================================
// Xuất port trên terminal để check ba có chạy ko
// =============================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// =============================================
// tra cứu môn học
// =============================================

app.get("/api/mon-hoc/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Thiếu từ khóa tìm kiếm" });
  }

  const query = `
    SELECT id, ma_mon, ten_mon, so_tin_chi, loai_mon
    FROM mon_hoc
    WHERE ma_mon ILIKE $1 OR ten_mon ILIKE $1
    ORDER BY ten_mon ASC
    LIMIT 50
  `;

  try {
    const { rows } = await pool.query(query, [`%${q}%`]);
    res.json(rows);
  } catch (err) {
    console.error("Lỗi khi tìm kiếm môn học:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// =============================================
// tạo sinh viên, giảng viên, học phần
// =============================================

app.post("/api/tao-sinh-vien", async (req, res) => {
  const {
    ma_so_sinh_vien,
    ho_ten,
    lop,
    khoa_id,
    nganh_id,
    khoa_hoc,
    ngay_nhap_hoc,
  } = req.body;
  const ten_dang_nhap = ma_so_sinh_vien;
  const mat_khau = await hashPassword("12345");

  try {
    // 1. Kiểm tra ngành có thuộc khoa không
    const checkNganh = await pool.query(
      `SELECT 1 FROM nganh_hoc WHERE id = $1 AND khoa_id = $2`,
      [nganh_id, khoa_id]
    );

    if (checkNganh.rowCount === 0) {
      return res.status(400).json({ error: "Ngành không thuộc khoa đã chọn" });
    }

    // 2. Tạo tài khoản
    const tk = await pool.query(
      `INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, loai_tai_khoan)
       VALUES ($1, $2, 'sinh_vien') RETURNING id`,
      [ten_dang_nhap, mat_khau]
    );

    // 3. Thêm vào bảng users
    const user = await pool.query(
      `INSERT INTO users (ho_ten, tai_khoan_id) VALUES ($1, $2) RETURNING id`,
      [ho_ten, tk.rows[0].id]
    );

    // 4. Thêm vào bảng sinh_vien
    await pool.query(
      `INSERT INTO sinh_vien (id, ma_so_sinh_vien, lop, khoa_id, nganh_id, khoa_hoc, ngay_nhap_hoc)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.rows[0].id,
        ma_so_sinh_vien,
        lop,
        khoa_id,
        nganh_id,
        khoa_hoc,
        ngay_nhap_hoc,
      ]
    );

    res.json({ message: "Thêm sinh viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi thêm sinh viên" });
  }
});

app.post("/api/tao-giang-vien", async (req, res) => {
  const { ma_nhan_vien, ho_ten, khoa_id, trinh_do, kinh_nghiem_giang_day } =
    req.body;

  try {
    const user = await pool.query(
      `INSERT INTO users (ma_nhan_vien, ho_ten) VALUES ($1, $2) RETURNING id`,
      [ma_nhan_vien, ho_ten]
    );

    await pool.query(
      `INSERT INTO giang_vien (id, khoa_id, trinh_do, kinh_nghiem_giang_day)
       VALUES ($1, $2, $3, $4)`,
      [user.rows[0].id, khoa_id, trinh_do, kinh_nghiem_giang_day]
    );

    res.json({ message: "Thêm giảng viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi thêm giảng viên" });
  }
});

app.post("/api/tao-mon-hoc", async (req, res) => {
  const {
    ma_mon,
    ten_mon,
    so_tin_chi,
    khoa_id,
    loai_mon,
    la_mon_chung,
    thu_tu_hoc,
    nganh_ids, // mảng các ngành được chọn (UUID)
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Thêm môn học vào bảng mon_hoc và lấy id trả về
    const insertMonHocText = `
      INSERT INTO mon_hoc (ma_mon, ten_mon, so_tin_chi, khoa_id, loai_mon, la_mon_chung, thu_tu_hoc)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const insertMonHocValues = [
      ma_mon,
      ten_mon,
      so_tin_chi,
      khoa_id,
      loai_mon || "chuyen_nganh",
      la_mon_chung || false,
      thu_tu_hoc || 1,
    ];
    const resultMonHoc = await client.query(
      insertMonHocText,
      insertMonHocValues
    );
    const monHocId = resultMonHoc.rows[0].id;

    // 2. Thêm vào bảng mon_hoc_nganh với mon_hoc_id = monHocId và từng nganh_id trong nganh_ids
    if (Array.isArray(nganh_ids) && nganh_ids.length > 0) {
      const insertMonHocNganhText = `
        INSERT INTO mon_hoc_nganh (mon_hoc_id, nganh_id)
        VALUES ${nganh_ids.map((_, i) => `($1, $${i + 2})`).join(",")}
        ON CONFLICT (mon_hoc_id, nganh_id) DO NOTHING
      `;
      await client.query(insertMonHocNganhText, [monHocId, ...nganh_ids]);
    }

    await client.query("COMMIT");
    res.json({ message: "Thêm môn học thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Lỗi thêm môn học" });
  } finally {
    client.release();
  }
});

// =============================================
// upload từ excel
// =============================================

app.post("/api/upload-sinh-vien", upload.single("file"), async (req, res) => {
  // Lấy kết nối client từ pool để sử dụng giao dịch
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Bắt đầu giao dịch

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Không tìm thấy tệp được tải lên." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Lấy danh sách ngành/khoa hợp lệ trước để kiểm tra hiệu quả hơn
    const validNganhKhoa = await client.query(`
      SELECT id, khoa_id FROM nganh_hoc
    `);
    const nganhKhoaMap = {};
    validNganhKhoa.rows.forEach((row) => {
      nganhKhoaMap[row.id] = row.khoa_id;
    });

    const studentsToInsert = [];
    const accountsToInsert = [];
    const usersToInsert = [];

    // Lặp qua dữ liệu và chuẩn bị các truy vấn
    for (const sv of data) {
      const {
        ma_so_sinh_vien,
        ho_ten,
        lop,
        khoa_id,
        nganh_id,
        khoa_hoc,
        ngay_nhap_hoc,
      } = sv;

      // Kiểm tra dữ liệu đầu vào cơ bản và logic
      if (!ma_so_sinh_vien || !ho_ten || !khoa_id || !nganh_id) {
        throw new Error(
          `Dữ liệu không hợp lệ cho sinh viên: ${ho_ten || ma_so_sinh_vien}`
        );
      }

      // Kiểm tra ngành có thuộc khoa đã chọn không
      if (nganhKhoaMap[nganh_id] !== khoa_id) {
        throw new Error(
          `Ngành ID ${nganh_id} không thuộc Khoa ID ${khoa_id} cho sinh viên ${ho_ten}.`
        );
      }

      const ten_dang_nhap = ma_so_sinh_vien;
      const mat_khau = await hashPassword("12345");
      const userId = uuidv4(); // Tạo một ID duy nhất cho user

      accountsToInsert.push({
        ten_dang_nhap,
        mat_khau,
        loai_tai_khoan: "sinh_vien",
      });

      usersToInsert.push({
        id: userId,
        ho_ten,
      });

      studentsToInsert.push({
        id: userId,
        ma_so_sinh_vien,
        lop,
        khoa_id,
        nganh_id,
        khoa_hoc,
        ngay_nhap_hoc,
      });
    }

    // Thực hiện các truy vấn trong giao dịch
    for (const account of accountsToInsert) {
      await client.query(
        `INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, loai_tai_khoan) VALUES ($1, $2, $3)`,
        [account.ten_dang_nhap, account.mat_khau, account.loai_tai_khoan]
      );
    }

    for (const user of usersToInsert) {
      await client.query(`INSERT INTO users (id, ho_ten) VALUES ($1, $2)`, [
        user.id,
        user.ho_ten,
      ]);
    }

    for (const student of studentsToInsert) {
      await client.query(
        `INSERT INTO sinh_vien (id, ma_so_sinh_vien, lop, khoa_id, nganh_id, khoa_hoc, ngay_nhap_hoc)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          student.id,
          student.ma_so_sinh_vien,
          student.lop,
          student.khoa_id,
          student.nganh_id,
          student.khoa_hoc,
          student.ngay_nhap_hoc,
        ]
      );
    }

    await client.query("COMMIT"); // Kết thúc giao dịch và lưu các thay đổi
    res.json({ message: "Upload và thêm sinh viên thành công" });
  } catch (err) {
    await client.query("ROLLBACK"); // Hủy bỏ tất cả các thay đổi nếu có lỗi
    console.error("Lỗi xử lý file Excel:", err.message);
    res.status(500).json({
      error:
        "Lỗi xử lý file Excel. Dữ liệu không được thay đổi. Chi tiết: " +
        err.message,
    });
  } finally {
    client.release(); // Luôn giải phóng kết nối
  }
});

app.post("/api/upload-giang-vien", upload.single("file"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // Bắt đầu giao dịch

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Không tìm thấy tệp được tải lên." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (const gv of data) {
      const { ho_ten, khoa_id, chuyen_mon, trinh_do, kinh_nghiem_giang_day } =
        gv;

      // Tạo một ID duy nhất cho user
      const userId = uuidv4();

      // Thêm user vào bảng users
      await client.query(`INSERT INTO users (id, ho_ten) VALUES ($1, $2)`, [
        userId,
        ho_ten,
      ]);

      // Thêm thông tin giảng viên
      await client.query(
        `INSERT INTO giang_vien (id, khoa_id, chuyen_mon, trinh_do, kinh_nghiem_giang_day)
       VALUES ($1, $2, $3, $4, $5)`,
        [userId, khoa_id, chuyen_mon, trinh_do, kinh_nghiem_giang_day]
      );
    }

    await client.query("COMMIT"); // Kết thúc giao dịch và lưu thay đổi
    res.json({ message: "Upload và thêm giảng viên thành công" });
  } catch (err) {
    await client.query("ROLLBACK"); // Hủy bỏ nếu có lỗi
    console.error(err);
    res.status(500).json({ error: "Lỗi xử lý file Excel: " + err.message });
  } finally {
    client.release(); // Luôn giải phóng kết nối
  }
});

app.post("/api/upload-mon-hoc", upload.single("file"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // Bắt đầu giao dịch

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Không tìm thấy tệp được tải lên." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (const mh of data) {
      const {
        ma_mon,
        ten_mon,
        so_tin_chi,
        khoa_id,
        loai_mon,
        la_mon_chung,
        thu_tu_hoc,
      } = mh;

      await client.query(
        `INSERT INTO mon_hoc (ma_mon, ten_mon, so_tin_chi, khoa_id, loai_mon, la_mon_chung, thu_tu_hoc)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ma_mon,
          ten_mon,
          so_tin_chi,
          khoa_id,
          loai_mon || "chuyen_nganh",
          la_mon_chung || false,
          thu_tu_hoc || 1,
        ]
      );
    }

    await client.query("COMMIT"); // Kết thúc giao dịch và lưu thay đổi
    res.json({ message: "Upload và thêm môn học thành công" });
  } catch (err) {
    await client.query("ROLLBACK"); // Hủy bỏ nếu có lỗi
    console.error(err);
    res.status(500).json({ error: "Lỗi xử lý file Excel: " + err.message });
  } finally {
    client.release(); // Luôn giải phóng kết nối
  }
});

// Lấy danh sách sinh viên
app.get("/api/lay-ds-sinh-vien", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sv.id,
            sv.ma_so_sinh_vien, 
            u.ho_ten, 
            sv.lop, 
            k.ten_khoa, 
            sv.khoa_hoc,
            nh.ten_nganh
      FROM sinh_vien sv
      JOIN users u ON sv.id = u.id
      JOIN khoa k ON sv.khoa_id = k.id
      LEFT JOIN nganh_hoc nh ON sv.nganh_id = nh.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách sinh viên" });
  }
});

// Lấy danh sách giảng viên
app.get("/api/lay-ds-giang-vien", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.ma_nhan_vien, u.ho_ten, k.ten_khoa
      FROM giang_vien gv
      JOIN users u ON gv.id = u.id
      JOIN khoa k ON gv.khoa_id = k.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách giảng viên" });
  }
});

// Lấy danh sách học phần
app.get("/api/lay-ds-hoc-phan", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mh.id, ma_mon, ten_mon, so_tin_chi, k.ten_khoa, loai_mon
      FROM mon_hoc mh
      JOIN khoa k ON mh.khoa_id = k.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách học phần" });
  }
});

// =============================================
// lấy danh sách / thống kê
// =============================================

app.get("/api/thong-ke-lop-hoc-phan", async (req, res) => {
  try {
    const { hocKy, nienKhoa } = req.query;

    let whereClause = "WHERE hp.trang_thai_mo = true";
    const queryParams = [];

    // Lọc theo mã học kỳ
    if (hocKy) {
      const maHocKy = `HK${hocKy}`; // chuyển số 1 thành HK1
      queryParams.push(maHocKy);
      whereClause += ` AND h_k.ma_hoc_ky = $${queryParams.length}`;
    }

    // ✅ Sửa lỗi: Lọc theo tên niên khóa (ten_nien_khoa)
    if (nienKhoa) {
      queryParams.push(nienKhoa);
      whereClause += ` AND n_k.ten_nien_khoa = $${queryParams.length}`;
    }

    const query = `
      SELECT
        lhp.id, lhp.ma_lop, n_k.ten_nien_khoa AS nien_khoa, h_k.ma_hoc_ky AS hoc_ky,
        mh.ten_mon AS ten_hoc_phan, u.ho_ten AS ten_giang_vien,
        lhp.so_luong_toi_da, lhp.so_luong_hien_tai, lhp.phong_hoc, lhp.ngay_hoc,
        lhp.gio_hoc, lhp.ngay_bat_dau, lhp.ngay_ket_thuc, lhp.tong_so_tiet,
        k.ten_khoa AS dia_diem
      FROM lop_hoc_phan lhp
      JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
      LEFT JOIN hoc_ky h_k ON hp.id_hoc_ky = h_k.id
      LEFT JOIN nien_khoa n_k ON h_k.id_nien_khoa = n_k.id
      JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
      LEFT JOIN giang_vien gv ON lhp.giang_vien_id = gv.id
      LEFT JOIN users u ON gv.id = u.id
      LEFT JOIN khoa k ON gv.khoa_id = k.id
      ${whereClause};
    `;

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê lớp học phần:", error);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// Lấy danh sách sinh viên đã đăng ký vào lớp học phần
app.get("/api/lay-danh-sach-sinh-vien-lhp/:lhp_id", async (req, res) => {
  const { lhp_id } = req.params;
  try {
    const query = `
      SELECT sv.ma_so_sinh_vien, u.ho_ten, k.ten_khoa
      FROM dang_ky_hoc_phan dk
      JOIN sinh_vien sv ON dk.sinh_vien_id = sv.id
      JOIN users u ON sv.id = u.id
      JOIN khoa k ON sv.khoa_id = k.id
      WHERE dk.lop_hoc_phan_id = $1 AND dk.trang_thai = 'da_dang_ky';
    `;
    const result = await pool.query(query, [lhp_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sinh viên lớp học phần:", error);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

app.get("/api/chi-tiet-lop-hoc-phan/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, ma_lop FROM lop_hoc_phan WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy lớp học phần" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi truy vấn chi tiết lớp học phần:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// Xem danh sách ghi danh
app.get("/api/hoc-phan-mo", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hp.id, mh.ma_mon, mh.ten_mon, hp.hoc_ky, hp.nam_hoc
      FROM hoc_phan hp
      JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
      WHERE hp.trang_thai_mo = TRUE
      ORDER BY hp.nam_hoc DESC, hp.hoc_ky ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy học phần mở:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// Xem danh sách sinh viên đã ghi danh
app.get("/api/hoc-phan/:hoc_phan_id/sinh-vien", async (req, res) => {
  const { hoc_phan_id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT sv.ma_so_sinh_vien, u.ho_ten, sv.lop, k.ten_khoa, sv.khoa_hoc
      FROM ghi_danh gd
      JOIN sinh_vien sv ON gd.sinh_vien_id = sv.id
      JOIN users u ON sv.id = u.id
      JOIN khoa k ON sv.khoa_id = k.id
      WHERE gd.hoc_phan_id = $1 AND gd.trang_thai = 'da_ghi_danh'
    `,
      [hoc_phan_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách sinh viên ghi danh:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// =============================================
// chức năng xóa sinh viên, giảng viên, học phần, lớp học phần của PĐT
// =============================================
app.delete("/api/xoa-sinh-vien/:maSoSV", async (req, res) => {
  const { maSoSV } = req.params;

  try {
    // Lấy user id theo mã sinh viên
    const userRes = await pool.query(
      `SELECT sv.id as user_id
       FROM sinh_vien sv
       WHERE sv.ma_so_sinh_vien = $1`,
      [maSoSV]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "Sinh viên không tồn tại" });
    }

    const userId = userRes.rows[0].user_id;

    // Xóa lần lượt các bảng liên quan nếu cần (có thể xóa cascade nếu DB cấu hình)
    await pool.query(`DELETE FROM sinh_vien WHERE id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await pool.query(`DELETE FROM tai_khoan WHERE ten_dang_nhap = $1`, [
      maSoSV,
    ]);

    res.json({ message: "Xóa sinh viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi xóa sinh viên" });
  }
});

app.delete("/api/xoa-giang-vien/:maNhanVien", async (req, res) => {
  const { maNhanVien } = req.params;

  try {
    // Lấy user id theo mã nhân viên
    const userRes = await pool.query(
      `SELECT id FROM users WHERE ma_nhan_vien = $1`,
      [maNhanVien]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "Giảng viên không tồn tại" });
    }

    const userId = userRes.rows[0].id;

    await pool.query(`DELETE FROM giang_vien WHERE id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

    res.json({ message: "Xóa giảng viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi xóa giảng viên" });
  }
});

app.delete("/api/xoa-mon-hoc/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Xóa các liên kết mon_hoc_nganh
    await client.query(`DELETE FROM mon_hoc_nganh WHERE mon_hoc_id = $1`, [id]);

    // Xóa môn học
    const result = await client.query(
      `DELETE FROM mon_hoc WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Môn học không tồn tại" });
    }

    await client.query("COMMIT");
    res.json({ message: "Xóa môn học thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Lỗi xóa môn học" });
  } finally {
    client.release();
  }
});

app.delete("/api/xoa-lop-hoc-phan/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId; // lấy từ middleware xác thực JWT
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lấy dữ liệu lớp học phần
    const check = await client.query(
      "SELECT * FROM lop_hoc_phan WHERE id = $1",
      [id]
    );
    if (check.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lớp học phần" });
    }

    const lhp = check.rows[0];

    // Lưu vào bảng lịch sử
    await client.query(
      `INSERT INTO lich_su_xoa_lop_hoc_phan (
        lop_hoc_phan_id, ma_lop, ten_hoc_phan, ten_giang_vien,
        so_luong_toi_da, so_luong_hien_tai, phong_hoc, ngay_hoc, gio_hoc,
        ngay_bat_dau, ngay_ket_thuc, tong_so_tiet, dia_diem, nguoi_xoa
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        lhp.id,
        lhp.ma_lop,
        lhp.ten_hoc_phan,
        lhp.ten_giang_vien,
        lhp.so_luong_toi_da,
        lhp.so_luong_hien_tai,
        lhp.phong_hoc,
        lhp.ngay_hoc,
        lhp.gio_hoc,
        lhp.ngay_bat_dau,
        lhp.ngay_ket_thuc,
        lhp.tong_so_tiet,
        lhp.dia_diem,
        userId,
      ]
    );

    // Xóa lớp học phần
    await client.query("DELETE FROM lop_hoc_phan WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Đã xóa lớp học phần và lưu lịch sử thành công",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi xóa lớp học phần" });
  } finally {
    client.release();
  }
});

app.get("/api/lich-su-xoa-lop-hoc-phan", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM lich_su_xoa_lop_hoc_phan ORDER BY thoi_gian_xoa DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi lấy lịch sử" });
  }
});

// =============================================
// chức năng update sinh viên, giảng viên, học phần, lớp học phần của PĐT
// =============================================

app.put("/api/update-sinh-vien/:id", async (req, res) => {
  const { id } = req.params;
  const {
    ma_so_sinh_vien,
    ho_ten,
    lop,
    khoa_id,
    nganh_id,
    khoa_hoc,
    ngay_nhap_hoc,
    mat_khau, // thêm mật khẩu mới ở đây
  } = req.body;

  try {
    // 1. Kiểm tra ngành có thuộc khoa không
    const checkNganh = await pool.query(
      `SELECT 1 FROM nganh_hoc WHERE id = $1 AND khoa_id = $2`,
      [nganh_id, khoa_id]
    );
    if (checkNganh.rowCount === 0) {
      return res.status(400).json({ error: "Ngành không thuộc khoa đã chọn" });
    }

    // 2. Cập nhật bảng users (ho_ten)
    await pool.query(`UPDATE users SET ho_ten = $1 WHERE id = $2`, [
      ho_ten,
      id,
    ]);

    // 3. Cập nhật bảng sinh_vien
    await pool.query(
      `UPDATE sinh_vien
       SET ma_so_sinh_vien = $1, lop = $2, khoa_id = $3, nganh_id = $4, khoa_hoc = $5, ngay_nhap_hoc = $6
       WHERE id = $7`,
      [ma_so_sinh_vien, lop, khoa_id, nganh_id, khoa_hoc, ngay_nhap_hoc, id]
    );

    // 4. Nếu có mật khẩu mới, cập nhật bảng tai_khoan với mật khẩu đã hash
    if (mat_khau) {
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(mat_khau, 10);

      // Lấy tai_khoan_id của sinh viên
      const userResult = await pool.query(
        `SELECT tai_khoan_id FROM users WHERE id = $1`,
        [id]
      );
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: "Không tìm thấy user" });
      }
      const tai_khoan_id = userResult.rows[0].tai_khoan_id;

      // Cập nhật mật khẩu
      await pool.query(`UPDATE tai_khoan SET mat_khau = $1 WHERE id = $2`, [
        hashedPassword,
        tai_khoan_id,
      ]);
    }

    res.json({ message: "Cập nhật sinh viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật sinh viên" });
  }
});

app.put("/api/update-giang-vien/:id", async (req, res) => {
  const { id } = req.params;
  const { ma_nhan_vien, ho_ten, khoa_id, trinh_do, kinh_nghiem_giang_day } =
    req.body;

  try {
    // Update bảng users
    await pool.query(
      `UPDATE users SET ma_nhan_vien = $1, ho_ten = $2 WHERE id = $3`,
      [ma_nhan_vien, ho_ten, id]
    );

    // Update bảng giang_vien
    await pool.query(
      `UPDATE giang_vien
       SET khoa_id = $1, trinh_do = $2, kinh_nghiem_giang_day = $3
       WHERE id = $4`,
      [khoa_id, trinh_do, kinh_nghiem_giang_day, id]
    );

    res.json({ message: "Cập nhật giảng viên thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật giảng viên" });
  }
});

app.put("/api/update-mon-hoc/:id", async (req, res) => {
  const { id } = req.params;
  const {
    ma_mon,
    ten_mon,
    so_tin_chi,
    khoa_id,
    loai_mon,
    la_mon_chung,
    thu_tu_hoc,
    nganh_ids, // mảng ngành
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Update bảng mon_hoc
    await client.query(
      `UPDATE mon_hoc
       SET ma_mon = $1, ten_mon = $2, so_tin_chi = $3, khoa_id = $4, loai_mon = $5, la_mon_chung = $6, thu_tu_hoc = $7
       WHERE id = $8`,
      [
        ma_mon,
        ten_mon,
        so_tin_chi,
        khoa_id,
        loai_mon || "chuyen_nganh",
        la_mon_chung || false,
        thu_tu_hoc || 1,
        id,
      ]
    );

    // 2. Cập nhật lại danh sách ngành liên kết
    await client.query(`DELETE FROM mon_hoc_nganh WHERE mon_hoc_id = $1`, [id]);

    if (Array.isArray(nganh_ids) && nganh_ids.length > 0) {
      const insertText = `
        INSERT INTO mon_hoc_nganh (mon_hoc_id, nganh_id)
        VALUES ${nganh_ids.map((_, i) => `($1, $${i + 2})`).join(",")}
        ON CONFLICT (mon_hoc_id, nganh_id) DO NOTHING
      `;
      await client.query(insertText, [id, ...nganh_ids]);
    }

    await client.query("COMMIT");
    res.json({ message: "Cập nhật môn học thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Lỗi cập nhật môn học" });
  } finally {
    client.release();
  }
});

app.get("/api/show-update-sinh-vien/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
        sv.ma_so_sinh_vien,
        u.ho_ten,
        sv.lop,
        tk.ten_dang_nhap,
        tk.mat_khau,
        sv.khoa_id,
        sv.nganh_id,
        sv.khoa_hoc,
        sv.ngay_nhap_hoc
       FROM sinh_vien sv
       JOIN users u ON u.id = sv.id
       JOIN tai_khoan tk ON u.tai_khoan_id = tk.id
       WHERE sv.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy sinh viên" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy dữ liệu sinh viên" });
  }
});

app.get("/api/show-update-giang-vien/:id", async (req, res) => {
  const { id } = req.params;
  console.log("ID nhận từ FE:", id); // 👈 Thêm dòng này
  try {
    const result = await pool.query(
      `SELECT u.ho_ten, u.ma_nhan_vien, gv.khoa_id, gv.trinh_do, gv.kinh_nghiem_giang_day
       FROM giang_vien gv
       JOIN users u ON u.id = gv.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy giảng viên" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy dữ liệu giảng viên" });
  }
});

app.get("/api/show-update-mon-hoc/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy thông tin môn học
    const monHoc = await pool.query(
      `SELECT id, ma_mon, ten_mon, so_tin_chi, khoa_id, loai_mon, la_mon_chung, thu_tu_hoc
       FROM mon_hoc
       WHERE id = $1`,
      [id]
    );

    if (monHoc.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy môn học" });
    }

    // Lấy danh sách ngành liên kết với môn học
    const nganhList = await pool.query(
      `SELECT nganh_id FROM mon_hoc_nganh WHERE mon_hoc_id = $1`,
      [id]
    );

    res.json({
      ...monHoc.rows[0],
      nganh_ids: nganhList.rows.map((r) => r.nganh_id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi lấy dữ liệu môn học" });
  }
});

app.put(
  "/api/pdt/cap-nhat-lop-hoc-phan/:id",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    const { id } = req.params;
    const {
      hocPhanId,
      giangVienId,
      tietBatDau,
      tietKetThuc,
      soTietMoiBuoi,
      tongSoTiet,
      ngayBatDau,
      ngayKetThuc,
      ngayHoc,
      phongHoc,
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lấy thông tin lớp cũ
      const lopRes = await client.query(
        `SELECT hoc_phan_id FROM lop_hoc_phan WHERE id = $1`,
        [id]
      );
      if (lopRes.rowCount === 0) {
        return res.status(404).json({ error: "Không tìm thấy lớp học phần" });
      }
      const oldHocPhanId = lopRes.rows[0].hoc_phan_id;

      let maLop = null;

      // Nếu đổi học phần => tạo mã lớp mới
      if (hocPhanId && hocPhanId !== oldHocPhanId) {
        const hpRes = await client.query(
          `SELECT ma_hoc_phan FROM hoc_phan WHERE id = $1`,
          [hocPhanId]
        );
        if (hpRes.rowCount === 0) {
          throw new Error(`Không tìm thấy học phần với id ${hocPhanId}`);
        }
        const maHocPhan = hpRes.rows[0].ma_hoc_phan;

        // Đếm số lớp đã có
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS so_lop_da_co 
           FROM lop_hoc_phan 
           WHERE hoc_phan_id = $1`,
          [hocPhanId]
        );
        let soLopDaCo = countRes.rows[0].so_lop_da_co + 1;

        const soThuTu = String(soLopDaCo).padStart(2, "0");
        maLop = `${maHocPhan}${soThuTu}`;
      }

      // Update lớp
      await client.query(
        `UPDATE lop_hoc_phan
         SET hoc_phan_id = COALESCE($1, hoc_phan_id),
             ma_lop = COALESCE($2, ma_lop),
             tiet_bat_dau = COALESCE($3, tiet_bat_dau),
             tiet_ket_thuc = COALESCE($4, tiet_ket_thuc),
             so_tiet_moi_buoi = COALESCE($5, so_tiet_moi_buoi),
             tong_so_tiet = COALESCE($6, tong_so_tiet),
             ngay_bat_dau = COALESCE($7, ngay_bat_dau),
             ngay_ket_thuc = COALESCE($8, ngay_ket_thuc),
             ngay_hoc = COALESCE($9, ngay_hoc),
             phong_hoc = COALESCE($10, phong_hoc),
             giang_vien_id = COALESCE($11, giang_vien_id)
         WHERE id = $12`,
        [
          hocPhanId || null,
          maLop || null,
          tietBatDau || null,
          tietKetThuc || null,
          soTietMoiBuoi || null,
          tongSoTiet || null,
          ngayBatDau || null,
          ngayKetThuc || null,
          ngayHoc || null,
          phongHoc || null,
          giangVienId || null,
          id,
        ]
      );

      await client.query("COMMIT");
      res.json({ message: "Cập nhật lớp học phần thành công" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Lỗi cập nhật lớp học phần:", error);
      res.status(500).json({ error: "Lỗi server" });
    } finally {
      client.release();
    }
  }
);

// =============================================
// Đổi mật khẩu
// =============================================

app.put("/api/auth/change-password", authenticateToken, async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  // Kiểm tra dữ liệu nhập
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: "Vui lòng nhập đủ thông tin" });
  }

  // Kiểm tra mật khẩu mới và xác nhận
  if (newPassword !== confirmNewPassword) {
    return res
      .status(400)
      .json({ error: "Mật khẩu mới và xác nhận không khớp" });
  }

  try {
    // Lấy thông tin tài khoản từ middleware
    const userId = req.user.id;

    // Lấy mật khẩu cũ từ DB
    const result = await pool.query(
      `SELECT mat_khau FROM tai_khoan WHERE id = $1`,
      [req.user.tai_khoan_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản" });
    }

    const currentHashedPassword = result.rows[0].mat_khau;

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Mật khẩu cũ không đúng" });
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await pool.query(`UPDATE tai_khoan SET mat_khau = $1 WHERE id = $2`, [
      hashedNewPassword,
      req.user.tai_khoan_id,
    ]);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Lỗi server khi đổi mật khẩu" });
  }
});

// =============================================
// Clean
// =============================================
// app.post(
//   "/api/system/clean",
//   authenticateToken,
//   authorize(["phong_dao_tao"]),
//   async (req, res) => {
//     try {
//       await pool.query("BEGIN");

//       const cleanQuery = `
//             DO $$
//             BEGIN
//                 -- Xóa dữ liệu liên quan đến lịch sử đăng ký
//                 DELETE FROM chi_tiet_lich_su_dang_ky;
//                 DELETE FROM lich_su_dang_ky;

//                 -- Xóa dữ liệu đăng ký học phần của sinh viên
//                 DELETE FROM dang_ky_hoc_phan;

//                 -- Xóa dữ liệu thời khóa biểu đã đăng ký của sinh viên và chi tiết
//                 DELETE FROM chi_tiet_thoi_khoa_bieu;
//                 DELETE FROM thoi_khoa_bieu;

//                 -- Xóa các lớp học phần
//                 DELETE FROM lop_hoc_phan;

//                 -- Xóa các đề xuất học phần
//                 DELETE FROM de_xuat_hoc_phan;

//                 -- Thêm một bản ghi trạng thái hệ thống mới, đặt lại về phase 1 (Tiền ghi danh)
//                 INSERT INTO he_thong (trang_thai_phase, ten_phase, ngay_bat_dau)
//                 VALUES (1, 'Tiền ghi danh', NOW());
//             END $$;
//         `;
//       await pool.query(cleanQuery);
//       await pool.query("COMMIT");

//       res.json({
//         message:
//           "Dữ liệu hệ thống đã được làm sạch và thiết lập lại thành công.",
//       });
//     } catch (error) {
//       await pool.query("ROLLBACK");
//       console.error("Lỗi khi làm sạch dữ liệu:", error);
//       res
//         .status(500)
//         .json({ error: "Lỗi server nội bộ. Dữ liệu không được thay đổi." });
//     }
//   }
// );

app.post(
  "/api/system/clean",
  authenticateToken,
  authorize(["phong_dao_tao"]),
  async (req, res) => {
    try {
      await pool.query("BEGIN");

      // Cập nhật câu lệnh SQL để làm sạch dữ liệu
      const cleanQuery = `
        -- Xóa ghi danh của các học phần thỏa điều kiện
        DELETE FROM ghi_danh
        WHERE hoc_phan_id IN (
            SELECT hp.id
            FROM hoc_phan hp
            WHERE hp.trang_thai_mo = true
        );
        
        -- Xóa đề xuất học phần liên quan
        DELETE FROM de_xuat_hoc_phan
        WHERE mon_hoc_id IN (
            SELECT mh.id
            FROM hoc_phan hp
            JOIN mon_hoc mh ON hp.mon_hoc_id = mh.id
            WHERE hp.trang_thai_mo = true
        );
        
        -- Xóa học phần
        DELETE FROM hoc_phan
        WHERE trang_thai_mo = true;
        
        DO $$
        BEGIN
            -- Xóa dữ liệu liên quan đến lịch sử đăng ký
            DELETE FROM chi_tiet_lich_su_dang_ky;
            DELETE FROM lich_su_dang_ky;
        
            -- Xóa dữ liệu đăng ký học phần của sinh viên
            DELETE FROM dang_ky_hoc_phan;
        
            -- Xóa dữ liệu thời khóa biểu đã đăng ký của sinh viên và chi tiết
            DELETE FROM chi_tiet_thoi_khoa_bieu;
            DELETE FROM thoi_khoa_bieu;
            
            -- Xóa các lớp học phần
            DELETE FROM lop_hoc_phan;
        
            -- Xóa các đề xuất học phần
            DELETE FROM de_xuat_hoc_phan;
        END $$;
        
        CREATE OR REPLACE FUNCTION log_dang_ky_hoc_phan_action()
        RETURNS TRIGGER AS $$
        DECLARE
            v_id_hoc_ky UUID;
        BEGIN
            -- Lấy id_hoc_ky từ lop_hoc_phan mà sinh viên vừa đăng ký
            SELECT hp.id_hoc_ky INTO v_id_hoc_ky
            FROM lop_hoc_phan lhp
            JOIN hoc_phan hp ON lhp.hoc_phan_id = hp.id
            WHERE lhp.id = NEW.lop_hoc_phan_id;
        
            -- Chỉ chèn nếu id_hoc_ky hợp lệ
            IF v_id_hoc_ky IS NOT NULL THEN
                -- Sử dụng cấu trúc bảng mới
                INSERT INTO lich_su_dang_ky(sinh_vien_id, id_hoc_ky)
                VALUES (NEW.sinh_vien_id, v_id_hoc_ky)
                -- Sử dụng ràng buộc UNIQUE mới
                ON CONFLICT (sinh_vien_id, id_hoc_ky) DO NOTHING;
            END IF;
        
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      await pool.query(cleanQuery);
      await pool.query("COMMIT");

      res.json({
        message:
          "Dữ liệu hệ thống đã được làm sạch và thiết lập lại thành công.",
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("Lỗi khi làm sạch dữ liệu:", error);
      res
        .status(500)
        .json({ error: "Lỗi server nội bộ. Dữ liệu không được thay đổi." });
    }
  }
);
