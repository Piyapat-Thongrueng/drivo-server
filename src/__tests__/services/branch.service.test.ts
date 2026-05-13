import { branchService } from "../../services/branch.service";

jest.mock("../../repositories/branch.repository", () => ({
  branchRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    hasCars: jest.fn(),
    hasActiveBookings: jest.fn(),
  },
}));

jest.mock("../../repositories/country.repository", () => ({
  countryRepository: {
    findById: jest.fn(),
  },
}));

import { branchRepository } from "../../repositories/branch.repository";
import { countryRepository } from "../../repositories/country.repository";
import type { CreateBranchDto } from "../../types/dto/branch.dto";

const mockBranchRepo = branchRepository as jest.Mocked<typeof branchRepository>;
const mockCountryRepo = countryRepository as jest.Mocked<
  typeof countryRepository
>;

const fakeCountryActive = {
  id: 1n,
  name: "Thailand",
  code: "TH",
  currencyCode: "THB",
  timezone: "Asia/Bangkok",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const fakeCountryInactive = { ...fakeCountryActive, isActive: false };

const fakeBranch = {
  id: 1n,
  countryId: 1,
  name: "Suvarnabhumi",
  address: "Airport Rd",
  latitude: "13.68121900" as string | null,
  longitude: "100.74718300" as string | null,
  openingTime: "08:00:00" as string | null,
  closingTime: "20:00:00" as string | null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createBranchPayload: CreateBranchDto = {
  countryId: 1,
  name: "Suvarnabhumi",
  address: "Airport Rd",
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("branchService.listBranches", () => {
  it("should return all branches when countryId is omitted", async () => {
    mockBranchRepo.findAll.mockResolvedValue([fakeBranch] as never);

    const result = await branchService.listBranches();

    expect(mockBranchRepo.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([fakeBranch]);
  });

  it("should filter by countryId when provided", async () => {
    mockBranchRepo.findAll.mockResolvedValue([fakeBranch] as never);

    const result = await branchService.listBranches(1);

    expect(mockBranchRepo.findAll).toHaveBeenCalledWith(1);
    expect(result).toEqual([fakeBranch]);
  });
});

describe("branchService.getBranch", () => {
  it("should return the branch when found", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);

    const result = await branchService.getBranch(1);

    expect(mockBranchRepo.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual(fakeBranch);
  });

  it("should throw AppError 404 when branch is not found", async () => {
    mockBranchRepo.findById.mockResolvedValue(null as never);

    await expect(branchService.getBranch(999)).rejects.toMatchObject({
      message: "Branch not found",
      statusCode: 404,
      isAppError: true,
    });
  });
});

describe("branchService.createBranch", () => {
  it("should throw 404 when country does not exist", async () => {
    mockCountryRepo.findById.mockResolvedValue(null as never);

    await expect(
      branchService.createBranch(createBranchPayload),
    ).rejects.toMatchObject({
      message: "Country not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockCountryRepo.findById).toHaveBeenCalledWith(1);
    expect(mockBranchRepo.create).not.toHaveBeenCalled();
  });

  it("should throw 422 when country is inactive", async () => {
    mockCountryRepo.findById.mockResolvedValue(fakeCountryInactive as never);

    await expect(
      branchService.createBranch(createBranchPayload),
    ).rejects.toMatchObject({
      message:
        "Cannot add a branch to 'Thailand' because the country is inactive.",
      statusCode: 422,
      isAppError: true,
    });

    expect(mockBranchRepo.create).not.toHaveBeenCalled();
  });

  it("should create branch when country exists and is active", async () => {
    mockCountryRepo.findById.mockResolvedValue(fakeCountryActive as never);
    mockBranchRepo.create.mockResolvedValue(fakeBranch as never);

    const result = await branchService.createBranch(createBranchPayload);

    expect(mockBranchRepo.create).toHaveBeenCalledWith(createBranchPayload);
    expect(result).toEqual(fakeBranch);
  });
});

describe("branchService.updateBranch", () => {
  it("should throw 404 when branch does not exist", async () => {
    mockBranchRepo.findById.mockResolvedValue(null as never);

    await expect(
      branchService.updateBranch(999, { name: "X" }),
    ).rejects.toMatchObject({
      message: "Branch not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockBranchRepo.updateById).not.toHaveBeenCalled();
  });

  it("should update when branch exists", async () => {
    const updated = { ...fakeBranch, name: "Renamed" };
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockBranchRepo.updateById.mockResolvedValue(updated as never);

    const result = await branchService.updateBranch(1, { name: "Renamed" });

    expect(mockBranchRepo.updateById).toHaveBeenCalledWith(1, {
      name: "Renamed",
    });
    expect(result?.name).toBe("Renamed");
  });
});

describe("branchService.deleteBranch", () => {
  it("should throw 404 when branch does not exist", async () => {
    mockBranchRepo.findById.mockResolvedValue(null as never);

    await expect(branchService.deleteBranch(999)).rejects.toMatchObject({
      message: "Branch not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockBranchRepo.hasCars).not.toHaveBeenCalled();
    expect(mockBranchRepo.deleteById).not.toHaveBeenCalled();
  });

  it("should throw 409 when branch has cars (does not check bookings)", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockBranchRepo.hasCars.mockResolvedValue(true);

    await expect(branchService.deleteBranch(1)).rejects.toMatchObject({
      message:
        "Cannot delete a branch that has cars. Please move all cars out first.",
      statusCode: 409,
      isAppError: true,
    });

    expect(mockBranchRepo.hasActiveBookings).not.toHaveBeenCalled();
    expect(mockBranchRepo.deleteById).not.toHaveBeenCalled();
  });

  it("should throw 409 when branch has active bookings", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockBranchRepo.hasCars.mockResolvedValue(false);
    mockBranchRepo.hasActiveBookings.mockResolvedValue(true);

    await expect(branchService.deleteBranch(1)).rejects.toMatchObject({
      message: "Cannot delete a branch that has active bookings.",
      statusCode: 409,
      isAppError: true,
    });

    expect(mockBranchRepo.deleteById).not.toHaveBeenCalled();
  });

  it("should delete when no cars and no active bookings", async () => {
    mockBranchRepo.findById.mockResolvedValue(fakeBranch as never);
    mockBranchRepo.hasCars.mockResolvedValue(false);
    mockBranchRepo.hasActiveBookings.mockResolvedValue(false);
    mockBranchRepo.deleteById.mockResolvedValue(fakeBranch as never);

    await expect(branchService.deleteBranch(1)).resolves.toBeUndefined();

    expect(mockBranchRepo.deleteById).toHaveBeenCalledWith(1);
  });
});
