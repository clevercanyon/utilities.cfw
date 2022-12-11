/**
 * Clever Canyon™ {@see https://clevercanyon.com}
 *
 *  CCCCC  LL      EEEEEEE VV     VV EEEEEEE RRRRRR      CCCCC    AAA   NN   NN YY   YY  OOOOO  NN   NN ™
 * CC      LL      EE      VV     VV EE      RR   RR    CC       AAAAA  NNN  NN YY   YY OO   OO NNN  NN
 * CC      LL      EEEEE    VV   VV  EEEEE   RRRRRR     CC      AA   AA NN N NN  YYYYY  OO   OO NN N NN
 * CC      LL      EE        VV VV   EE      RR  RR     CC      AAAAAAA NN  NNN   YYY   OO   OO NN  NNN
 *  CCCCC  LLLLLLL EEEEEEE    VVV    EEEEEEE RR   RR     CCCCC  AA   AA NN   NN   YYY    OOOO0  NN   NN
 */
// <editor-fold desc="Imports and other headers.">

/**
 * Imports.
 *
 * @since 2022-02-26
 *
 * @see https://github.com/cloudflare/kv-asset-handler
 */
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

import { default as uA6tBase } from '../../any/classes/a6t/Base';
import { default as uStr }     from '../../any/classes/Str';
import { default as uURL }     from '../../any/classes/URL';
import { default as uHTTPs }   from '../../any/classes/HTTPs';

// </editor-fold>

/**
 * Routes.
 *
 * @since 2022-02-26
 */
interface cHTTPsRoutes {
	[ pattern : string ] : ( r : Request ) => Promise<Response>;
}

/**
 * HTTP server utilities.
 *
 * @since 2022-04-25
 */
export default class cHTTPs extends uA6tBase {
	/**
	 * Handles fetch.
	 *
	 * @since 2022-02-26
	 *
	 * @param {FetchEvent}   event  Event.
	 * @param {cHTTPsRoutes} routes Routes.
	 *
	 * @returns {Promise<Response>} Response.
	 */
	public static async handleFetch( event : FetchEvent, routes : cHTTPsRoutes ) : Promise<Response> {
		const request = uHTTPs.prepareRequest( event.request, {} );
		const url     = uURL.parse( request.url );

		// @ts-ignore Fetch event is not abstract in a webworker environment.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Assignment ok.
		event = new FetchEvent( 'fetch', { request } );

		if ( ! uHTTPs.requestMethodSupported( request ) ) {
			return uHTTPs.prepareResponse( request, { status : 405 } );
		}
		if ( ! url ) { // Early return on parse failure.
			return uHTTPs.prepareResponse( request, { status : 400 } );
		}
		if ( '__STATIC_CONTENT' in globalThis && uHTTPs.requestPathIsStatic( request ) ) {
			try { return cHTTPs.handleStatics( url, event ); } catch {}
		}
		return cHTTPs.handleDynamics( url, event, routes );
	}

	/**
	 * Handles statics.
	 *
	 * @since 2022-02-26
	 *
	 * @param {URL}        url   URL.
	 * @param {FetchEvent} event Event.
	 *
	 * @returns {Promise<Response>} Response.
	 *
	 * @throws {Error} Throws error when static asset is missing.
	 */
	public static async handleStatics( url : URL, event : FetchEvent ) : Promise<Response> {
		const { request } = event; // Extract request prop.

		let response = await getAssetFromKV( event, {
			ASSET_NAMESPACE : '__STATIC_CONTENT', // Wrangler default.
			cacheControl    : { edgeTTL : 31536000, browserTTL : 31536000 },
		} );
		response     = new Response( response.body, response ); // Clone of response.

		return uHTTPs.prepareResponse( request, { response } );
	}

	/**
	 * Handles dynamics.
	 *
	 * @since 2022-02-26
	 *
	 * @param {URL}          url   URL.
	 * @param {FetchEvent}   event  Event.
	 * @param {cHTTPsRoutes} routes Routes.
	 *
	 * @returns {Promise<Response>} Response.
	 */
	public static async handleDynamics( url : URL, event : FetchEvent, routes : cHTTPsRoutes ) : Promise<Response> {
		const { request } = event; // Extract request prop.

		for ( const [ routePattern, routHandler ] of Object.entries( routes ) ) {
			if ( uStr.matches( url.pathname, routePattern ) ) {
				return routHandler( request );
			}
		}
		return uHTTPs.prepareResponse( request, { status : 404 } );
	}

	/**
	 * Gets geo property.
	 *
	 * @since 2022-02-26
	 *
	 * @param {Request} request Request.
	 *
	 * @returns {string} Geo property value.
	 */
	public static geoProp( request : Request, prop : string ) : string {
		return String( request.cf && prop in request.cf ? request.cf[ prop as keyof typeof request.cf ] || '' : '' );
	}
}
