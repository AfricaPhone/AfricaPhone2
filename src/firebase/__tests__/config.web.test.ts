const mockAuthInstance = { user: 'auth-instance' };
const mockDbInstance = { collection: jest.fn(), tag: 'db-instance' };

const mockFirebase = {
  initializeApp: jest.fn(() => {
    mockFirebase.apps.push({ name: 'default' });
    return {};
  }),
  auth: jest.fn(() => mockAuthInstance),
  firestore: jest.fn(() => mockDbInstance),
  apps: [] as unknown[],
};

jest.mock('firebase/compat/app', () => ({
  __esModule: true,
  default: mockFirebase,
}));

jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));

const loadWebConfig = () => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../config.web') as { db: unknown; auth: unknown };
};

describe('firebase/config.web', () => {
  beforeEach(() => {
    mockFirebase.initializeApp.mockClear();
    mockFirebase.auth.mockClear();
    mockFirebase.firestore.mockClear();
    mockFirebase.apps.length = 0;
  });

  it('initializes Firebase when no app exists', () => {
    const config = loadWebConfig();

    expect(mockFirebase.initializeApp).toHaveBeenCalledTimes(1);
    expect(mockFirebase.firestore).toHaveBeenCalledTimes(1);
    expect(mockFirebase.auth).toHaveBeenCalledTimes(1);
    expect(config.db).toBe(mockDbInstance);
    expect(config.auth).toBe(mockAuthInstance);
  });

  it('reuses the existing app when already initialized', () => {
    mockFirebase.apps.push({ name: 'default' });

    loadWebConfig();

    expect(mockFirebase.initializeApp).not.toHaveBeenCalled();
    expect(mockFirebase.firestore).toHaveBeenCalledTimes(1);
    expect(mockFirebase.auth).toHaveBeenCalledTimes(1);
  });
});
