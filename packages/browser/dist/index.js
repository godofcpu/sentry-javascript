Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var types_1 = require("@sentry/types");
exports.Severity = types_1.Severity;
exports.Status = types_1.Status;
var core_1 = require("@sentry/core");
exports.addGlobalEventProcessor = core_1.addGlobalEventProcessor;
exports.addBreadcrumb = core_1.addBreadcrumb;
exports.captureException = core_1.captureException;
exports.captureEvent = core_1.captureEvent;
exports.captureMessage = core_1.captureMessage;
exports.configureScope = core_1.configureScope;
exports.getHubFromCarrier = core_1.getHubFromCarrier;
exports.getCurrentHub = core_1.getCurrentHub;
exports.Hub = core_1.Hub;
exports.Scope = core_1.Scope;
exports.setContext = core_1.setContext;
exports.setExtra = core_1.setExtra;
exports.setExtras = core_1.setExtras;
exports.setTag = core_1.setTag;
exports.setTags = core_1.setTags;
exports.setUser = core_1.setUser;
exports.Span = core_1.Span;
exports.withScope = core_1.withScope;
var client_1 = require("./client");
exports.BrowserClient = client_1.BrowserClient;
var sdk_1 = require("./sdk");
exports.defaultIntegrations = sdk_1.defaultIntegrations;
exports.forceLoad = sdk_1.forceLoad;
exports.init = sdk_1.init;
exports.lastEventId = sdk_1.lastEventId;
exports.onLoad = sdk_1.onLoad;
exports.showReportDialog = sdk_1.showReportDialog;
exports.flush = sdk_1.flush;
exports.close = sdk_1.close;
exports.wrap = sdk_1.wrap;
var version_1 = require("./version");
exports.SDK_NAME = version_1.SDK_NAME;
exports.SDK_VERSION = version_1.SDK_VERSION;
var core_2 = require("@sentry/core");
var utils_1 = require("@sentry/utils");
var BrowserIntegrations = require("./integrations");
var Transports = require("./transports");
exports.Transports = Transports;
var windowIntegrations = {};
// This block is needed to add compatibility with the integrations packages when used with a CDN
// tslint:disable: no-unsafe-any
var _window = utils_1.getGlobalObject();
if (_window.Sentry && _window.Sentry.Integrations) {
    windowIntegrations = _window.Sentry.Integrations;
}
// tslint:enable: no-unsafe-any
var INTEGRATIONS = tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, windowIntegrations), core_2.Integrations), BrowserIntegrations);
exports.Integrations = INTEGRATIONS;
//# sourceMappingURL=index.js.map