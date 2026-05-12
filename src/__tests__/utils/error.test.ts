import { createError } from "../../utils/error"

describe("createError", () => {
  it("should return an AppError with the correct shape", () => {
    const err = createError("Not found", 404)

    expect(err.message).toBe("Not found")
    expect(err.statusCode).toBe(404)
    expect(err.isAppError).toBe(true)
  })

  it("should return different statusCodes correctly", () => {
    const err400 = createError("Bad request", 400)
    const err500 = createError("Internal server error", 500)

    expect(err400.statusCode).toBe(400)
    expect(err500.statusCode).toBe(500)
  })

  it("should always set isAppError to true", () => {
    const err = createError("Forbidden", 403)

    expect(err.isAppError).toBe(true)
  })
})
