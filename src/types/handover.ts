import { fuelLevel, handoverType } from "../db/schema"

export type HandoverType = (typeof handoverType.enumValues)[number]
export type FuelLevel = (typeof fuelLevel.enumValues)[number]
export type PhotoAngle = "front" | "back" | "left" | "right"

export const PHOTO_ANGLES: readonly PhotoAngle[] = ["front", "back", "left", "right"]

export interface HandoverPhoto {
  id: number
  handoverId: number
  storagePath: string
  url: string
  angle: PhotoAngle | null
  createdAt: string
}

export interface Handover {
  id: number
  bookingId: number
  type: HandoverType
  branchId: number
  handledBy: number
  actualDatetime: string
  fuelLevel: FuelLevel
  damageNote: string | null
  extraCharge: string
  createdAt: string
}

export interface HandoverWithPhotos extends Handover {
  photos: HandoverPhoto[]
}
