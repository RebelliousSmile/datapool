// Substitut de $app/state pour vitest : une page modifiable par les tests.
export const page: { url: URL; params: Record<string, string>; route: { id: string | null } } = {
  url: new URL('http://localhost/pools/p'),
  params: {},
  route: { id: null },
};
