import type {IResult} from '@luolapeikko/result-option';

/**
 * interface for a request cache
 * @category Utils
 * @example
 * const exampleCache: IRequestCache = {
 *   isOnline() {
 *     return (typeof window !== 'undefined' && window.navigator && window.navigator.onLine) || true;
 *   },
 *   async fetchRequest(req: Request) {
 *     if (typeof window !== 'undefined' && window.caches) {
 *       try {
 *         const cache = await window.caches.open('fetch');
 *         return Ok(await cache.match(req));
 *       } catch (err) {
 *         return Err(err);
 *       }
 *     }
 *     return Ok(undefined);
 *   },
 *   async storeRequest(req: Request, res: Response) {
 *     if (typeof window !== 'undefined' && window.caches && res.ok) {
 *       try {
 *         const cache = await window.caches.open('fetch');
 *         req.headers.delete('Authorization');
 *         await cache.put(req, res.clone());
 *       } catch (err) {
 *         return Err(err);
 *       }
 *     }
 *     return Ok(undefined);
 *   },
 * };
 * @since v0.0.1
 */

export interface IRequestCache {
	/**
	 * check if the client is connected to the internet
	 */
	isOnline(): boolean;
	/**
	 * get the cached response for a request
	 */
	getRequest(req: Request): Promise<IResult<Response | undefined, Error>>;
	/**
	 * store the response for a request
	 */
	storeRequest(req: Request, res: Response): Promise<IResult<void, Error>>;
}
