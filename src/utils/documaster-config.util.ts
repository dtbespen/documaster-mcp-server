import { config } from './config.util.js';
import { OAuth2Config } from '../types/oauth2.types.js';
import { Logger } from './logger.util.js';

/**
 * Documaster API configuration utilities
 */
class DocumentmasterConfigUtil {
	/**
	 * Get the OAuth2 configuration for Documaster API
	 * @returns OAuth2 configuration object
	 * @throws Error if required configuration is missing
	 */
	getOAuth2Config(): OAuth2Config {
		const methodLogger = Logger.forContext(
			'utils/documaster-config.util.ts',
			'getOAuth2Config',
		);

		// Ensure configuration is loaded
		config.load();

		// Get required values
		const clientId = config.get('DOCUMASTER_CLIENT_ID');
		const clientSecret = config.get('DOCUMASTER_CLIENT_SECRET');
		const tokenUrl = config.get('DOCUMASTER_TOKEN_URL');
		const baseUrl = config.get('DOCUMASTER_API_BASE_URL');
		const scope = config.get('DOCUMASTER_SCOPE', 'openid');

		// Validate required fields
		if (!clientId) {
			const errorMsg = 'Missing required configuration: DOCUMASTER_CLIENT_ID';
			methodLogger.error(errorMsg);
			throw new Error(errorMsg);
		}

		if (!clientSecret) {
			const errorMsg = 'Missing required configuration: DOCUMASTER_CLIENT_SECRET';
			methodLogger.error(errorMsg);
			throw new Error(errorMsg);
		}

		if (!tokenUrl) {
			const errorMsg = 'Missing required configuration: DOCUMASTER_TOKEN_URL';
			methodLogger.error(errorMsg);
			throw new Error(errorMsg);
		}

		if (!baseUrl) {
			const errorMsg = 'Missing required configuration: DOCUMASTER_API_BASE_URL';
			methodLogger.error(errorMsg);
			throw new Error(errorMsg);
		}

		methodLogger.debug('OAuth2 configuration loaded successfully');

		return {
			clientId: clientId!,
			clientSecret: clientSecret!,
			tokenUrl: tokenUrl!,
			baseUrl: baseUrl!,
			scope: scope!,
		};
	}
}

// Export a singleton instance
export const documasterConfig = new DocumentmasterConfigUtil(); 