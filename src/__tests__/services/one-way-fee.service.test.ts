import { oneWayFeeService } from "../../services/one-way-fee.service";

jest.mock("../../repositories/branch.repository", () => ({
  branchRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("../../repositories/one-way-fee.repository", () => ({
  oneWayFeeRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByPair: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  },
}));

import { branchRepository } from "../../repositories/branch.repository";
import { oneWayFeeRepository } from "../../repositories/one-way-fee.repository";

const mockBranchRepo = branchRepository as jest.Mocked<typeof branchRepository>;
const mockFeeRepo = oneWayFeeRepository as jest.Mocked<
  typeof oneWayFeeRepository
>;

const fakeBranchA = {
  id: 1n,
  countryId: 1,
  name: "Branch A",
  address: "A",
  latitude: null,
  longitude: null,
  openingTime: null,
  closingTime: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const fakeBranchB = { ...fakeBranchA, id: 2n, name: "Branch B" };

const fakeFeeRow = {
  id: 10n,
  fromBranchId: 1,
  toBranchId: 2,
  fee: "500.00",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createFeePayload = { fromBranchId: 1, toBranchId: 2, fee: 500 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("oneWayFeeService.listFees", () => {
  it("should forward optional filters to repository", async () => {
    mockFeeRepo.findAll.mockResolvedValue([fakeFeeRow] as never);

    const result = await oneWayFeeService.listFees(1, 2);

    expect(mockFeeRepo.findAll).toHaveBeenCalledWith(1, 2);
    expect(result).toEqual([fakeFeeRow]);
  });
});

describe("oneWayFeeService.setFee", () => {
  it("should throw 422 when from and to are the same branch", async () => {
    await expect(
      oneWayFeeService.setFee({ fromBranchId: 1, toBranchId: 1, fee: 100 }),
    ).rejects.toMatchObject({
      message: "From and To branches cannot be the same",
      statusCode: 422,
      isAppError: true,
    });

    expect(mockBranchRepo.findById).not.toHaveBeenCalled();
    expect(mockFeeRepo.create).not.toHaveBeenCalled();
  });

  it("should throw 404 when from branch does not exist", async () => {
    mockBranchRepo.findById.mockResolvedValueOnce(null as never);

    await expect(
      oneWayFeeService.setFee(createFeePayload),
    ).rejects.toMatchObject({
      message: "From branch (id: 1) not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockFeeRepo.create).not.toHaveBeenCalled();
  });

  it("should throw 404 when to branch does not exist", async () => {
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchA as never);
    mockBranchRepo.findById.mockResolvedValueOnce(null as never);

    await expect(
      oneWayFeeService.setFee(createFeePayload),
    ).rejects.toMatchObject({
      message: "To branch (id: 2) not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockFeeRepo.create).not.toHaveBeenCalled();
  });

  it("should throw 409 when fee pair already exists", async () => {
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchA as never);
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchB as never);
    mockFeeRepo.findByPair.mockResolvedValueOnce(fakeFeeRow as never);

    await expect(
      oneWayFeeService.setFee(createFeePayload),
    ).rejects.toMatchObject({
      statusCode: 409,
      isAppError: true,
    });

    expect(mockFeeRepo.create).not.toHaveBeenCalled();
  });

  it("should create forward fee and auto-create reverse when reverse missing", async () => {
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchA as never);
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchB as never);
    mockFeeRepo.findByPair
      .mockResolvedValueOnce(null as never) // existing forward pair
      .mockResolvedValueOnce(null as never); // reverse pair check
    mockFeeRepo.create
      .mockResolvedValueOnce(fakeFeeRow as never)
      .mockResolvedValueOnce({
        ...fakeFeeRow,
        id: 11n,
        fromBranchId: 2,
        toBranchId: 1,
        fee: "0",
      } as never);

    const result = await oneWayFeeService.setFee(createFeePayload);

    expect(mockFeeRepo.create).toHaveBeenCalledTimes(2);
    expect(mockFeeRepo.create).toHaveBeenNthCalledWith(1, {
      fromBranchId: 1,
      toBranchId: 2,
      fee: "500",
    });
    expect(mockFeeRepo.create).toHaveBeenNthCalledWith(2, {
      fromBranchId: 2,
      toBranchId: 1,
      fee: "0",
    });
    expect(result).toEqual(fakeFeeRow);
  });

  it("should create only forward fee when reverse already exists", async () => {
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchA as never);
    mockBranchRepo.findById.mockResolvedValueOnce(fakeBranchB as never);
    mockFeeRepo.findByPair
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ ...fakeFeeRow, id: 99n } as never);
    mockFeeRepo.create.mockResolvedValueOnce(fakeFeeRow as never);

    const result = await oneWayFeeService.setFee(createFeePayload);

    expect(mockFeeRepo.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(fakeFeeRow);
  });
});

describe("oneWayFeeService.updateFee", () => {
  it("should throw 404 when fee row not found", async () => {
    mockFeeRepo.findById.mockResolvedValue(null as never);

    await expect(
      oneWayFeeService.updateFee(999, { fee: 100 }),
    ).rejects.toMatchObject({
      message: "One-way fee not found",
      statusCode: 404,
      isAppError: true,
    });

    expect(mockFeeRepo.updateById).not.toHaveBeenCalled();
  });

  it("should update when fee exists", async () => {
    const updated = { ...fakeFeeRow, fee: "150.00" };
    mockFeeRepo.findById.mockResolvedValue(fakeFeeRow as never);
    mockFeeRepo.updateById.mockResolvedValue(updated as never);

    const result = await oneWayFeeService.updateFee(10, { fee: 150 });

    expect(mockFeeRepo.updateById).toHaveBeenCalledWith(10, { fee: 150 });
    expect(result?.fee).toBe("150.00");
  });
});
