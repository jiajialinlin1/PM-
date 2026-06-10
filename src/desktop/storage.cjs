const fs = require('node:fs');
const path = require('node:path');

function createStore(app, safeStorage) {
  const filePath = path.join(app.getPath('userData'), 'quota-state.json');

  function readState() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return {};
    }
  }

  function writeState(nextState) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  }

  function getToken() {
    const state = readState();
    if (!state.encryptedToken) {
      return '';
    }

    return safeStorage.decryptString(Buffer.from(state.encryptedToken, 'base64'));
  }

  function saveToken(token) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统加密能力不可用，无法安全保存 token');
    }

    const state = readState();
    const encryptedToken = safeStorage.encryptString(token).toString('base64');
    writeState({ ...state, encryptedToken });
  }

  function clearToken() {
    const state = readState();
    delete state.encryptedToken;
    writeState(state);
  }

  function getCache() {
    return readState().cache || null;
  }

  function saveCache(cache) {
    const state = readState();
    writeState({ ...state, cache });
  }

  return {
    getToken,
    saveToken,
    clearToken,
    getCache,
    saveCache
  };
}

module.exports = {
  createStore
};
