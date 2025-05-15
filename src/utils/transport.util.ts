import { Logger } from './logger.util.js';
import {
	createApiError,
	createAuthInvalidError,
	createUnexpectedError,
	McpError,
} from './error.util.js';

// Create a contextualized logger for this file
const transportLogger = Logger.forContext('utils/transport.util.ts');

// Log transport utility initialization
transportLogger.debug('Transport utility initialized');

/**
 * Interface for HTTP request options
 */
export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: unknown;
}

/**
 * Generic and reusable function to fetch data from any API endpoint.
 * Handles standard HTTP request setup, response checking, basic error handling, and logging.
 *
 * @param url The full URL to fetch data from.
 * @param options Request options including method, headers, and body.
 * @returns The response data parsed as type T.
 * @throws {McpError} If the request fails, including network errors, non-OK HTTP status, or JSON parsing issues.
 */
export async function fetchApi<T>(
	url: string,
	options: RequestOptions = {},
): Promise<T> {
	const methodLogger = Logger.forContext(
		'utils/transport.util.ts',
		'fetchApi',
	);

	// Prepare standard request options
	const requestOptions: RequestInit = {
		method: options.method || 'GET',
		headers: {
			// Standard headers, allow overrides via options.headers
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...options.headers,
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	};

	methodLogger.debug(`Executing API call: ${requestOptions.method} ${url}`);
	const startTime = performance.now(); // Track performance

	try {
		const response = await fetch(url, requestOptions);
		const endTime = performance.now();
		const duration = (endTime - startTime).toFixed(2);

		methodLogger.debug(
			`API call completed in ${duration}ms with status: ${response.status} ${response.statusText}`,
			{ url, status: response.status },
		);

		// Check if the response status is OK (2xx)
		if (!response.ok) {
			const errorText = await response.text(); // Get error body for context
			methodLogger.error(
				`API error response (${response.status}):`,
				errorText,
			);

			// Classify standard HTTP errors
			if (response.status === 401) {
				// Use createAuthInvalidError for consistency, even if ip-api uses keys
				throw createAuthInvalidError(
					'Authentication failed. Check API token if required.',
				);
			} else if (response.status === 403) {
				// Use createAuthInvalidError or a more specific permission error if needed
				throw createAuthInvalidError(
					'Permission denied for the requested resource.',
				);
			} else if (response.status === 404) {
				throw createApiError(
					'Resource not found at the specified URL.',
					response.status,
					errorText,
				);
			} else {
				// Generic API error for other non-2xx statuses
				throw createApiError(
					`API request failed with status ${response.status}: ${response.statusText}`,
					response.status,
					errorText,
				);
			}
		}

		// Attempt to parse the response body as JSON
		try {
			const responseData = await response.json();
			methodLogger.debug('Response body successfully parsed as JSON.');
			// methodLogger.debug('Response Data:', responseData); // Uncomment for full response logging
			return responseData as T;
		} catch (parseError) {
			methodLogger.error(
				'Failed to parse API response JSON:',
				parseError,
			);
			// Throw a specific error for JSON parsing failure
			throw createApiError(
				`Failed to parse API response JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				response.status, // Include original status for context
				parseError,
			);
		}
	} catch (error) {
		const endTime = performance.now();
		const duration = (endTime - startTime).toFixed(2);
		methodLogger.error(
			`API call failed after ${duration}ms for ${url}:`,
			error,
		);

		// Rethrow if it's already an McpError (e.g., from status checks or parsing)
		if (error instanceof McpError) {
			throw error;
		}

		// Handle potential network errors (TypeError in fetch)
		if (error instanceof TypeError) {
			throw createApiError(
				`Network error during API call: ${error.message}`,
				undefined, // No specific HTTP status for network errors
				error,
			);
		}

		// Wrap any other unexpected errors
		throw createUnexpectedError(
			`Unexpected error during API call: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}
