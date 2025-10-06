const assert = require('assert');
const Module = require('module');
const path = require('path');

const secretValues = {
  KKIA_WEBHOOK_SECRET: 'test-secret',
  KKIA_PUBLIC: 'pub',
  KKIA_PRIVATE: 'priv',
  KKIA_SECRET: 'sec',
  KKIA_SANDBOX: 'false',
};

let mockVerificationResponse = {
  status: 'SUCCESS',
  isPaymentSucces: true,
};

function mockModule(name, exportsValue) {
  const resolved = Module._resolveFilename(name, {
    id: __filename,
    filename: __filename,
    paths: Module._nodeModulePaths(path.dirname(__filename)),
  });
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: exportsValue,
  };
}

mockModule('firebase-functions', {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
});
mockModule('firebase-functions/v2/firestore', {
  onDocumentCreated: (_path, handler) => handler,
  onDocumentUpdated: (_path, handler) => handler,
});
mockModule('firebase-functions/v2/storage', {
  onObjectFinalized: (_path, handler) => handler,
});
class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function wrapOptions(handlerOrOptions, maybeHandler) {
  if (typeof handlerOrOptions === 'function') {
    return handlerOrOptions;
  }
  return maybeHandler;
}
mockModule('firebase-functions/v2/https', {
  onCall: wrapOptions,
  onRequest: wrapOptions,
  HttpsError,
});
mockModule('firebase-functions/params', {
  defineSecret: name => ({
    value: () => secretValues[name] ?? '',
  }),
});
mockModule('@kkiapay-org/nodejs-sdk', {
  kkiapay: () => ({
    verify: async () => mockVerificationResponse,
  }),
});

const snapshots = new Map();

const cloneData = data => (data === undefined ? data : JSON.parse(JSON.stringify(data)));

function resetSnapshots() {
  snapshots.clear();
}

function setDoc(pathValue, data, merge) {
  const existing = snapshots.get(pathValue);
  let finalData;
  if (merge && existing && existing.exists) {
    finalData = { ...cloneData(existing.data()), ...cloneData(data) };
  } else {
    finalData = cloneData(data);
  }
  snapshots.set(pathValue, {
    exists: true,
    data: () => cloneData(finalData),
  });
}

function getDoc(pathValue) {
  const existing = snapshots.get(pathValue);
  if (existing) {
    const cloned = cloneData(existing.data());
    return {
      exists: true,
      data: () => cloneData(cloned),
    };
  }
  return {
    exists: false,
    data: () => undefined,
  };
}

function makeCollectionRef(pathValue) {
  return {
    doc: id => makeDocRef(`${pathValue}/${id}`),
  };
}

function makeDocRef(pathValue) {
  return {
    path: pathValue,
    id: pathValue.split('/').pop(),
    set: async (data, options) => setDoc(pathValue, data, options?.merge),
    get: async () => getDoc(pathValue),
    collection: sub => makeCollectionRef(`${pathValue}/${sub}`),
  };
}

const FieldValue = {
  serverTimestamp: () => ({ __type: 'serverTimestamp' }),
  increment: value => ({ __type: 'increment', value }),
};

const transaction = {
  async get(ref) {
    return getDoc(ref.path);
  },
  set(ref, data, options) {
    setDoc(ref.path, data, options?.merge);
    return Promise.resolve();
  },
  update(ref, data) {
    setDoc(ref.path, data, true);
    return Promise.resolve();
  },
};

const dbStub = {
  collection: name => makeCollectionRef(name),
  runTransaction: async fn => fn(transaction),
};

function firestore() {
  return dbStub;
}
firestore.FieldValue = FieldValue;

const adminStub = {
  initializeApp: () => {},
  firestore,
};
mockModule('firebase-admin', adminStub);
mockModule('firebase-admin/storage', {
  getStorage: () => ({ bucket: () => ({}) }),
});

const functions = require('../lib/index.js');

async function runWebhookTest() {
  resetSnapshots();
  mockVerificationResponse = {
    status: 'SUCCESS',
    isPaymentSucces: true,
  };
  const partnerId = 'intent-webhook';
  setDoc(`voteIntents/${partnerId}`, {
    contestId: 'contest-42',
    candidateId: 'candidate-99',
    amount: 3000,
    userId: 'user-7',
  });

  const req = {
    method: 'POST',
    header: name => (name === 'x-kkiapay-secret' ? 'test-secret' : undefined),
    body: {
      transactionId: 'tx-abc',
      partnerId,
      amount: 3000,
      event: 'transaction.success',
      isPaymentSucces: true,
    },
  };
  const res = {
    statusCode: null,
    sent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.payload = payload;
      this.sent = true;
      return this;
    },
  };

  await functions.kkiapayWebhook(req, res);

  assert.strictEqual(res.statusCode, 204, 'expected HTTP 204');
  const paymentSnap = getDoc('payments/tx-abc');
  assert.ok(paymentSnap.exists, 'payment doc should exist');
  const paymentData = paymentSnap.data();
  assert.strictEqual(paymentData.candidateId, 'candidate-99', 'candidateId should be merged into payment');
  assert.strictEqual(paymentData.contestId, 'contest-42', 'contestId should be merged into payment');
  assert.strictEqual(paymentData.transactionId, 'tx-abc');
  assert.strictEqual(paymentData.status, 'success');
}

async function runVerifyCallableTest() {
  resetSnapshots();
  const partnerId = 'intent-callable';
  setDoc(`voteIntents/${partnerId}`, {
    contestId: 'contest-55',
    candidateId: 'candidate-77',
    amount: 5000,
    userId: 'user-17',
  });

  mockVerificationResponse = {
    status: 'SUCCESS',
    isPaymentSucces: true,
    partnerId,
    amount: 5000,
  };

  await functions.verifyKkiapay({
    data: {
      transactionId: 'tx-callable',
      partnerId,
      amount: 5000,
    },
  });

  const paymentSnap = getDoc('payments/tx-callable');
  assert.ok(paymentSnap.exists, 'callable payment doc should exist');
  const paymentData = paymentSnap.data();
  assert.strictEqual(paymentData.candidateId, 'candidate-77');
  assert.strictEqual(paymentData.contestId, 'contest-55');
  assert.strictEqual(paymentData.partnerId, partnerId);
  assert.strictEqual(paymentData.status, 'success');

  const voteIntentSnap = getDoc(`voteIntents/${partnerId}`);
  assert.strictEqual(voteIntentSnap.data().status, 'counted', 'intent should be counted');

  const voteSnap = getDoc('contests/contest-55/votes/tx-callable');
  assert.ok(voteSnap.exists, 'vote record should exist');
}

(async () => {
  try {
    await runWebhookTest();
    await runVerifyCallableTest();
    console.log('kkiapay webhook & callable tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
