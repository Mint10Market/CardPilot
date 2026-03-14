import {
  esm_exports,
  init_esm as init_esm2
} from "./chunk-VV4LW7RY.mjs";
import {
  __commonJS,
  __name,
  __toCommonJS,
  init_esm
} from "./chunk-ESLEIWM3.mjs";

// ../../../../../../private/var/folders/lb/mtv55j8x703cn929g58hk7r80000gn/T/cursor-sandbox-cache/e7b5e983b9ed7293cf4b525f2eeed4e2/npm/_npx/f51a09bd0abf5f10/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-unsupported.js
var require_getMachineId_unsupported = __commonJS({
  "../../../../../../private/var/folders/lb/mtv55j8x703cn929g58hk7r80000gn/T/cursor-sandbox-cache/e7b5e983b9ed7293cf4b525f2eeed4e2/npm/_npx/f51a09bd0abf5f10/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-unsupported.js"(exports) {
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getMachineId = void 0;
    var api_1 = (init_esm2(), __toCommonJS(esm_exports));
    async function getMachineId() {
      api_1.diag.debug("could not read machine-id: unsupported platform");
      return void 0;
    }
    __name(getMachineId, "getMachineId");
    exports.getMachineId = getMachineId;
  }
});
export default require_getMachineId_unsupported();
//# sourceMappingURL=getMachineId-unsupported-VSQDZ7QK.mjs.map
