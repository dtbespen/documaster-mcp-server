import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/pagination.util.ts');
logger.debug('Pagination utility initialized');

/**
 * Enum for different pagination types used by APIs.
 */
export enum PaginationType {
	CURSOR = 'CURSOR', // Cursor-based (e.g., Confluence v2)
	OFFSET = 'OFFSET', // Offset-based (e.g., Jira)
	PAGE = 'PAGE', // Page number based (e.g., Bitbucket)
}

/**
 * Standardized pagination information returned by controllers.
 */
export interface ResponsePagination {
	count: number;
	hasMore: boolean;
	limit?: number;
	startAt?: number;
	total?: number;
	nextCursor?: string;
	nextPage?: number;
	entityType?: string; // Optional entity type for messages
}

/**
 * Extracts standardized pagination information from various API response formats.
 *
 * @param data - The raw API response data. Expected to contain pagination fields.
 * @param type - The type of pagination the API uses (CURSOR, OFFSET, PAGE).
 * @param entityType - Optional name of the entity being paginated (for messages).
 * @returns A standardized ResponsePagination object, or undefined if no pagination info found.
 */
export function extractPaginationInfo(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any, // Using 'any' here as API responses vary greatly
	type: PaginationType,
	entityType?: string,
): ResponsePagination | undefined {
	if (!data) {
		return undefined;
	}

	let count = 0;
	let hasMore = false;
	let total: number | undefined = undefined;
	let nextCursor: string | undefined = undefined;
	let nextPage: number | undefined = undefined;
	let startAt: number | undefined = undefined;
	let limit: number | undefined = undefined;

	// Common count extraction
	if (Array.isArray(data.results)) {
		count = data.results.length;
	} else if (Array.isArray(data.values)) {
		count = data.values.length;
	} else if (Array.isArray(data.issues)) {
		count = data.issues.length;
	} else if (Array.isArray(data)) {
		// Handle cases where the response is just an array (e.g., global statuses)
		count = data.length;
		// Assume no more pages if the response is just an array without metadata
		hasMore = false;
		return { count, hasMore, entityType };
	}

	switch (type) {
		case PaginationType.CURSOR:
			// Confluence v2 style (_links.next)
			if (data._links?.next) {
				hasMore = true;
				// Extract cursor from the 'next' link query parameters
				try {
					const nextUrl = new URL(
						data._links.next,
						'http://dummy.base', // Base needed for URL parsing
					);
					nextCursor =
						nextUrl.searchParams.get('cursor') || undefined;
				} catch (e) {
					logger.warn('Failed to parse next link URL for cursor:', e);
				}
			}
			// Limit might be present in the main response or derivable
			limit = data.limit || data.size || count; // Use count as fallback limit if not explicit
			break;

		case PaginationType.OFFSET:
			// Jira style (startAt, maxResults, total, isLast)
			startAt = data.startAt ?? 0;
			limit = data.maxResults;
			total = data.total;
			hasMore = data.isLast === false;
			// Calculate next startAt if possible
			if (hasMore && limit !== undefined) {
				// Keep startAt as is, formatter will calculate next step
			}
			break;

		case PaginationType.PAGE:
			// Bitbucket style (page, pagelen, size, next)
			limit = data.pagelen;
			total = data.size; // Bitbucket uses 'size' for total
			hasMore = !!data.next;
			if (hasMore) {
				// Try to parse the page number from the next URL
				try {
					const nextUrl = new URL(data.next);
					nextPage = parseInt(
						nextUrl.searchParams.get('page') || '',
						10,
					);
					if (isNaN(nextPage)) {
						nextPage = (data.page || 1) + 1; // Fallback calculation
					}
				} catch (e) {
					logger.warn('Failed to parse next link URL for page:', e);
					nextPage = (data.page || 1) + 1; // Fallback calculation
				}
			}
			break;

		default:
			logger.warn('Unknown pagination type provided:', type);
			return undefined; // Unknown type
	}

	// If count is zero and there's no indication of more pages, return undefined
	if (count === 0 && !hasMore && total === 0) {
		return undefined;
	}

	// Return standardized pagination object
	return {
		count,
		hasMore,
		limit,
		startAt,
		total,
		nextCursor,
		nextPage,
		entityType,
	};
}
