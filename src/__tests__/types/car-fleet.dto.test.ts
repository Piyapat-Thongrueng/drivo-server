import { fleetQuerySchema } from "../../types/dto/car.dto"

describe("fleetQuerySchema", () => {
  it("accepts empty query", () => {
    expect(fleetQuerySchema.parse({})).toEqual({})
  })

  it("accepts countryId", () => {
    expect(fleetQuerySchema.parse({ countryId: "2" })).toEqual({
      countryId: 2,
    })
  })
})
