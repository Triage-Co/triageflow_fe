# TriageFlow OPD — Rà soát FE: Role, Phân quyền & API

> **Mục đích:** Tổng hợp toàn bộ phân quyền frontend, route theo role, chức năng nghiệp vụ và API backend tương ứng.  
> **Nguồn:** Rà soát code tại `shared/utils/routeAccess.ts`, layouts, Sidebar, `modules/*/services/*`.  
> **Cập nhật:** 2026-09-01  
> **Liên quan:** `docs/API.md` (chi tiết endpoint), `docs/Structure.md` (cấu trúc folder), `test-guide.md` (manual test)

---

## Mục lục

1. [Tổng quan kiến trúc auth FE](#1-tổng-quan-kiến-trúc-auth-fe)
2. [Danh sách role](#2-danh-sách-role)
3. [Cơ chế phân quyền & guard](#3-cơ-chế-phân-quyền--guard)
4. [Ma trận route × role](#4-ma-trận-route--role)
5. [Chi tiết theo role](#5-chi-tiết-theo-role)
6. [Khu vực không guard (public / thiết bị)](#6-khu-vực-không-guard-public--thiết-bị)
7. [Danh mục API theo module](#7-danh-mục-api-theo-module)
8. [Ghi chú & hạn chế](#8-ghi-chú--hạn-chế)

---

## 1. Tổng quan kiến trúc auth FE

| Thành phần | File | Mô tả |
|------------|------|--------|
| Auth state | `modules/auth/store/authStore.ts` | Zustand + persist (`user`, `accessToken`, `role`) |
| API client | `shared/services/apiClient.ts` | `fetch` same-origin `/api/*` → proxy NestJS |
| Route access | `shared/utils/routeAccess.ts` | `canAccessRoute`, `getRoleHomePath`, zone map |
| Layout guard | `shared/components/layout/RoleRouteGuard.tsx` | Redirect `/login` hoặc `notFound()` |
| Sidebar menu | `shared/components/layout/Sidebar.tsx` | `NAV_BY_ROLE` |

**Không có `middleware.ts`** — phân quyền route chạy **client-side** trong layout sau khi auth store hydrate.

**Luồng truy cập sai role:** Ví dụ dược sĩ vào `/admin` → `notFound()` → trang 404 với nút về home theo role (`getRoleHomePath`).

**Bệnh nhân (`USER`):** Bị chặn đăng nhập staff portal (`LoginForm`); nếu đã auth là `USER` thì dùng nhóm route `(patient)`.

---

## 2. Danh sách role

### Role chính (TypeScript `StaffRole`)

Định nghĩa tại `shared/types/auth.types.ts`:

| Role | Mô tả | Portal |
|------|--------|--------|
| `USER` | Bệnh nhân | `(patient)` |
| `DOCTOR` | Bác sĩ | `(staff)` |
| `NURSE` | Điều dưỡng | `(staff)` |
| `RECEPTIONIST` | Lễ tân | `(staff)` |
| `LAB_TECHNICIAN` | Kỹ thuật xét nghiệm | `(staff)` |
| `PHARMACIST` | Dược sĩ | `(staff)` |
| `ADMIN` | Quản trị | `(admin)` |

### Alias / legacy (runtime, `routeAccess.ts`)

| Alias | Xử lý như |
|-------|-----------|
| `LAB_STAFF` | `LAB_TECHNICIAN` |
| `PHARMACY_STAFF`, `PHARMACY` | `PHARMACIST` |
| `CASHIER` | Riêng — thu ngân |

Chuẩn hóa: `normalizeRoleKey()` — bỏ prefix `ROLE_`, uppercase.

### Trang home mặc định sau login / 404

| Role | `getRoleHomePath()` |
|------|---------------------|
| `ADMIN` | `/admin/dashboard` |
| `DOCTOR` | `/doctor/dashboard` |
| `NURSE` | `/nurse/dashboard` |
| `RECEPTIONIST` | `/reception` |
| `LAB_STAFF` / `LAB_TECHNICIAN` | `/lab` |
| `PHARMACY_STAFF` / `PHARMACIST` / `PHARMACY` | `/pharmacy` |
| `CASHIER` | `/cashier` |
| `USER` | `/queue` |
| Không auth / unknown | `/login` |

---

## 3. Cơ chế phân quyền & guard

### `RoleRouteGuard` props

| Prop | Điều kiện |
|------|-----------|
| (mặc định) | `canAccessRoute(role, pathname)` — zone + staff-shared |
| `requireAdmin` | Chỉ `ADMIN` |
| `requirePatient` | Chỉ `USER` |

### Layout áp guard

| Layout | Guard | Route group |
|--------|-------|-------------|
| `app/(admin)/layout.tsx` | `requireAdmin` | Toàn `(admin)` |
| `app/(staff)/layout.tsx` | zone-based | Toàn `(staff)` |
| `app/(patient)/layout.tsx` | `requirePatient` | Toàn `(patient)` |

### Prefix dùng chung cho mọi staff (`STAFF_ROLES`)

`/settings`, `/notifications`, `/design-system`, `/room-display`

### Zone không match + không phải staff-shared

Mọi **staff role** được phép (fallback mở) — ví dụ một số route staff chưa khai báo zone vẫn có thể truy cập nếu đã đăng nhập staff.

---

## 4. Ma trận route × role

| Prefix / route | Role được phép |
|----------------|----------------|
| `/admin`, `/override` | `ADMIN` |
| `/doctor`, `/nurse`, `/tongquan` | `DOCTOR`, `NURSE` |
| `/reception` | `RECEPTIONIST`, `NURSE` |
| `/lab` | `LAB_STAFF`, `LAB_TECHNICIAN`, `DOCTOR`, `NURSE` |
| `/pharmacy` | `PHARMACY_STAFF`, `PHARMACIST`, `PHARMACY` |
| `/cashier` | `CASHIER` |
| `/queue`, `/navigation`, `/payment`, `/results`, `/triage`, `/checkin` | `USER` |
| `/settings`, `/notifications`, `/design-system`, `/room-display` | Mọi staff |
| `/kiosk`, `/display/*` | Không guard (public / PIN) |
| `/login`, `/register`, `/forgot-password` | Public auth |

---

## 5. Chi tiết theo role

### 5.1 ADMIN

**Menu sidebar:** Tổng quan, Bản đồ, Hàng chờ, Quy trình, Dịch vụ, Gói khám, Thuốc, AI, Màn hình, Phòng, Ca trực, Người dùng, Nhân viên.

**Route chính**

| Path | Chức năng |
|------|-----------|
| `/admin/dashboard` | Dashboard tổng quan |
| `/admin/map` | Cấu hình bản đồ / graph indoor |
| `/admin/queue` | Quy tắc hàng chờ, heatmap, rebalance |
| `/admin/process` | Template quy trình khám |
| `/admin/services` | Danh mục dịch vụ |
| `/admin/exam-packages` | Gói khám |
| `/admin/medicines` | Danh mục thuốc |
| `/admin/ai-config` | Cấu hình AI / Infermedica |
| `/admin/displays` | Màn hình kiosk & TV |
| `/admin/rooms`, `/admin/rooms/[id]` | Phòng khám |
| `/admin/shift`, `/admin/shift/[id]` | Ca trực |
| `/admin/specialties` | Chuyên khoa |
| `/admin/staff`, `/admin/staff/[id]` | Nhân viên |
| `/admin/users`, `/admin/users/[id]` | Tài khoản người dùng |
| `/override` | Override hàng chờ thủ công |

**Service & API (nghiệp vụ)**

| Service | API chính | Nghiệp vụ |
|---------|-----------|-----------|
| `adminService` | `GET/PATCH /api/account/*` | Ban/unban user |
| `dashboardService` | `GET /api/admin/dashboard/summary` | Thống kê dashboard |
| `staffService` | `CRUD /api/staff` | Quản lý nhân viên |
| `shiftService` | `CRUD /api/shift`, bulk import | Ca trực |
| `roomService` (admin) | `CRUD /api/room` | Phòng |
| `specialtyService` | `CRUD /api/specialty` | Chuyên khoa |
| `serviceCatalogService` | `CRUD /api/service` | Dịch vụ |
| `examPackageService` | `CRUD /api/exam-package` | Gói khám |
| `medicineAdminService` | `CRUD /api/medicine` | Thuốc (admin) |
| `processService` | `CRUD /api/template` | Template quy trình |
| `aiSpecialtyService` | `CRUD /api/ai-specialty` | Mapping AI chuyên khoa |
| `queueAdminService` | `/api/queue/admin/*` | Rules, heatmap, rebalance, room-stats |
| `roomServiceMappingService` | `/api/queue/admin/room-services` | Map dịch vụ ↔ phòng |
| `triageConfigService` | `GET/PATCH /api/infermedica/question-limit` | Giới hạn câu hỏi triage |
| `mapEditorService` | `/api/map-editor/*`, `/api/graph/*` | Bản đồ, corridor, graph |
| `displayScreenService` | `CRUD /api/display-screen` | Cấu hình TV/kiosk |

---

### 5.2 DOCTOR

**Menu:** Danh sách BN, Thông báo, Thông tin cá nhân.

**Route chính**

| Path | Chức năng |
|------|-----------|
| `/doctor`, `/doctor/dashboard` | Hàng chờ bác sĩ |
| `/doctor/[id]` | EMR / quy trình khám (ClinicalProcessPanel) |
| `/doctor/notification`, `/doctor/setting` | Thông báo, cài đặt |
| `/tongquan`, `/tongquan/patient/[id]` | Tổng quan (doctor/nurse) |
| `/lab` | Cận lâm sàng khi chọn ca trực lab (`localStorage` room type) |

**Nghiệp vụ chính**

- Xem hàng chờ theo ngày, gọi số, hoàn thành bước (`queueService`)
- EMR: lý do khám, HPI, tiền sử, **khám lâm sàng** (vị trí tùy ý), chẩn đoán
- Cận lâm sàng: chỉ định xét nghiệm / thủ thuật (`serviceOrderService`)
- Đơn thuốc: tạo/sửa/xóa, **in đơn A5** (`doctorPrescriptionService`, `PrescriptionPrintView`)
- Quy trình flow: template, step status (`clinicalService`)

**Service & API**

| Service | API chính | Nghiệp vụ |
|---------|-----------|-----------|
| `clinicalService` | `GET /api/doctor/patients`, `GET /api/doctor/patients/queue/{id}` | Hàng chờ & BN |
| `clinicalService` | `GET/PATCH /api/visit-session/*` | Session khám (chief_complaint, hpi, pmh, pe) |
| `clinicalService` | `GET/PATCH /api/flow/*`, `PATCH /api/step/*` | Flow & bước quy trình |
| `clinicalService` | `GET /api/template`, `POST /api/flow/assign/*` | Gán template |
| `serviceOrderService` | `CRUD /api/service-order` | Chỉ định CLS |
| `doctorPrescriptionService` | `CRUD /api/prescription` | Đơn thuốc bác sĩ |
| `queueService` | `POST /api/queue/*` | Gọi số, complete, miss, recall |
| `labService` | `GET /api/queue/room/*`, shifts | Khi làm ca lab |
| `notificationService` | `GET/DELETE /api/notification` | Thông báo |
| `authService` | `GET/PATCH /api/auth/profile`, `/api/auth/update` | Profile |

---

### 5.3 NURSE

**Menu:** Danh sách BN (`/nurse/dashboard`), Tiếp nhận (`/reception`), Thông báo, Cá nhân.

**Route:** `/nurse/*` + zone `/reception`, `/doctor`, `/lab`, `/tongquan` (cùng doctor về route access).

**Nghiệp vụ:** Tương tự doctor trên EMR/hàng chờ; thêm tiếp nhận khi vào `/reception`. Sidebar có thể chuyển sang menu lab khi `tfopd_active_room_type` = paraclinical.

**API:** Chủ yếu `clinicalService`, `queueService`, `receptionService` (khi tiếp nhận), `serviceOrderService`, `doctorPrescriptionService`, `labService`.

---

### 5.4 RECEPTIONIST

**Menu:** Tiếp nhận, Tra cứu BN, Thông tin cá nhân.

**Route**

| Path | Chức năng |
|------|-----------|
| `/reception` | Tiếp nhận, đăng ký, booking |
| `/reception/search` | Tra cứu bệnh nhân |
| `/reception/[patientId]` | Chi tiết BN |
| `/reception/payment` | Thanh toán tại lễ tân |

**Nghiệp vụ**

- Tạo / tìm BN, OCR CCCD (VNPT)
- Đăng ký khám, chọn CK, bác sĩ, slot, gói khám
- Triage AI (Infermedica): parse symptom, diagnose, recommend specialist
- Tạo booking cash / recommend / with-package
- Thanh toán cash service order

**Service & API**

| Service | API chính | Nghiệp vụ |
|---------|-----------|-----------|
| `receptionService` | `GET/POST /api/patient`, `GET /api/patient?` | BN |
| `receptionService` | `POST /api/booking`, `/cash`, `/with-package`, `/recommend` | Đặt khám |
| `receptionService` | `GET /api/specialty`, `/api/doctor/*`, `/api/room/*/slots` | CK, slot |
| `receptionService` | `GET /api/exam-package`, `GET /api/flow/patient/*` | Gói khám, flow |
| `receptionService` | `POST /api/transaction/cash` | Thu tiền dịch vụ |
| `infermedicaService` | `POST /api/infermedica/*` | AI triage |
| `vnptService` / OCR routes | `/api/vnpt/*`, Next `/api/vnpt/ocr` | CCCD |
| `clinicalService` | `GET /api/doctor/patients` | Hàng chờ (queue view) |
| `symptomTriageService` | (orchestration) | Ghép infermedica + reception |

---

### 5.5 LAB_STAFF / LAB_TECHNICIAN

**Menu:** Danh sách BN, Thông báo, Cá nhân.

**Route:** `/lab`, `/lab/notification`

**Nghiệp vụ**

- Xem hàng chờ phòng lab theo ca trực
- Gọi số, scan vé, complete/refuse chi tiết service order
- Override / recall queue

**Service & API**

| Service | API chính |
|---------|-----------|
| `labService` | `GET /api/shift/me`, `GET /api/queue/room/{roomId}` |
| `labService` | `POST /api/queue/call-next`, `/scan`, `/{id}/complete`, `/refuse`, `/recall`, `/override` |
| `labService` | `POST /api/queue/{id}/service-order-details/{detailId}/complete` |

---

### 5.6 PHARMACY_STAFF / PHARMACIST / PHARMACY

**Menu:** Quản lý & Cấp phát đơn, Danh mục dược phẩm, Cá nhân.

**Route**

| Path | Chức năng |
|------|-----------|
| `/pharmacy` | Queue đơn, thanh toán, soạn, cấp phát |
| `/pharmacy/medicines` | Danh mục thuốc (tra cứu) |

**Nghiệp vụ**

- Quét / lọc đơn thuốc, thanh toán cash / PayOS
- Soạn thuốc (`prepare`), cấp phát (`dispense`)
- Gọi số nhận thuốc, miss/recall
- **In biên nhận thermal 57mm** (khác in đơn A5 của bác sĩ)
- TV nhà thuốc: `pharmacy-display`, call-next theo quầy

**Service & API**

| Service | API chính | Nghiệp vụ |
|---------|-----------|-----------|
| `pharmacyService` | `GET /api/prescription`, `GET /api/prescription/{id}` | Danh sách & chi tiết |
| `pharmacyService` | `GET /api/prescription/scan/{code}` | Quét QR |
| `pharmacyService` | `PATCH /api/prescription/{id}/pay` | Thu tiền cash |
| `pharmacyService` | `PATCH /prepare`, `/dispense`, `/status` | Workflow đơn |
| `pharmacyService` | `GET /api/prescription/pharmacy-display` | TV quầy |
| `pharmacyService` | `POST /call-next`, `/{id}/miss`, `/{id}/recall` | Gọi số |
| `medicineService` | `GET /api/medicine`, routes, manufacturers | Danh mục |
| `paymentService` | `POST /api/transaction` | PayOS QR |

---

### 5.7 CASHIER

**Menu:** Thanh toán, Thông báo, Cá nhân.

**Route:** `/cashier`, `/cashier/[transactionId]`

**Nghiệp vụ:** Thu thanh toán đơn thuốc (cash / PayOS), xem giao dịch — qua `PaymentWorkflowPanel` / `EMRWorkspaceLayout`.

**Service & API**

| Service | API chính |
|---------|-----------|
| `paymentService` | `GET /api/transaction`, `GET /api/transaction/{id}` |
| `paymentService` | `POST /api/transaction` (PayOS) |
| `paymentService` | `PATCH /api/prescription/{id}/pay` (via pharmacyService) |
| `pharmacyService` | `GET /api/prescription` (lọc đơn chờ thanh toán) |

---

### 5.8 USER (Bệnh nhân)

**Route (guard `requirePatient`):** `/queue`, `/navigation`, `/payment`, `/results`, `/triage`, `/checkin`

**Trạng thái triển khai:** Một số page còn stub (ví dụ `queue/page.tsx` return `null`). Luồng bệnh nhân chính thường qua **kiosk** (`/kiosk`).

**Nghiệp vụ dự kiến**

- Theo dõi hàng chờ, thanh toán QR, điều hướng indoor, xem kết quả
- `navigationService`: `GET /api/navigation/building/*/map`, `/api/navigation/route`
- `paymentService` / `pharmacyService` trên `PatientPaymentDisplay` (display thanh toán)

**Service liên quan (khi triển khai đầy đủ)**

| Service | API |
|---------|-----|
| `navigationService` | `/api/navigation/*` |
| `kiosk/flowService` | `/api/flow/patient/*`, `/api/step/*` |
| `paymentService` | `/api/transaction`, prescription pay |

---

## 6. Khu vực không guard (public / thiết bị)

### Kiosk — `/kiosk`, `/kiosk/[id]`

Không `RoleRouteGuard`. Đăng nhập CCCD/OTP, tự phục vụ.

| Service | API chính | Nghiệp vụ |
|---------|-----------|-----------|
| `kiosk/authService` | `POST /api/auth/login/citizen-id/*` | Login BN |
| `kiosk/bookingService` | `POST /api/booking`, `/recommend` | Đặt khám |
| `kiosk/packageBookingService` | `/api/exam-package`, `/api/booking/with-package` | Gói khám |
| `kiosk/flowService` | `/api/flow/patient/*`, `/api/step/*` | Flow & thanh toán |
| `kiosk/triageService` | `/api/infermedica/*` | Triage kiosk |

### Display — `/display/*`

TV phòng khám, thanh toán, nhà thuốc — bind qua PIN (`displayScreenService`).

| Path | Nghiệp vụ |
|------|-----------|
| `/display/room/[roomId]` | TV phòng khám |
| `/display/payment/[id]` | TV thanh toán |
| `/display/pharmacy/[roomId]` | TV nhà thuốc |

API: `GET /api/prescription/pharmacy-display`, `GET /api/doctor/patients`, `displayScreenService` verify PIN.

### Auth public

| Path | API |
|------|-----|
| `/login`, `/register`, `/forgot-password` | `authService` — `/api/auth/*` |

### Trang root không guard

`/design-system`, `/privacy-policy`, `/delete-account` — không kiểm tra role.

---

## 7. Danh mục API theo module

Tóm tắt endpoint theo domain (chi tiết request/response: `docs/API.md`).

### Auth — `modules/auth/services/authService.ts`

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register`, `/otp/send`, `/otp/verify` | Đăng ký / OTP |
| GET | `/api/auth/me`, `/api/auth/profile` | Session / profile |
| PATCH | `/api/auth/update` | Cập nhật profile |
| POST | `/api/auth/forgot`, `/forgot/verify`, `/logout` | Reset MK / logout |

### Clinical — `modules/clinical/services/*`

| Endpoint pattern | Service | Mô tả |
|------------------|---------|--------|
| `/api/doctor/patients*` | clinicalService | Hàng chờ doctor |
| `/api/visit-session*` | clinicalService | Session khám |
| `/api/flow*` | clinicalService | Patient flow |
| `/api/step*` | clinicalService | Bước quy trình |
| `/api/template*` | clinicalService, processService | Template |
| `/api/service-order*` | serviceOrderService | Chỉ định CLS |
| `/api/prescription*` | doctorPrescriptionService, pharmacyService | Đơn thuốc |
| `/api/notification*` | notificationService | Thông báo |

### Queue — `modules/queue/services/*`

| Endpoint pattern | Mô tả |
|------------------|--------|
| `/api/queue/room/{roomId}` | Hàng chờ phòng |
| `/api/queue/call-next`, `/scan` | Gọi số / quét |
| `/api/queue/{id}/complete`, `/refuse`, `/miss`, `/recall`, `/override` | Xử lý queue |
| `/api/queue/transfer` | Chuyển queue |
| `/api/queue/{id}/service-order*` | Complete/refuse SO |
| `/api/room` | Danh sách phòng |

### Reception — `modules/reception/services/*`

| Endpoint pattern | Mô tả |
|------------------|--------|
| `/api/patient*` | CRUD / search BN |
| `/api/booking*` | Đặt khám |
| `/api/specialty`, `/api/doctor/*` | CK, slot |
| `/api/exam-package*` | Gói khám |
| `/api/infermedica/*` | AI triage |
| `/api/transaction/cash` | Thu cash SO |

### Ancillary (Pharmacy) — `modules/ancillary/services/*`

| Endpoint pattern | Mô tả |
|------------------|--------|
| `/api/prescription*` | Full pharmacy workflow |
| `/api/medicine*` | Danh mục thuốc |

### Lab — `modules/lab/services/labService.ts`

Subset của `/api/queue/*` + `/api/shift/me`.

### Payment — `modules/payment/services/paymentService.ts`

| Endpoint | Mô tả |
|----------|--------|
| `/api/transaction` | PayOS / danh sách GD |
| `/api/prescription/{id}/pay` | Cash đơn thuốc |

### Admin — `modules/admin/services/*`

| Prefix | Mô tả |
|--------|--------|
| `/api/account/*` | Users |
| `/api/staff/*` | Nhân viên |
| `/api/shift/*` | Ca trực |
| `/api/room/*` | Phòng |
| `/api/specialty/*` | Chuyên khoa |
| `/api/service/*` | Dịch vụ |
| `/api/exam-package/*` | Gói khám |
| `/api/medicine/*` | Thuốc |
| `/api/template/*` | Quy trình |
| `/api/ai-specialty/*` | AI mapping |
| `/api/queue/admin/*` | Queue admin |
| `/api/admin/dashboard/summary` | Dashboard |
| `/api/map-editor/*`, `/api/graph/*` | Bản đồ |
| `/api/display-screen/*` | Màn hình |
| `/api/infermedica/question-limit` | Triage config |

### Navigation — `modules/navigation/services/*`

| Endpoint | Mô tả |
|----------|--------|
| `/api/navigation/building/*/map` | Map tòa nhà |
| `/api/navigation/route` | Route indoor |
| `/api/graph/*/corridor-edits`, `/edge-edits` | Sửa graph |

### Next.js API routes (không qua NestJS trực tiếp)

| Route | Mô tả |
|-------|--------|
| `/api/translate` | Proxy Google Translate |
| `/api/vnpt/config`, `/key`, `/verify`, `/ocr` | VNPT OCR CCCD |

### External (không backend TriageFlow)

- Cloudinary upload
- Google Translate, DeepSeek (dịch câu hỏi triage)
- VNPT file/OCR API

---

## 8. Ghi chú & hạn chế

1. **Phân quyền FE ≠ phân quyền BE:** Guard chỉ ẩn UI/route; backend vẫn phải RBAC (theo `AGENTS.md`).
2. **Client-only guard:** Token trong localStorage có thể bị thao túng — bảo mật thực tế phụ thuộc API.
3. **Role alias:** Code runtime chấp nhận `PHARMACY`, `LAB_STAFF` nhưng type `StaffRole` có thể không liệt kê hết.
4. **Patient app:** Route `(patient)` có guard nhưng nhiều page chưa implement; kiosk là luồng BN chính.
5. **In đơn vs biên nhận:** Bác sĩ — `PrescriptionPrintView` (A5); Dược sĩ — `prescriptionReceiptPrint.ts` (57mm).
6. **Khám lâm sàng:** Lưu dạng `pe` object key-value trên visit-session; bác sĩ nhập **vị trí khám** tùy ý (không còn cố định Throat/Lungs...).
7. **Tài liệu API đầy đủ:** Swagger backend [https://www.triageflow.me/api-docs](https://www.triageflow.me/api-docs).

---

## Phụ lục: File service theo module

| Module | Service files |
|--------|----------------|
| `auth` | `authService.ts` |
| `clinical` | `clinicalService.ts`, `serviceOrderService.ts`, `doctorPrescriptionService.ts`, `notificationService.ts` |
| `ancillary` | `pharmacyService.ts`, `medicineService.ts` |
| `reception` | `receptionService.ts`, `infermedicaService.ts`, `symptomTriageService.ts`, `vnptService.ts`, … |
| `queue` | `queueService.ts`, `roomService.ts`, `roomDisplayService.ts` |
| `lab` | `labService.ts` |
| `payment` | `paymentService.ts` |
| `admin` | `adminService.ts`, `dashboardService.ts`, `staffService.ts`, `shiftService.ts`, `roomService.ts`, `specialtyService.ts`, `serviceCatalogService.ts`, `examPackageService.ts`, `medicineAdminService.ts`, `processService.ts`, `aiSpecialtyService.ts`, `queueAdminService.ts`, `roomServiceMappingService.ts`, `triageConfigService.ts`, `mapEditorService.ts` |
| `kiosk` | `authService.ts`, `bookingService.ts`, `packageBookingService.ts`, `flowService.ts`, `triageService.ts`, `kioskApiClient.ts` |
| `navigation` | `navigationService.ts`, `graphService.ts` |
| `display` | `displayScreenService.ts` |
| `shared` | `apiClient.ts`, `cloudinaryService.ts`, `authService.ts` (local token) |
| `patient`, `triage` | Stub / empty |

---

*Tài liệu được sinh từ rà soát codebase FE TriageFlow OPD. Khi thêm route hoặc service mới, cập nhật `routeAccess.ts`, Sidebar và file này.*
