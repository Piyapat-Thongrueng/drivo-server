import { Request, Response, NextFunction } from "express"
import { requireRole } from "../../middlewares/role.middleware"

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe("requireRole", () => {
  describe("when user has an allowed role", () => {
    it("should call next()", () => {
      const req = {
        user: { id: 1, role: "super_admin", branchId: null },
      } as unknown as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      requireRole("super_admin")(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it("should allow when multiple roles are provided and user matches one", () => {
      const req = {
        user: { id: 1, role: "branch_staff", branchId: 1 },
      } as unknown as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      requireRole("super_admin", "branch_staff")(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe("when user does not have an allowed role", () => {
    it("should return 403 with correct message", () => {
      const req = {
        user: { id: 1, role: "user", branchId: null },
      } as unknown as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      requireRole("super_admin")(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You do not have permission to access this resource",
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe("when req.user is undefined", () => {
    it("should return 403", () => {
      const req = {} as unknown as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      requireRole("super_admin")(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
