import type { OtpProvider, OtpProviderResult } from "../service";

export const mockProvider: OtpProvider = {
  async sendOtp(waNumber: string, code: string): Promise<OtpProviderResult> {
    // In development: log OTP to console for easy testing
    if (process.env.NODE_ENV !== "production") {
    }
    return { success: true };
  },
};
