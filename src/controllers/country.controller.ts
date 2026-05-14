import { NextFunction, Request, Response } from "express"
import { countryService } from "../services/country.service"
import { CreateCountryDto, UpdateCountryDto } from "../types/dto/country.dto"

// GET /api/countries
async function listCountries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countries = await countryService.listCountries()

    res.json({
      success: true,
      data: countries,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/countries/:id
async function getCountry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const country = await countryService.getCountry(id)

    res.json({
      success: true,
      data: country,
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/countries
async function createCountry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateCountryDto
    const country = await countryService.createCountry(data)

    res.status(201).json({
      success: true,
      message: "Country created successfully",
      data: country,
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/countries/:id
async function updateCountry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    const data = req.body as UpdateCountryDto
    const country = await countryService.updateCountry(id, data)

    res.json({
      success: true,
      message: "Country updated successfully",
      data: country,
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/countries/:id
async function deleteCountry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id)
    await countryService.deleteCountry(id)

    res.json({
      success: true,
      message: "Country deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

export const countryController = {
  listCountries,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
}
