import { NextFunction, Request, Response } from "express"
import { pricingService } from "../services/pricing.service"
import type { PricingPreviewDto } from "../types/dto/pricing.dto"

async function previewPricing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as PricingPreviewDto
    const result = await pricingService.previewPricing(dto)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export const pricingController = { previewPricing }
