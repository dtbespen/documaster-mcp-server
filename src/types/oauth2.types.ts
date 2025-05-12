/**
 * OAuth2 Client Credentials Flow configuration types
 */

/**
 * OAuth2 configuration for the Documaster API
 */
export interface OAuth2Config {
	/**
	 * Client ID provided by Documaster during onboarding
	 */
	clientId: string;

	/**
	 * Client secret provided by Documaster during onboarding
	 */
	clientSecret: string;

	/**
	 * OAuth2 token endpoint URL
	 * Example: https://<documaster-instance>.local.documaster.tech/idp/oauth2/token
	 */
	tokenUrl: string;

	/**
	 * Base URL for the Documaster API
	 * Example: https://<documaster-instance>.local.documaster.tech
	 */
	baseUrl: string;

	/**
	 * OAuth2 scope, default is 'openid'
	 */
	scope: string;
}

/**
 * OAuth2 token response from Documaster API
 */
export interface OAuth2TokenResponse {
	/**
	 * The access token issued by the authorization server
	 */
	access_token: string;

	/**
	 * How long the access token is valid, in seconds
	 */
	expires_in: number;

	/**
	 * The type of token, typically "bearer"
	 */
	token_type: string;

	/**
	 * The scope of the access token
	 */
	scope: string;
}

/**
 * Cached OAuth2 token with expiry information
 */
export interface CachedToken extends OAuth2TokenResponse {
	/**
	 * Timestamp when the token was retrieved (in milliseconds since epoch)
	 */
	retrievedAt: number;

	/**
	 * Timestamp when the token will expire (in milliseconds since epoch)
	 */
	expiresAt: number;
} 