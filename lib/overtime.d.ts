declare module '../lib/overtime' {
  export const updateUserOvertime: (date: string, hours: number) => Promise<void>;
}
