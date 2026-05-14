import { carService } from "../../services/car.service";

// ─── Mock repositories ────────────────────────────────────────────────────────
jest.mock("../../repositories/car.repository", () => ({
  carRepository: {
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    findById: jest.fn(),
    findByLicensePlate: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    softDelete: jest.fn(),
    hasActiveBookings: jest.fn(),
  },
}));

jest.mock("../../repositories/branch.repository", () => ({
  branchRepository: {
    findById: jest.fn(),
  },
}));

import { carRepository } from "../../repositories/car.repository";
import { branchRepository } from "../../repositories/branch.repository";
import type { CreateCarDto } from "../../types/dto/car.dto";

const mockCarRepo = carRepository as jest.Mocked<typeof carRepository>;
const mockBranchRepo = branchRepository as jest.Mocked<typeof branchRepository>;

// ─── Fake data ────────────────────────────────────────────────────────────────

const fakeBranch = {
  id: 1n,
  countryId: 1,
  name: "Bangkok Airport",
  address: "Airport Rd",
  latitude: null,
  longitude: null,
  openingTime: null,
  closingTime: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const fakeCar = {
  id: 10n,
  branchId: 1,
  currentBranchId: 1,
  make: "Toyota",
  model: "Camry",
  year: 2022,
  color: "Silver",
  licensePlate: "ABC-1234",
  imageUrl: null,
  carType: "sedan" as const,
  seats: 5,
  luggageCapacity: 3,
  doors: 4,
  transmission: "auto" as const,
  fuelType: "gasoline" as const,
  hourlyRate: "200.00",
  dailyRate: "1500.00",
  description: null,
  status: "available" as const,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
};

const createCarPayload: CreateCarDto = {
  branchId: 1,
  make: "Toyota",
  model: "Camry",
  year: 2022,
  color: "Silver",
  licensePlate: "ABC-1234",
  carType: "sedan",
  seats: 5,
  luggageCapacity: 3,
  doors: 4,
  transmission: "auto",
  fuelType: "gasoline",
  hourlyRate: 200,
  dailyRate: 1500,
  status: "available",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── listCars ─────────────────────────────────────────────────────────────────

describe("carService.listCars", () => {
  it("should return all cars when no branchId is given", async () => {
    mockCarRepo.findAll.mockResolvedValue([fakeCar] as never);

    const result = await carService.listCars();

    expect(mockCarRepo.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([fakeCar]);
  });

  it("should filter by branchId when provided", async () => {
    mockCarRepo.findAll.mockResolvedValue([fakeCar] as never);

    const result = await carService.listCars(1);

    expect(mockCarRepo.findAll).toHaveBeenCalledWith(1);
    expect(result).toEqual([fakeCar]);
  });
});

// ─── getAvailableCars ─────────────────────────────────────────────────────────

describe("carService.getAvailableCars", () => {
  it("should forward all query params to repository", async () => {
    mockCarRepo.findAvailable.mockResolvedValue([fakeCar] as never);

    const query = {
      pickupBranchId: 1,
      pickupDatetime: "2024-06-01T08:00:00Z",
      dropoffDatetime: "2024-06-03T08:00:00Z",
    };

    const result = await carService.getAvailableCars(query);

    expect(mockCarRepo.findAvailable).toHaveBeenCalledWith(
      1,
      query.pickupDatetime,
      query.dropoffDatetime,
    );
    expect(result).toEqual([fakeCar]);
  });
});

// ─── getCar ───────────────────────────────────────────────────────────────────

describe("carService.getCar", () => {
  it("should return the car when found", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);

    const result = await carService.getCar(10);

    expect(mockCarRepo.findById).toHaveBeenCalledWith(10);
    expect(result).toEqual(fakeCar);
  });

  it("should throw AppError 404 when car is not found", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(carService.getCar(999)).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });
  });
});

// ─── createCar ────────────────────────────────────────────────────────────────

describe("carService.createCar", () => {
  it("should throw 404 when branch does not exist", async () => {
    mockBranchRepo.findById.mockResolvedValue(null as never);

    await expect(carService.createCar(createCarPayload)).rejects.toMatchObject({
      message: "Branch not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockBranchRepo.findById).toHaveBeenCalledWith(1);
    expect(mockCarRepo.create).not.toHaveBeenCalled();
  });

  it("should throw 409 when licensePlate is already registered", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockCarRepo.findByLicensePlate.mockResolvedValue(fakeCar as never);

    await expect(carService.createCar(createCarPayload)).rejects.toMatchObject({
      message: "License plate 'ABC-1234' is already registered.",
      statusCode: 409,
      isAppError: true,
    });

    expect(mockCarRepo.create).not.toHaveBeenCalled();
  });

  it("should create car when branch exists and licensePlate is unique", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockCarRepo.findByLicensePlate.mockResolvedValue(null as never);
    mockCarRepo.create.mockResolvedValue(fakeCar as never);

    const result = await carService.createCar(createCarPayload);

    expect(mockCarRepo.create).toHaveBeenCalledWith(createCarPayload);
    expect(result).toEqual(fakeCar);
  });
});

// ─── updateCar ────────────────────────────────────────────────────────────────

describe("carService.updateCar", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(
      carService.updateCar(999, { make: "Honda" }),
    ).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockCarRepo.updateById).not.toHaveBeenCalled();
  });

  it("should throw 409 when setting status to maintenance with active bookings", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockCarRepo.hasActiveBookings.mockResolvedValue(true);

    await expect(
      carService.updateCar(10, { status: "maintenance" }),
    ).rejects.toMatchObject({
      message:
        "Cannot set car to maintenance while it has confirmed or active bookings.",
      statusCode: 409,
      isAppError: true,
    });

    expect(mockCarRepo.updateById).not.toHaveBeenCalled();
  });

  it("should allow maintenance status when no active bookings", async () => {
    const maintenanceCar = { ...fakeCar, status: "maintenance" as const };
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockCarRepo.hasActiveBookings.mockResolvedValue(false);
    mockCarRepo.updateById.mockResolvedValue(maintenanceCar as never);

    const result = await carService.updateCar(10, { status: "maintenance" });

    expect(mockCarRepo.hasActiveBookings).toHaveBeenCalledWith(10);
    expect(mockCarRepo.updateById).toHaveBeenCalledWith(10, {
      status: "maintenance",
    });
    expect(result?.status).toBe("maintenance");
  });

  it("should update without booking check when status is not changed to maintenance", async () => {
    const updatedCar = { ...fakeCar, color: "Red" };
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockCarRepo.updateById.mockResolvedValue(updatedCar as never);

    const result = await carService.updateCar(10, { color: "Red" });

    // ไม่ต้องเช็ค booking เพราะไม่ได้เปลี่ยนสถานะ
    expect(mockCarRepo.hasActiveBookings).not.toHaveBeenCalled();
    expect(mockCarRepo.updateById).toHaveBeenCalledWith(10, { color: "Red" });
    expect(result?.color).toBe("Red");
  });
});

// ─── deleteCar ────────────────────────────────────────────────────────────────

describe("carService.deleteCar", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(carService.deleteCar(999)).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockCarRepo.hasActiveBookings).not.toHaveBeenCalled();
    expect(mockCarRepo.softDelete).not.toHaveBeenCalled();
  });

  it("should throw 409 when car has confirmed or active bookings", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockCarRepo.hasActiveBookings.mockResolvedValue(true);

    await expect(carService.deleteCar(10)).rejects.toMatchObject({
      message: "Cannot delete a car that has confirmed or active bookings.",
      statusCode: 409,
      isAppError: true,
    });

    expect(mockCarRepo.softDelete).not.toHaveBeenCalled();
  });

  it("should soft delete when no active bookings", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockCarRepo.hasActiveBookings.mockResolvedValue(false);
    mockCarRepo.softDelete.mockResolvedValue({
      ...fakeCar,
      deletedAt: new Date().toISOString(),
    } as never);

    await expect(carService.deleteCar(10)).resolves.toBeUndefined();

    expect(mockCarRepo.softDelete).toHaveBeenCalledWith(10);
  });
});
