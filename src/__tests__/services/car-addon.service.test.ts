import { carAddonService } from "../../services/car-addon.service";

jest.mock("../../repositories/car.repository", () => ({
  carRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("../../repositories/car-addon.repository", () => ({
  carAddonRepository: {
    findAllByCarId: jest.fn(),
    findByIdAndCarId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

import { carRepository } from "../../repositories/car.repository";
import { carAddonRepository } from "../../repositories/car-addon.repository";
import type { CreateCarAddonDto } from "../../types/dto/car-addon.dto";

const mockCarRepo = carRepository as jest.Mocked<typeof carRepository>;
const mockAddonRepo = carAddonRepository as jest.Mocked<typeof carAddonRepository>;

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

const fakeAddon = {
  id: 1n,
  carId: 10,
  name: "GPS Navigator",
  description: "Sat nav",
  pricePerDay: "200.00",
  isAvailable: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createPayload: CreateCarAddonDto = {
  name: "GPS Navigator",
  description: "Sat nav",
  pricePerDay: 200,
  isAvailable: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("carAddonService.listAddons", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(carAddonService.listAddons(999)).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.findAllByCarId).not.toHaveBeenCalled();
  });

  it("should pass onlyAvailable=true when user is guest (no req.user)", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findAllByCarId.mockResolvedValue([fakeAddon] as never);

    const result = await carAddonService.listAddons(10, undefined);

    expect(mockAddonRepo.findAllByCarId).toHaveBeenCalledWith(10, true);
    expect(result).toEqual([fakeAddon]);
  });

  it("should pass onlyAvailable=true when user is not super_admin", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findAllByCarId.mockResolvedValue([fakeAddon] as never);

    const user = { id: 1, role: "user" as const, branchId: null };
    const result = await carAddonService.listAddons(10, user);

    expect(mockAddonRepo.findAllByCarId).toHaveBeenCalledWith(10, true);
    expect(result).toEqual([fakeAddon]);
  });

  it("should pass onlyAvailable=false when user is super_admin", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findAllByCarId.mockResolvedValue([fakeAddon] as never);

    const admin = { id: 1, role: "super_admin" as const, branchId: null };
    const result = await carAddonService.listAddons(10, admin);

    expect(mockAddonRepo.findAllByCarId).toHaveBeenCalledWith(10, false);
    expect(result).toEqual([fakeAddon]);
  });
});

describe("carAddonService.createAddon", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(
      carAddonService.createAddon(999, createPayload),
    ).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.create).not.toHaveBeenCalled();
  });

  it("should create addon when car exists", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.create.mockResolvedValue(fakeAddon as never);

    const result = await carAddonService.createAddon(10, createPayload);

    expect(mockAddonRepo.create).toHaveBeenCalledWith(10, createPayload);
    expect(result).toEqual(fakeAddon);
  });
});

describe("carAddonService.updateAddon", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(
      carAddonService.updateAddon(999, 1, { pricePerDay: 250 }),
    ).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.findByIdAndCarId).not.toHaveBeenCalled();
  });

  it("should throw 404 when addon does not belong to this car", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findByIdAndCarId.mockResolvedValue(null as never);

    await expect(
      carAddonService.updateAddon(10, 1, { pricePerDay: 250 }),
    ).rejects.toMatchObject({
      message: "Addon not found for this car",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.updateById).not.toHaveBeenCalled();
  });

  it("should update addon when car and addon match", async () => {
    const updated = { ...fakeAddon, pricePerDay: "250.00" };
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findByIdAndCarId.mockResolvedValue(fakeAddon as never);
    mockAddonRepo.updateById.mockResolvedValue(updated as never);

    const result = await carAddonService.updateAddon(10, 1, {
      pricePerDay: 250,
    });

    expect(mockAddonRepo.updateById).toHaveBeenCalledWith(1, 10, {
      pricePerDay: 250,
    });
    expect(result?.pricePerDay).toBe("250.00");
  });

  it("should throw 404 when update returns no row (defensive)", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findByIdAndCarId.mockResolvedValue(fakeAddon as never);
    mockAddonRepo.updateById.mockResolvedValue(null as never);

    await expect(
      carAddonService.updateAddon(10, 1, { isAvailable: false }),
    ).rejects.toMatchObject({
      message: "Addon not found for this car",
      statusCode: 404,
      isAppError: true,
    });
  });
});

describe("carAddonService.deleteAddon", () => {
  it("should throw 404 when car does not exist", async () => {
    mockCarRepo.findById.mockResolvedValue(null as never);

    await expect(carAddonService.deleteAddon(999, 1)).rejects.toMatchObject({
      message: "Car not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.deleteById).not.toHaveBeenCalled();
  });

  it("should throw 404 when addon does not belong to this car", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findByIdAndCarId.mockResolvedValue(null as never);

    await expect(carAddonService.deleteAddon(10, 1)).rejects.toMatchObject({
      message: "Addon not found for this car",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockAddonRepo.deleteById).not.toHaveBeenCalled();
  });

  it("should delete when car and addon match", async () => {
    mockCarRepo.findById.mockResolvedValue(fakeCar as never);
    mockAddonRepo.findByIdAndCarId.mockResolvedValue(fakeAddon as never);

    await expect(carAddonService.deleteAddon(10, 1)).resolves.toBeUndefined();

    expect(mockAddonRepo.deleteById).toHaveBeenCalledWith(1, 10);
  });
});
