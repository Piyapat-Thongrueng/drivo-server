import { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { validate } from "../../middlewares/validate.middleware"

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const testSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
})

describe("validate middleware", () => {
  describe("when request body is valid", () => {
    it("should call next() and replace req.body with parsed data", () => {
      const req = {
        body: { firstName: "John", lastName: "Doe" },
      } as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      validate(testSchema)(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.body).toEqual({ firstName: "John", lastName: "Doe" })
      expect(res.status).not.toHaveBeenCalled()
    })

    it("should pass through optional fields when provided", () => {
      const req = {
        body: { firstName: "John", lastName: "Doe", phone: "0812345678" },
      } as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      validate(testSchema)(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.body.phone).toBe("0812345678")
    })
  })

  describe("when request body is invalid", () => {
    it("should return 400 with error message when required field is missing", () => {
      const req = {
        body: { firstName: "John" },
      } as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      validate(testSchema)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.any(String),
      })
      expect(next).not.toHaveBeenCalled()
    })

    it("should return 400 when required string field is empty", () => {
      const req = {
        body: { firstName: "", lastName: "Doe" },
      } as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      validate(testSchema)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "First name is required",
      })
      expect(next).not.toHaveBeenCalled()
    })

    it("should return 400 when body is empty", () => {
      const req = { body: {} } as Request
      const res = mockRes()
      const next = jest.fn() as NextFunction

      validate(testSchema)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
