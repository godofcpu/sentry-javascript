Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var types_1 = require("@sentry/types");
var utils_1 = require("@sentry/utils");
var base_1 = require("./base");
/** `XHR` based transport */
var XHRTransport = /** @class */ (function (_super) {
    tslib_1.__extends(XHRTransport, _super);
    function XHRTransport() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * @inheritDoc
     */
    XHRTransport.prototype.sendEvent = function (event) {
        var _this = this;
        return this._buffer.add(new utils_1.SyncPromise(function (resolve, reject) {
            var request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState !== 4) {
                    return;
                }
                if (request.status === 200) {
                    resolve({
                        status: types_1.Status.fromHttpCode(request.status),
                    });
                }
                reject(request);
            };
            request.open('POST', _this.url);
            request.send(JSON.stringify(event));
        }));
    };
    return XHRTransport;
}(base_1.BaseTransport));
exports.XHRTransport = XHRTransport;
//# sourceMappingURL=xhr.js.map