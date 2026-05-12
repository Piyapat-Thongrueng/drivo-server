import { jest } from "@jest/globals"

export const supabase = {
  auth: {
    getUser: jest.fn(),
  },
}
