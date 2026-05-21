# Drivo — Backend Agent Rules

## Project Overview

**Drivo** is a worldwide car rental booking platform backend API.
Built with Express.js + TypeScript + Drizzle ORM + Supabase PostgreSQL.

This project is evaluated on 4 criteria:
1. **Code Structure** — File organization, Efficiency, Readability, Maintainability
2. **API Design** — Endpoint naming and appropriate HTTP method usage
3. **Security** — Safe usage patterns and secure code
4. **Database Management** — Schema design, data modeling, storage approach

---

## Tech Stack

```
Runtime:      Node.js
Framework:    Express.js + TypeScript
Database:     PostgreSQL (Supabase)
ORM:          Drizzle ORM
Schema file:  ./src/db/schema.ts
Auth:         Supabase Authentication (JWT verification)
Payment:      Stripe
Jobs:         node-cron
Validation:   Zod

Server port:  4000
Base URL:     /api
Example:      http://localhost:4000/api/cars
```

---

## Environment Variables

```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PORT=4000
CORS_ORIGINS=https://drivo-gamma.vercel.app,http://localhost:3000
```

`CORS_ORIGINS` — comma-separated frontend origins for CORS. Omit locally to use default localhost ports.

- **NEVER hardcode** these values in code
- **NEVER commit** .env file to git
- ใช้ `process.env.VARIABLE_NAME` เสมอ
- ถ้ามี env ใหม่เพิ่มในอนาคต ให้เพิ่มใน .env.example ด้วย

---

## Architecture — 4 Layers

ทุก feature ต้องผ่าน 4 layers นี้เสมอ ห้ามข้ามขั้นตอน

```
Request จาก Frontend
  ↓
Routes       → ระบุ URL + method + middleware เท่านั้น ไม่มี logic
  ↓
Controllers  → รับ request, เรียก service, ส่ง response
  ↓
Services     → business logic ทั้งหมด
  ↓
Repositories → database queries อย่างเดียว
  ↓
Database (Supabase PostgreSQL)
```

**ตัวอย่างให้เห็นชัด**

```typescript
// routes/car.routes.ts — แค่บอกว่า URL อะไร ใช้ middleware ไหน
router.get('/cars/:id', authMiddleware, getCarById)

// controllers/car.controller.ts — รับ request ส่ง response
async function getCarById(req, res, next) {
  try {
    const carId = Number(req.params.id)
    const car = await carService.findById(carId)
    res.json({ success: true, data: car })
  } catch (error) {
    next(error)
  }
}

// services/car.service.ts — business logic
async function findById(carId) {
  const car = await carRepository.findById(carId)

  // ถ้าไม่เจอรถ ให้หยุดทันที
  if (!car) {
    throw createError('Car not found', 404)
  }

  return car
}

// repositories/car.repository.ts — query database เท่านั้น
async function findById(carId) {
  const result = await db
    .select()
    .from(cars)
    .where(eq(cars.id, carId))
    .limit(1)

  return result[0] ?? null
}
```

---

## Project Structure

```
src/
├── index.ts                    # entry point — start server
├── app.ts                      # express setup — middleware, routes
│
├── routes/                     # URL + middleware เท่านั้น
│   ├── index.ts                # รวม routes ทั้งหมด
│   ├── auth.routes.ts
│   ├── booking.routes.ts
│   ├── car.routes.ts
│   ├── branch.routes.ts
│   ├── country.routes.ts
│   ├── handover.routes.ts
│   ├── member.routes.ts
│   ├── payment.routes.ts
│   └── report.routes.ts
│
├── controllers/                # รับ request ส่ง response
│   ├── auth.controller.ts
│   ├── booking.controller.ts
│   ├── car.controller.ts
│   ├── branch.controller.ts
│   ├── country.controller.ts
│   ├── handover.controller.ts
│   ├── member.controller.ts
│   ├── payment.controller.ts
│   └── report.controller.ts
│
├── services/                   # business logic
│   ├── auth.service.ts
│   ├── booking.service.ts
│   ├── car.service.ts
│   ├── branch.service.ts
│   ├── country.service.ts
│   ├── handover.service.ts
│   ├── member.service.ts
│   ├── payment.service.ts
│   ├── pricing.service.ts      # pricing calculation logic
│   └── report.service.ts
│
├── repositories/               # database queries only
│   ├── booking.repository.ts
│   ├── car.repository.ts
│   ├── branch.repository.ts
│   ├── country.repository.ts
│   ├── handover.repository.ts
│   ├── member.repository.ts
│   ├── payment.repository.ts
│   └── user.repository.ts
│
├── middlewares/
│   ├── auth.middleware.ts      # verify JWT token
│   ├── role.middleware.ts      # check user role
│   ├── error.middleware.ts     # global error handler
│   └── validate.middleware.ts  # validate request body with Zod
│
├── db/
│   ├── index.ts                # drizzle connection
│   └── schema.ts               # pulled from Supabase — DO NOT edit manually
│
├── types/
│   ├── index.ts                # re-export all types
│   └── dto/                    # request body types (Zod schemas)
│       ├── auth.dto.ts
│       ├── booking.dto.ts
│       ├── car.dto.ts
│       └── handover.dto.ts
│
├── utils/
│   ├── error.ts                # createError helper
│   ├── pricing.ts              # pricing rules calculation
│   └── date.ts                 # timezone helpers
│
└── jobs/
    └── booking.job.ts          # cron job — auto cancel expired bookings
```

---

## Readability Rules

- Write code as if a junior developer will read it tomorrow
- Prefer clear and descriptive variable names over short ones
- Break complex logic into small named functions with a single responsibility
- Add comments to explain WHY, not WHAT (the code already shows what)
- Avoid clever one-liners — split into multiple readable lines instead
- Each function should do one thing only

```typescript
// ❌ อ่านยาก
const total = items.reduce((a, b) => a + (b.s === 'c' ? b.amt : 0), 0)

// ✅ อ่านง่าย
const completedItems = items.filter(item => item.status === 'completed')
const total = completedItems.reduce((sum, item) => {
  return sum + item.amount
}, 0)

// ❌ ชื่อตัวแปรสั้นเกิน
const u = await userRepo.findById(id)
const b = await bookingRepo.findByUser(u.id)

// ✅ ชื่อสื่อความหมาย
const user = await userRepo.findById(id)
const userBookings = await bookingRepo.findByUser(user.id)

// ✅ comment อธิบาย WHY
// คำนวณราคาจากเวลาจริงที่คืนรถ ไม่ใช่เวลาที่ user เลือกตอนจอง
// เพราะ user อาจคืนช้าหรือเร็วกว่ากำหนด
const finalPrice = calculatePrice(actualReturnTime, hourlyRate, dailyRate)
```

---

## Error Handling Rules

### createError Helper

```typescript
// utils/error.ts
// ใช้ function ธรรมดา ไม่ต้องใช้ class
export function createError(message, statusCode) {
  return {
    message,
    statusCode,
    isAppError: true  // ใช้ flag นี้แยก error ของเราออกจาก error อื่น
  }
}
```

### การใช้งานใน Service

```typescript
// ถ้าไม่เจอข้อมูล →던 error ออกมาเลย ไม่ต้องจัดการ response เอง
if (!car) {
  throw createError('Car not found', 404)
}

// ถ้ารถไม่ว่าง
if (!isAvailable) {
  throw createError('Car is not available for selected dates', 409)
}

// ถ้าไม่มีสิทธิ์
if (user.role !== 'super_admin') {
  throw createError('You do not have permission', 403)
}
```

### Global Error Handler

```typescript
// app.ts — ใส่บรรทัดนี้หลัง routes ทั้งหมด
// เหตุผล: Express อ่าน middleware ตามลำดับ error handler ต้องอยู่สุดท้าย
app.use((err, req, res, next) => {

  // error ที่เราสร้างเองด้วย createError
  if (err.isAppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
  }

  // error ที่ไม่คาดคิด เช่น database crash
  // ไม่แสดงรายละเอียดให้ user เห็น เพราะอาจมีข้อมูล sensitive
  console.error('Unexpected error:', err)
  res.status(500).json({
    success: false,
    message: 'Something went wrong'
  })
})
```

### Controller Pattern

```typescript
// controller แค่ส่ง error ต่อให้ global handler จัดการ
// ไม่ต้องเขียน if error ในทุก controller
async function getCar(req, res, next) {
  try {
    const carId = Number(req.params.id)
    const car = await carService.findById(carId)
    res.json({ success: true, data: car })
  } catch (error) {
    next(error) // ส่งไปให้ global error handler
  }
}
```

---

## API Response Format

```typescript
// ✅ สำเร็จ — ข้อมูลชิ้นเดียว
res.json({
  success: true,
  data: car
})

// ✅ สำเร็จ — list
res.json({
  success: true,
  data: cars
})

// ✅ สร้างสำเร็จ
res.status(201).json({
  success: true,
  message: 'Booking created successfully',
  data: newBooking
})

// ✅ Error (จัดการโดย global error handler อัตโนมัติ)
{
  "success": false,
  "message": "Car not found"
}
```

---

## API Design Rules

### HTTP Methods

```
GET    → ดึงข้อมูล
POST   → สร้างข้อมูลใหม่
PATCH  → แก้ไขข้อมูลบางส่วน
DELETE → ลบข้อมูล
```

### Endpoint Naming

```
# ใช้ noun (คำนาม) ไม่ใช่ verb และเขียน plural เสมอ

✅ GET    /api/cars
✅ GET    /api/cars/:id
✅ POST   /api/cars
✅ PATCH  /api/cars/:id
✅ DELETE /api/cars/:id

# action พิเศษ ใช้ sub-resource
✅ PATCH  /api/bookings/:id/approve
✅ PATCH  /api/bookings/:id/reject
✅ POST   /api/bookings/:id/pickup
✅ POST   /api/bookings/:id/return

❌ GET  /api/getCars
❌ POST /api/approveBooking
❌ GET  /api/car
```

### HTTP Status Codes

```
200 → สำเร็จ
201 → สร้างสำเร็จ
400 → request ผิดพลาด เช่น validation error
401 → ยังไม่ได้ login
403 → login แล้วแต่ไม่มีสิทธิ์
404 → ไม่พบข้อมูล
409 → ข้อมูล conflict เช่น รถถูกจองแล้ว
500 → server error
```

---

## Auth Middleware

```typescript
// middlewares/auth.middleware.ts
// ตรวจสอบ JWT token ทุก request ที่ต้อง login
export async function authMiddleware(req, res, next) {
  // ดึง token จาก header
  const token = req.headers.authorization?.replace('Bearer ', '')

  // ถ้าไม่มี token แสดงว่ายังไม่ได้ login
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Please login to continue'
    })
  }

  // ส่ง token ให้ Supabase ตรวจสอบ
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }

  // ดึงข้อมูล user จาก database เพื่อเอา role และ branch_id
  const userProfile = await userRepository.findByAuthId(user.id)

  if (!userProfile) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    })
  }

  // เก็บข้อมูล user ไว้ใน request ให้ controller ใช้ต่อ
  req.user = {
    id:       userProfile.id,
    role:     userProfile.role,
    branchId: userProfile.branchId
  }

  next()
}
```

### Role Middleware

```typescript
// middlewares/role.middleware.ts
// เช็คว่า user มี role ที่อนุญาตไหม
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      })
    }

    next()
  }
}

// ใช้งานใน routes
router.post('/bookings', authMiddleware, requireRole('user'), createBooking)
router.patch('/bookings/:id/approve', authMiddleware, requireRole('super_admin'), approveBooking)
router.post('/handovers', authMiddleware, requireRole('branch_staff', 'super_admin'), createHandover)
```

### Branch Staff Scope

```typescript
// branch_staff เห็นได้เฉพาะข้อมูลของ branch ตัวเองเท่านั้น
// เช็คใน service ก่อน query database
async function getBranchBookings(branchId, requestingUser) {

  // ถ้าเป็น branch_staff ต้องเป็น branch ของตัวเองเท่านั้น
  if (requestingUser.role === 'branch_staff') {
    if (branchId !== requestingUser.branchId) {
      throw createError('You can only access your own branch', 403)
    }
  }

  return bookingRepository.findByBranch(branchId)
}
```

---

## Validation Rules (Zod)

```typescript
// types/dto/booking.dto.ts
// validate ข้อมูลก่อน process ป้องกัน invalid data เข้า database
import { z } from 'zod'

export const createBookingSchema = z.object({
  carId:           z.number().positive(),
  pickupBranchId:  z.number().positive(),
  dropoffBranchId: z.number().positive(),
  pickupDatetime:  z.string().datetime(),
  dropoffDatetime: z.string().datetime(),
}).refine(
  (data) => new Date(data.dropoffDatetime) > new Date(data.pickupDatetime),
  { message: 'Drop-off time must be after pick-up time' }
)

// middlewares/validate.middleware.ts
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors[0].message
      })
    }

    // ถ้าผ่าน validation แล้ว ใช้ข้อมูลที่ clean แล้วจาก Zod
    req.body = result.data
    next()
  }
}

// ใช้งานใน routes
router.post(
  '/bookings',
  authMiddleware,
  requireRole('user'),
  validate(createBookingSchema),
  createBooking
)
```

---

## Pricing Rules (สำคัญมาก — reviewer จะทดสอบ)

```typescript
// utils/pricing.ts
// คำนวณราคาตาม rules ที่ reviewer กำหนด ต้องถูกต้อง 100%
// ทุก calculation ต้องใช้ timezone ของ branch เสมอ

// อัตรา 2 แบบ: รายชั่วโมง + รายวัน
// Rule 1: คืน **เกิน** 14:00 น. (ไม่รวม 14:00 พอดี) → วันนั้น = 1 วัน
// Rule 2: ใช้ **เกิน** 8 ชั่วโมง = 1 วัน
// Rule 3: ข้ามวัน → reset นับชั่วโมงใหม่จากเวลารับรถของวันถัดไป (ไม่ใช่ 00:00)

// ตัวอย่าง reviewer:
// 10:00 → 12:00 วันเดียวกัน = 2 ชม.
// 10:00 → 15:00 วันเดียวกัน = 1 วัน   (เกิน 14:00)
// 10:00 → 14:00 วันเดียวกัน = 4 ชม.  (ไม่เกิน 14:00, ไม่เกิน 8 ชม.)
// 10:00 → 19:00 วันเดียวกัน = 1 วัน   (เกิน 8 ชม.)
// 10:00 วันที่ 1 → 11:00 วันที่ 2 = 1 วัน + 1 ชม.

// ราคาสุดท้าย
// = (จำนวนวัน × dailyRate) + (จำนวนชั่วโมง × hourlyRate)
// + addonAmount + oneWayFee + damageCharge + fuelCharge
```

---

## Cron Job

```typescript
// jobs/booking.job.ts
// auto cancel booking ที่ไม่จ่ายเงินภายใน 15 นาที หลัง admin approve
import cron from 'node-cron'

export function startBookingJob() {
  // รันทุก 1 นาที
  cron.schedule('* * * * *', async () => {
    // หา booking ที่ approved แล้วแต่ payment_deadline ผ่านมาแล้ว
    await db
      .update(bookings)
      .set({
        status:      'cancelled',
        cancelledAt: new Date(),
        updatedAt:   new Date()
      })
      .where(
        and(
          eq(bookings.status, 'approved'),
          lt(bookings.paymentDeadline, new Date())
        )
      )
  })
}

// src/index.ts
startBookingJob()
```

---

## Database Rules

```
Schema file: ./src/db/schema.ts
→ File นี้ถูก pull มาจาก Supabase อัตโนมัติ
→ ห้าม edit โดยตรง
→ ถ้าต้องการเปลี่ยน schema ให้แก้ใน Supabase แล้ว pull ใหม่

การ query ทั้งหมดต้องอยู่ใน repositories เท่านั้น
ห้าม query database ใน controllers หรือ services โดยตรง
```

---

## Security Rules

```
✅ ใช้ SUPABASE_SERVICE_ROLE_KEY บน server เท่านั้น
✅ ใช้ STRIPE_SECRET_KEY บน server เท่านั้น
✅ Validate ทุก request body ด้วย Zod ก่อน process
✅ ใช้ Drizzle query — ป้องกัน SQL injection อัตโนมัติ
✅ ไม่ return password หรือ sensitive data ใน response
✅ ตั้งค่า CORS ระบุ origin ที่อนุญาตชัดเจน

❌ ห้าม hardcode API keys ใน code
❌ ห้าม log token หรือ password
❌ ห้าม return stack trace ใน error response
❌ ห้าม commit .env ขึ้น git
```

---

## Naming Conventions

```
Files:       camelCase          → booking.service.ts
Functions:   camelCase          → async function findById()
Variables:   camelCase          → const userBookings = []
Constants:   UPPER_SNAKE_CASE   → const MAX_RETRY = 3
Types:       PascalCase         → type CreateBookingDto = {}
```

---

## What NOT To Do

```typescript
// ❌ ห้ามใช้ any
const data: any = req.body

// ❌ ห้าม query database ใน controller
async function getCar(req, res) {
  const car = await db.select().from(cars).where(...) // ❌ ต้องอยู่ใน repository
}

// ❌ ห้ามใส่ business logic ใน repository
async function findAvailableCars() {
  const price = calculatePrice(...) // ❌ ต้องอยู่ใน service
}

// ❌ ห้าม hardcode values
const deadline = new Date(Date.now() + 15 * 60 * 1000) // ❌
const PAYMENT_DEADLINE_MS = 15 * 60 * 1000             // ✅ ใช้ named constant
const deadline = new Date(Date.now() + PAYMENT_DEADLINE_MS)

// ❌ ห้าม log sensitive data
console.log('Token:', token)    // ❌
console.log('User logged in')   // ✅

// ❌ ห้ามเขียน one-liner ที่อ่านยาก
const r = u ? await bR.fBU(u.id) : null // ❌

// ✅ เขียนให้อ่านง่าย
if (!user) return null
const bookings = await bookingRepository.findByUserId(user.id) // ✅
```
