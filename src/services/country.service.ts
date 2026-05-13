import { countryRepository } from "../repositories/country.repository"
import { CreateCountryDto, UpdateCountryDto } from "../types/dto/country.dto"
import { createError } from "../utils/error"

async function listCountries() {
  return countryRepository.findAll()
}

async function getCountry(id: number) {
  const country = await countryRepository.findById(id)

  if (!country) {
    throw createError("Country not found", 404)
  }

  return country
}

async function createCountry(data: CreateCountryDto) {
  const existing = await countryRepository.findByCode(data.code)

  if (existing) {
    throw createError(`Country code '${data.code}' already exists`, 409)
  }

  return countryRepository.create(data)
}

async function updateCountry(id: number, data: UpdateCountryDto) {
  const country = await countryRepository.findById(id)

  if (!country) {
    throw createError("Country not found", 404)
  }

  // ถ้ามีการเปลี่ยน code ให้ตรวจว่า code ใหม่ซ้ำกับประเทศอื่นไหม
  if (data.code && data.code !== country.code) {
    const existing = await countryRepository.findByCode(data.code)

    if (existing) {
      throw createError(`Country code '${data.code}' already exists`, 409)
    }
  }

  return countryRepository.updateById(id, data)
}

async function deleteCountry(id: number) {
  const country = await countryRepository.findById(id)

  if (!country) {
    throw createError("Country not found", 404)
  }

  // ถ้ามี branch อยู่ในประเทศนี้ ลบไม่ได้ — ต้องปิด is_active แทน
  const hasBranches = await countryRepository.hasBranches(id)

  if (hasBranches) {
    throw createError(
      "Cannot delete a country that has branches. Please deactivate it instead.",
      409,
    )
  }

  await countryRepository.deleteById(id)
}

export const countryService = {
  listCountries,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
}
