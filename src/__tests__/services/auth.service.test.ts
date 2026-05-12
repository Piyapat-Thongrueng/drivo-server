import { authService } from "../../services/auth.service"

jest.mock("../../repositories/user.repository", () => ({
  userRepository: {
    findByAuthId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  },
}))

import { userRepository } from "../../repositories/user.repository"

const mockRepo = userRepository as jest.Mocked<typeof userRepository>

const fakeUser = {
  id: 1n,
  authId: "auth-uuid-123",
  role: "branch_staff" as const,
  status: "active" as const,
  firstName: "John",
  lastName: "Doe",
  phone: null,
  avatarUrl: null,
  branchId: null,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe("authService.registerProfile", () => {
  describe("when user does not exist yet", () => {
    it("should create a new profile and return isNew: true", async () => {
      mockRepo.findByAuthId.mockResolvedValue(null as any)
      mockRepo.create.mockResolvedValue(fakeUser)

      const result = await authService.registerProfile("auth-uuid-123", {
        firstName: "John",
        lastName: "Doe",
      })

      expect(mockRepo.create).toHaveBeenCalledWith("auth-uuid-123", {
        firstName: "John",
        lastName: "Doe",
      })
      expect(result.isNew).toBe(true)
      expect(result.profile).toEqual(fakeUser)
    })
  })

  describe("when user already exists (double-submit)", () => {
    it("should update the existing profile and return isNew: false", async () => {
      const updatedUser = { ...fakeUser, firstName: "Jane" }
      mockRepo.findByAuthId.mockResolvedValue(fakeUser)
      mockRepo.updateById.mockResolvedValue(updatedUser)

      const result = await authService.registerProfile("auth-uuid-123", {
        firstName: "Jane",
        lastName: "Doe",
      })

      expect(mockRepo.create).not.toHaveBeenCalled()
      expect(mockRepo.updateById).toHaveBeenCalledWith(Number(fakeUser.id), {
        firstName: "Jane",
        lastName: "Doe",
      })
      expect(result.isNew).toBe(false)
      expect(result.profile.firstName).toBe("Jane")
    })

    it("should return the existing row if updateById returns null", async () => {
      mockRepo.findByAuthId.mockResolvedValue(fakeUser)
      mockRepo.updateById.mockResolvedValue(null as any)

      const result = await authService.registerProfile("auth-uuid-123", {
        firstName: "John",
        lastName: "Doe",
      })

      expect(result.isNew).toBe(false)
      expect(result.profile).toEqual(fakeUser)
    })
  })
})

describe("authService.getMyProfile", () => {
  it("should return the user profile when found", async () => {
    mockRepo.findById.mockResolvedValue(fakeUser)

    const result = await authService.getMyProfile(1)

    expect(mockRepo.findById).toHaveBeenCalledWith(1)
    expect(result).toEqual(fakeUser)
  })

  it("should throw AppError 404 when user is not found", async () => {
    mockRepo.findById.mockResolvedValue(null as any)

    await expect(authService.getMyProfile(999)).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
      isAppError: true,
    })
  })
})

describe("authService.updateMyProfile", () => {
  it("should return updated profile when user exists", async () => {
    const updatedUser = { ...fakeUser, phone: "0812345678" }
    mockRepo.updateById.mockResolvedValue(updatedUser)

    const result = await authService.updateMyProfile(1, { phone: "0812345678" })

    expect(mockRepo.updateById).toHaveBeenCalledWith(1, { phone: "0812345678" })
    expect(result.phone).toBe("0812345678")
  })

  it("should throw AppError 404 when user is not found", async () => {
    mockRepo.updateById.mockResolvedValue(null as any)

    await expect(
      authService.updateMyProfile(999, { firstName: "Ghost" }),
    ).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
      isAppError: true,
    })
  })
})
