import { Event, Response } from '@sentry/types';
import { BaseTransport } from './base';
/** `fetch` based transport */
export declare class FetchTransport extends BaseTransport {
    /**
     * @inheritDoc
     */
    sendEvent(event: Event): PromiseLike<Response>;
}
//# sourceMappingURL=fetch.d.ts.map