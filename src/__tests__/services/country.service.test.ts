import { countryService } from "../../services/country.service"

jest.mock("../../repositories/country.repository", () => ({
  countryRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    hasBranches: jest.fn(),
  },
}))

import { countryRepository } from "../../repositories/country.repository"

const mockRepo = countryRepository as jest.Mocked<typeof countryRepository>

// ข้อมูลตัวอย่างที่จำลองแทน row จาก DB จริง
const fakeCountry = {
  id: 1n,
  name: "Thailand",
  code: "TH",
  currencyCode: "THB",
  timezone: "Asia/Bangkok",
  isActive: true,
  defaultDepositAmount: "5000.00",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const createPayload = {
  name: "Japan",
  code: "JP",
  currencyCode: "JPY",
  timezone: "Asia/Tokyo",
  isActive: true,
  defaultDepositAmount: 5000,
}

// รีเซ็ต mock ทุก function ก่อนแต่ละ test เพื่อไม่ให้ผลของ test ก่อนหน้ารั่วมา
beforeEach(() => {
  jest.clearAllMocks()
})

// ─────────────────────────────────────────────
describe("countryService.listCountries", () => {
  it("should return all countries from repository", async () => {
    mockRepo.findAll.mockResolvedValue([fakeCountry])

    const result = await countryService.listCountries()

    expect(mockRepo.findAll).toHaveBeenCalledTimes(1)
    expect(result).toEqual([fakeCountry])
  })
})

// ─────────────────────────────────────────────
describe("countryService.getCountry", () => {
  it("should return the country when found", async () => {
    mockRepo.findById.mockResolvedValue(fakeCountry)

    const result = await countryService.getCountry(1)

    expect(mockRepo.findById).toHaveBeenCalledWith(1)
    expect(result).toEqual(fakeCountry)
  })

  it("should throw AppError 404 when country is not found", async () => {
    mockRepo.findById.mockResolvedValue(null as any)

    await expect(countryService.getCountry(999)).rejects.toMatchObject({
      message: "Country not found",
      statusCode: 404,
      isAppError: true,
    })
  })
})

// ─────────────────────────────────────────────
describe("countryService.createCountry", () => {
  it("should create and return the new country when code is unique", async () => {
    mockRepo.findByCode.mockResolvedValue(null as any)
    mockRepo.create.mockResolvedValue({
      ...fakeCountry,
      ...createPayload,
      defaultDepositAmount: "5000.00",
    })

    const result = await countryService.createCountry(createPayload)

    expect(mockRepo.findByCode).toHaveBeenCalledWith("JP")
    expect(mockRepo.create).toHaveBeenCalledWith(createPayload)
    expect(result.code).toBe("JP")
  })

  it("should throw AppError 409 when country code already exists", async () => {
    mockRepo.findByCode.mockResolvedValue(fakeCountry) // TH มีอยู่แล้ว

    await expect(
      countryService.createCountry({ ...createPayload, code: "TH" }),
    ).rejects.toMatchObject({
      message: "Country code 'TH' already exists",
      statusCode: 409,
      isAppError: true,
    })

    expect(mockRepo.create).not.toHaveBeenCalled()
  })

  it("should throw AppError 400 when defaultDepositAmount is not positive", async () => {
    await expect(
      countryService.createCountry({ ...createPayload, defaultDepositAmount: 0 }),
    ).rejects.toMatchObject({
      message: "Default deposit amount must be greater than 0",
      statusCode: 400,
      isAppError: true,
    })

    expect(mockRepo.create).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
describe("countryService.updateCountry", () => {
  it("should throw AppError 404 when country is not found", async () => {
    mockRepo.findById.mockResolvedValue(null as any)

    await expect(
      countryService.updateCountry(999, { name: "Unknown" }),
    ).rejects.toMatchObject({
      message: "Country not found",
      statusCode: 404,
      isAppError: true,
    })

    expect(mockRepo.updateById).not.toHaveBeenCalled()
  })

  it("should update and return country when data is valid", async () => {
    const updated = { ...fakeCountry, name: "Kingdom of Thailand" }
    mockRepo.findById.mockResolvedValue(fakeCountry)
    mockRepo.updateById.mockResolvedValue(updated)

    const result = await countryService.updateCountry(1, {
      name: "Kingdom of Thailand",
    })

    expect(mockRepo.findByCode).not.toHaveBeenCalled() // ไม่มีการเปลี่ยน code
    expect(mockRepo.updateById).toHaveBeenCalledWith(1, {
      name: "Kingdom of Thailand",
    })
    expect(result?.name).toBe("Kingdom of Thailand")
  })

  it("should throw AppError 409 when new code already belongs to another country", async () => {
    const japanCountry = { ...fakeCountry, id: 2n, name: "Japan", code: "JP" }
    mockRepo.findById.mockResolvedValue(fakeCountry) // กำลังแก้ TH
    mockRepo.findByCode.mockResolvedValue(japanCountry) // JP มีอยู่แล้ว

    await expect(
      countryService.updateCountry(1, { code: "JP" }),
    ).rejects.toMatchObject({
      message: "Country code 'JP' already exists",
      statusCode: 409,
      isAppError: true,
    })

    expect(mockRepo.updateById).not.toHaveBeenCalled()
  })

  it("should skip code uniqueness check when code is unchanged", async () => {
    const updated = { ...fakeCountry, timezone: "Asia/Chiang_Mai" }
    mockRepo.findById.mockResolvedValue(fakeCountry)
    mockRepo.updateById.mockResolvedValue(updated)

    await countryService.updateCountry(1, { code: "TH", timezone: "Asia/Chiang_Mai" })

    // code เหมือนเดิม ไม่ต้องเรียก findByCode เลย
    expect(mockRepo.findByCode).not.toHaveBeenCalled()
    expect(mockRepo.updateById).toHaveBeenCalledTimes(1)
  })

  it("should throw AppError 400 when updating deposit to zero", async () => {
    mockRepo.findById.mockResolvedValue(fakeCountry)

    await expect(
      countryService.updateCountry(1, { defaultDepositAmount: 0 }),
    ).rejects.toMatchObject({
      message: "Default deposit amount must be greater than 0",
      statusCode: 400,
      isAppError: true,
    })
  })

  it("should throw AppError 409 when activating country with zero deposit", async () => {
    mockRepo.findById.mockResolvedValue({
      ...fakeCountry,
      defaultDepositAmount: "0",
      isActive: false,
    })

    await expect(
      countryService.updateCountry(1, { isActive: true }),
    ).rejects.toMatchObject({
      message: "Cannot activate a country without a positive default deposit amount",
      statusCode: 409,
      isAppError: true,
    })
  })
})

// ─────────────────────────────────────────────
describe("countryService.deleteCountry", () => {
  it("should throw AppError 404 when country is not found", async () => {
    mockRepo.findById.mockResolvedValue(null as any)

    await expect(countryService.deleteCountry(999)).rejects.toMatchObject({
      message: "Country not found",
      statusCode: 404,
      isAppError: true,
    })

    expect(mockRepo.hasBranches).not.toHaveBeenCalled()
    expect(mockRepo.deleteById).not.toHaveBeenCalled()
  })

  it("should throw AppError 409 when country has branches", async () => {
    mockRepo.findById.mockResolvedValue(fakeCountry)
    mockRepo.hasBranches.mockResolvedValue(true)

    await expect(countryService.deleteCountry(1)).rejects.toMatchObject({
      message: "Cannot delete a country that has branches. Please deactivate it instead.",
      statusCode: 409,
      isAppError: true,
    })

    expect(mockRepo.deleteById).not.toHaveBeenCalled()
  })

  it("should delete successfully when country has no branches", async () => {
    mockRepo.findById.mockResolvedValue(fakeCountry)
    mockRepo.hasBranches.mockResolvedValue(false)
    mockRepo.deleteById.mockResolvedValue(fakeCountry)

    await expect(countryService.deleteCountry(1)).resolves.toBeUndefined()

    expect(mockRepo.deleteById).toHaveBeenCalledWith(1)
  })
})
