import axios from 'axios';
import querystring from 'querystring';
import { documasterConfig } from '../utils/documaster-config.util.js';
import {
	OAuth2TokenResponse,
	CachedToken
} from '../types/oauth2.types.js';
import { Logger } from '../utils/logger.util.js';

/**
 * Service for handling OAuth2 authentication with Documaster API
 */
export class DocumentmasterOAuth2Service {
	private tokenCache: CachedToken | null = null;
	
	/**
	 * Get an access token for Documaster API
	 * Returns a cached token if it's still valid, otherwise requests a new one
	 * 
	 * @returns Access token string
	 */
	async getAccessToken(): Promise<string> {
		const methodLogger = Logger.forContext(
			'services/documaster.oauth2.service.ts',
			'getAccessToken',
		);
		
		methodLogger.debug('Requesting access token');
		
		// Check if we have a cached token that's still valid
		if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
			methodLogger.debug('Using cached token, valid for another', {
				milliseconds: this.tokenCache.expiresAt - Date.now(),
			});
			return this.tokenCache.access_token;
		}
		
		// No valid token in cache, request a new one
		methodLogger.debug('No valid token in cache, requesting new token');
		const tokenResponse = await this.requestNewToken();
		
		// Build cached token with expiry info
		this.tokenCache = {
			...tokenResponse,
			retrievedAt: Date.now(),
			// Set expiry time to slightly before the actual expiry to account for network latency
			expiresAt: Date.now() + (tokenResponse.expires_in * 1000) - 30000, // 30 seconds margin
		};
		
		methodLogger.debug('New token cached with expiry', {
			expiryDate: new Date(this.tokenCache.expiresAt).toISOString(),
		});
		
		return this.tokenCache.access_token;
	}
	
	/**
	 * Request a new access token from Documaster API
	 * 
	 * @returns Token response
	 * @throws Error if token request fails
	 */
	private async requestNewToken(): Promise<OAuth2TokenResponse> {
		const methodLogger = Logger.forContext(
			'services/documaster.oauth2.service.ts',
			'requestNewToken',
		);
		
		try {
			// Get OAuth2 configuration
			const oauth2Config = documasterConfig.getOAuth2Config();
			
			// Prepare request payload
			const payload = querystring.stringify({
				grant_type: 'client_credentials',
				client_id: oauth2Config.clientId,
				client_secret: oauth2Config.clientSecret,
				scope: oauth2Config.scope,
			});
			
			// Make API request
			methodLogger.debug('Requesting token from Documaster API', {
				tokenUrl: oauth2Config.tokenUrl,
			});
			
			const response = await axios.post(oauth2Config.tokenUrl, payload, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			
			methodLogger.debug('Successfully retrieved token from Documaster API');
			
			// Parse response
			return response.data as OAuth2TokenResponse;
		} catch (error) {
			methodLogger.error('Failed to retrieve access token', error);
			throw new Error('Failed to authenticate with Documaster API');
		}
	}
	
	/**
	 * Invalidate the current cached token
	 * This forces a new token to be requested on the next getAccessToken() call
	 */
	invalidateToken(): void {
		const methodLogger = Logger.forContext(
			'services/documaster.oauth2.service.ts',
			'invalidateToken',
		);
		
		methodLogger.debug('Invalidating token cache');
		this.tokenCache = null;
	}
	
	/**
	 * Get a properly formatted Authorization header value for use in API requests
	 * 
	 * @returns Promise resolving to a string in the format "Bearer <token>"
	 */
	async getAuthorizationHeader(): Promise<string> {
		const token = await this.getAccessToken();
		return `Bearer ${token}`;
	}
}
