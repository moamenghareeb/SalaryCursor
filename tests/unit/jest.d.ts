import '@testing-library/jest-dom';

declare global {
  const describe: (name: string, fn: () => void) => void;
  const test: (name: string, fn: () => void) => void;
  const expect: jest.Expect;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const jest: typeof import('@jest/globals')['jest'];
}
