/**
 * Common type definitions shared across controllers.
 * These types provide a standard interface for controller interactions.
 * Centralized here to ensure consistency across the codebase.
 */

/**
 * Common pagination information for API responses.
 * This is used for providing consistent pagination details to clients.
 */
export interface ResponsePagination {
	/**
	 * Cursor for the next page of results, if available.
	 * This should be passed to subsequent requests to retrieve the next page.
	 */
	nextCursor?: string;

	/**
	 * Whether more results are available beyond the current page.
	 * When true, clients should use the nextCursor to retrieve more results.
	 */
	hasMore: boolean;

	/**
	 * The number of items in the current result set.
	 * This helps clients track how many items they've received.
	 */
	count?: number;
}

/**
 * Common response structure for controller operations.
 * All controller methods should return this structure.
 */
export interface ControllerResponse {
	/**
	 * Formatted content to be displayed to the user.
	 * Usually a Markdown-formatted string.
	 */
	content: string;

	/**
	 * Optional pagination information for list operations.
	 * If present, indicates that more results are available.
	 */
	pagination?: ResponsePagination;
}
