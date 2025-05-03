/**
 * Interface for IP address lookup options
 */
export type GetIpOptions = {
	/** Optional: Include extended ASN, mobile, proxy data. Defaults to false. */
	includeExtendedData?: boolean;
	/** Optional: Use HTTPS for API requests (requires paid tier). Defaults to false. */
	useHttps?: boolean;
};
