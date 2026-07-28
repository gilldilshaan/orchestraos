/** Mock data is the default until a real backend is wired up; set NEXT_PUBLIC_USE_MOCK=false to hit the live API. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Simulated network latency so loading states are exercised the same way real requests would trigger them. */
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
