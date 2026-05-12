import { Request, Response, NextFunction } from "express"
import { errorMiddleware } from "../../middlewares/error.middleware"
import { AppError } from "../../utils/error"

const mockReq = {} as Request
const mockNext = jest.fn() as NextFunction

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe("errorMiddleware", () => {
  describe("when error is an AppError", () => {
    it("should return the correct statusCode and message", () => {
      const res = mockRes()
      const err: AppError = {
        message: "User not found",
        statusCode: 404,
        isAppError: true,
      }

      errorMiddleware(err, mockReq, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      })
    })

    it("should return 403 for forbidden AppError", () => {
      const res = mockRes()
      const err: AppError = {
        message: "Forbidden",
        statusCode: 403,
        isAppError: true,
      }

      errorMiddleware(err, mockReq, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Forbidden",
      })
    })
  })

  describe("when error is an unexpected Error", () => {
    it("should return 500 with generic message", () => {
      const res = mockRes()
      const err = new Error("Database connection failed")

      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      errorMiddleware(err, mockReq, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
      })

      consoleSpy.mockRestore()
    })

    it("should not expose the original error message to client", () => {
      const res = mockRes()
      const err = new Error("SECRET: db password is abc123")

      jest.spyOn(console, "error").mockImplementation()

      errorMiddleware(err, mockReq, res, mockNext)

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0]
      expect(jsonCall.message).not.toContain("SECRET")
    })
  })
})
