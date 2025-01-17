Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_1 = require("@sentry/core");
var types_1 = require("@sentry/types");
var utils_1 = require("@sentry/utils");
var helpers_1 = require("../helpers");
var global = utils_1.getGlobalObject();
var lastHref;
/** Default Breadcrumbs instrumentations */
var Breadcrumbs = /** @class */ (function () {
    /**
     * @inheritDoc
     */
    function Breadcrumbs(options) {
        /**
         * @inheritDoc
         */
        this.name = Breadcrumbs.id;
        this._options = tslib_1.__assign({ console: true, dom: true, fetch: true, history: true, sentry: true, xhr: true }, options);
    }
    /** JSDoc */
    Breadcrumbs.prototype._instrumentConsole = function () {
        if (!('console' in global)) {
            return;
        }
        ['debug', 'info', 'warn', 'error', 'log', 'assert'].forEach(function (level) {
            if (!(level in global.console)) {
                return;
            }
            utils_1.fill(global.console, level, function (originalConsoleLevel) {
                return function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    var breadcrumbData = {
                        category: 'console',
                        data: {
                            extra: {
                                arguments: utils_1.normalize(args, 3),
                            },
                            logger: 'console',
                        },
                        level: types_1.Severity.fromString(level),
                        message: utils_1.safeJoin(args, ' '),
                    };
                    if (level === 'assert') {
                        if (args[0] === false) {
                            breadcrumbData.message = "Assertion failed: " + (utils_1.safeJoin(args.slice(1), ' ') || 'console.assert');
                            breadcrumbData.data.extra.arguments = utils_1.normalize(args.slice(1), 3);
                            Breadcrumbs.addBreadcrumb(breadcrumbData, {
                                input: args,
                                level: level,
                            });
                        }
                    }
                    else {
                        Breadcrumbs.addBreadcrumb(breadcrumbData, {
                            input: args,
                            level: level,
                        });
                    }
                    // this fails for some browsers. :(
                    if (originalConsoleLevel) {
                        Function.prototype.apply.call(originalConsoleLevel, global.console, args);
                    }
                };
            });
        });
    };
    /** JSDoc */
    Breadcrumbs.prototype._instrumentDOM = function () {
        if (!('document' in global)) {
            return;
        }
        // Capture breadcrumbs from any click that is unhandled / bubbled up all the way
        // to the document. Do this before we instrument addEventListener.
        global.document.addEventListener('click', helpers_1.breadcrumbEventHandler('click'), false);
        global.document.addEventListener('keypress', helpers_1.keypressEventHandler(), false);
        // After hooking into document bubbled up click and keypresses events, we also hook into user handled click & keypresses.
        ['EventTarget', 'Node'].forEach(function (target) {
            var proto = global[target] && global[target].prototype;
            if (!proto || !proto.hasOwnProperty || !proto.hasOwnProperty('addEventListener')) {
                return;
            }
            utils_1.fill(proto, 'addEventListener', function (original) {
                return function (eventName, fn, options) {
                    if (fn && fn.handleEvent) {
                        if (eventName === 'click') {
                            utils_1.fill(fn, 'handleEvent', function (innerOriginal) {
                                return function (event) {
                                    helpers_1.breadcrumbEventHandler('click')(event);
                                    return innerOriginal.call(this, event);
                                };
                            });
                        }
                        if (eventName === 'keypress') {
                            utils_1.fill(fn, 'handleEvent', function (innerOriginal) {
                                return function (event) {
                                    helpers_1.keypressEventHandler()(event);
                                    return innerOriginal.call(this, event);
                                };
                            });
                        }
                    }
                    else {
                        if (eventName === 'click') {
                            helpers_1.breadcrumbEventHandler('click', true)(this);
                        }
                        if (eventName === 'keypress') {
                            helpers_1.keypressEventHandler()(this);
                        }
                    }
                    return original.call(this, eventName, fn, options);
                };
            });
            utils_1.fill(proto, 'removeEventListener', function (original) {
                return function (eventName, fn, options) {
                    var callback = fn;
                    try {
                        callback = callback && (callback.__sentry_wrapped__ || callback);
                    }
                    catch (e) {
                        // ignore, accessing __sentry_wrapped__ will throw in some Selenium environments
                    }
                    return original.call(this, eventName, callback, options);
                };
            });
        });
    };
    /** JSDoc */
    Breadcrumbs.prototype._instrumentFetch = function () {
        if (!utils_1.supportsNativeFetch()) {
            return;
        }
        utils_1.fill(global, 'fetch', function (originalFetch) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var fetchInput = args[0];
                var method = 'GET';
                var url;
                if (typeof fetchInput === 'string') {
                    url = fetchInput;
                }
                else if ('Request' in global && fetchInput instanceof Request) {
                    url = fetchInput.url;
                    if (fetchInput.method) {
                        method = fetchInput.method;
                    }
                }
                else {
                    url = String(fetchInput);
                }
                if (args[1] && args[1].method) {
                    method = args[1].method;
                }
                var client = core_1.getCurrentHub().getClient();
                var dsn = client && client.getDsn();
                if (dsn) {
                    var filterUrl = new core_1.API(dsn).getStoreEndpoint();
                    // if Sentry key appears in URL, don't capture it as a request
                    // but rather as our own 'sentry' type breadcrumb
                    if (filterUrl && url.indexOf(filterUrl) !== -1) {
                        if (method === 'POST' && args[1] && args[1].body) {
                            addSentryBreadcrumb(args[1].body);
                        }
                        return originalFetch.apply(global, args);
                    }
                }
                var fetchData = {
                    method: utils_1.isString(method) ? method.toUpperCase() : method,
                    url: url,
                };
                return originalFetch
                    .apply(global, args)
                    .then(function (response) {
                    fetchData.status_code = response.status;
                    Breadcrumbs.addBreadcrumb({
                        category: 'fetch',
                        data: fetchData,
                        type: 'http',
                    }, {
                        input: args,
                        response: response,
                    });
                    return response;
                })
                    .then(null, function (error) {
                    Breadcrumbs.addBreadcrumb({
                        category: 'fetch',
                        data: fetchData,
                        level: types_1.Severity.Error,
                        type: 'http',
                    }, {
                        error: error,
                        input: args,
                    });
                    throw error;
                });
            };
        });
    };
    /** JSDoc */
    Breadcrumbs.prototype._instrumentHistory = function () {
        var _this = this;
        if (!utils_1.supportsHistory()) {
            return;
        }
        var captureUrlChange = function (from, to) {
            var parsedLoc = utils_1.parseUrl(global.location.href);
            var parsedTo = utils_1.parseUrl(to);
            var parsedFrom = utils_1.parseUrl(from);
            // Initial pushState doesn't provide `from` information
            if (!parsedFrom.path) {
                parsedFrom = parsedLoc;
            }
            // because onpopstate only tells you the "new" (to) value of location.href, and
            // not the previous (from) value, we need to track the value of the current URL
            // state ourselves
            lastHref = to;
            // Use only the path component of the URL if the URL matches the current
            // document (almost all the time when using pushState)
            if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) {
                // tslint:disable-next-line:no-parameter-reassignment
                to = parsedTo.relative;
            }
            if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) {
                // tslint:disable-next-line:no-parameter-reassignment
                from = parsedFrom.relative;
            }
            Breadcrumbs.addBreadcrumb({
                category: 'navigation',
                data: {
                    from: from,
                    to: to,
                },
            });
        };
        // record navigation (URL) changes
        var oldOnPopState = global.onpopstate;
        global.onpopstate = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var currentHref = global.location.href;
            captureUrlChange(lastHref, currentHref);
            if (oldOnPopState) {
                return oldOnPopState.apply(_this, args);
            }
        };
        /**
         * @hidden
         */
        function historyReplacementFunction(originalHistoryFunction) {
            // note history.pushState.length is 0; intentionally not declaring
            // params to preserve 0 arity
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var url = args.length > 2 ? args[2] : undefined;
                // url argument is optional
                if (url) {
                    // coerce to string (this is what pushState does)
                    captureUrlChange(lastHref, String(url));
                }
                return originalHistoryFunction.apply(this, args);
            };
        }
        utils_1.fill(global.history, 'pushState', historyReplacementFunction);
        utils_1.fill(global.history, 'replaceState', historyReplacementFunction);
    };
    /** JSDoc */
    Breadcrumbs.prototype._instrumentXHR = function () {
        if (!('XMLHttpRequest' in global)) {
            return;
        }
        /**
         * @hidden
         */
        function wrapProp(prop, xhr) {
            if (prop in xhr && typeof xhr[prop] === 'function') {
                utils_1.fill(xhr, prop, function (original) {
                    return helpers_1.wrap(original, {
                        mechanism: {
                            data: {
                                function: prop,
                                handler: (original && original.name) || '<anonymous>',
                            },
                            handled: true,
                            type: 'instrument',
                        },
                    });
                });
            }
        }
        var xhrproto = XMLHttpRequest.prototype;
        utils_1.fill(xhrproto, 'open', function (originalOpen) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var url = args[1];
                this.__sentry_xhr__ = {
                    method: utils_1.isString(args[0]) ? args[0].toUpperCase() : args[0],
                    url: args[1],
                };
                var client = core_1.getCurrentHub().getClient();
                var dsn = client && client.getDsn();
                if (dsn) {
                    var filterUrl = new core_1.API(dsn).getStoreEndpoint();
                    // if Sentry key appears in URL, don't capture it as a request
                    // but rather as our own 'sentry' type breadcrumb
                    if (utils_1.isString(url) && (filterUrl && url.indexOf(filterUrl) !== -1)) {
                        this.__sentry_own_request__ = true;
                    }
                }
                return originalOpen.apply(this, args);
            };
        });
        utils_1.fill(xhrproto, 'send', function (originalSend) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var xhr = this; // tslint:disable-line:no-this-assignment
                if (xhr.__sentry_own_request__) {
                    addSentryBreadcrumb(args[0]);
                }
                /**
                 * @hidden
                 */
                function onreadystatechangeHandler() {
                    if (xhr.readyState === 4) {
                        if (xhr.__sentry_own_request__) {
                            return;
                        }
                        try {
                            // touching statusCode in some platforms throws
                            // an exception
                            if (xhr.__sentry_xhr__) {
                                xhr.__sentry_xhr__.status_code = xhr.status;
                            }
                        }
                        catch (e) {
                            /* do nothing */
                        }
                        Breadcrumbs.addBreadcrumb({
                            category: 'xhr',
                            data: xhr.__sentry_xhr__,
                            type: 'http',
                        }, {
                            xhr: xhr,
                        });
                    }
                }
                var xmlHttpRequestProps = ['onload', 'onerror', 'onprogress'];
                xmlHttpRequestProps.forEach(function (prop) {
                    wrapProp(prop, xhr);
                });
                if ('onreadystatechange' in xhr && typeof xhr.onreadystatechange === 'function') {
                    utils_1.fill(xhr, 'onreadystatechange', function (original) {
                        return helpers_1.wrap(original, {
                            mechanism: {
                                data: {
                                    function: 'onreadystatechange',
                                    handler: (original && original.name) || '<anonymous>',
                                },
                                handled: true,
                                type: 'instrument',
                            },
                        }, onreadystatechangeHandler);
                    });
                }
                else {
                    // if onreadystatechange wasn't actually set by the page on this xhr, we
                    // are free to set our own and capture the breadcrumb
                    xhr.onreadystatechange = onreadystatechangeHandler;
                }
                return originalSend.apply(this, args);
            };
        });
    };
    /**
     * Helper that checks if integration is enabled on the client.
     * @param breadcrumb Breadcrumb
     * @param hint BreadcrumbHint
     */
    Breadcrumbs.addBreadcrumb = function (breadcrumb, hint) {
        if (core_1.getCurrentHub().getIntegration(Breadcrumbs)) {
            core_1.getCurrentHub().addBreadcrumb(breadcrumb, hint);
        }
    };
    /**
     * Instrument browser built-ins w/ breadcrumb capturing
     *  - Console API
     *  - DOM API (click/typing)
     *  - XMLHttpRequest API
     *  - Fetch API
     *  - History API
     */
    Breadcrumbs.prototype.setupOnce = function () {
        if (this._options.console) {
            this._instrumentConsole();
        }
        if (this._options.dom) {
            this._instrumentDOM();
        }
        if (this._options.xhr) {
            this._instrumentXHR();
        }
        if (this._options.fetch) {
            this._instrumentFetch();
        }
        if (this._options.history) {
            this._instrumentHistory();
        }
    };
    /**
     * @inheritDoc
     */
    Breadcrumbs.id = 'Breadcrumbs';
    return Breadcrumbs;
}());
exports.Breadcrumbs = Breadcrumbs;
/** JSDoc */
function addSentryBreadcrumb(serializedData) {
    // There's always something that can go wrong with deserialization...
    try {
        var event_1 = JSON.parse(serializedData);
        Breadcrumbs.addBreadcrumb({
            category: 'sentry',
            event_id: event_1.event_id,
            level: event_1.level || types_1.Severity.fromString('error'),
            message: utils_1.getEventDescription(event_1),
        }, {
            event: event_1,
        });
    }
    catch (_oO) {
        utils_1.logger.error('Error while adding sentry type breadcrumb');
    }
}
//# sourceMappingURL=breadcrumbs.js.map