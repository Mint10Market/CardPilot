import {
  __name,
  init_esm
} from "./chunk-ESLEIWM3.mjs";

// ../../../../../../private/var/folders/lb/mtv55j8x703cn929g58hk7r80000gn/T/cursor-sandbox-cache/e7b5e983b9ed7293cf4b525f2eeed4e2/npm/_npx/f51a09bd0abf5f10/node_modules/uncrypto/dist/crypto.node.mjs
init_esm();
import nodeCrypto from "node:crypto";
var subtle = nodeCrypto.webcrypto?.subtle || {};
var randomUUID = /* @__PURE__ */ __name(() => {
  return nodeCrypto.randomUUID();
}, "randomUUID");
var getRandomValues = /* @__PURE__ */ __name((array) => {
  return nodeCrypto.webcrypto.getRandomValues(array);
}, "getRandomValues");
var _crypto = {
  randomUUID,
  getRandomValues,
  subtle
};
export {
  _crypto as default,
  getRandomValues,
  randomUUID,
  subtle
};
//# sourceMappingURL=crypto.node-IFJYNGGX.mjs.map
