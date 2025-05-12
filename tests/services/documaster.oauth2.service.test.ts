import axios from 'axios';
import { DocumentmasterOAuth2Service } from '../../src/services/documaster.oauth2.service';
import { documasterConfig } from '../../src/utils/documaster-config.util';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/utils/documaster-config.util', () => ({
	documasterConfig: {
		getOAuth2Config: jest.fn(),
	},
}));

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocumentmasterOAuth2Service', () => {
	let oauth2Service: DocumentmasterOAuth2Service;
	
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();
		
		// Create a fresh instance for each test
		oauth2Service = new DocumentmasterOAuth2Service();
		
		// Mock the config
		(documasterConfig.getOAuth2Config as jest.Mock).mockReturnValue({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			tokenUrl: 'https://test.documaster.tech/idp/oauth2/token',
			baseUrl: 'https://test.documaster.tech',
			scope: 'openid',
		});
	});
	
	describe('getAccessToken', () => {
		it('should request a new token when no token is cached', async () => {
			// Mock axios response
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'test-access-token',
					expires_in: 3600,
					token_type: 'bearer',
					scope: 'openid',
				},
			});
			
			// Call the method
			const token = await oauth2Service.getAccessToken();
			
			// Print the token for verification
			console.log('Test token received:', token);
			
			// Verify the token
			expect(token).toBe('test-access-token');
			
			// Verify axios was called correctly
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://test.documaster.tech/idp/oauth2/token',
				expect.stringContaining('grant_type=client_credentials'),
				expect.objectContaining({
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}),
			);
		});
		
		it('should use cached token when valid', async () => {
			// Mock axios response for first call
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'test-access-token',
					expires_in: 3600,
					token_type: 'bearer',
					scope: 'openid',
				},
			});
			
			// First call to get and cache a token
			await oauth2Service.getAccessToken();
			
			// Reset the mock to verify it's not called again
			mockedAxios.post.mockClear();
			
			// Second call should use cached token
			const token = await oauth2Service.getAccessToken();
			
			// Print the cached token
			console.log('Cached token retrieved:', token);
			
			// Verify the token
			expect(token).toBe('test-access-token');
			
			// Verify axios was NOT called again
			expect(mockedAxios.post).not.toHaveBeenCalled();
		});
		
		it('should handle errors when requesting token', async () => {
			// Mock axios to throw an error
			mockedAxios.post.mockRejectedValueOnce({
				isAxiosError: true,
				response: {
					status: 401,
					data: { error: 'invalid_client' },
				},
			});
			
			// Call should throw an error
			await expect(oauth2Service.getAccessToken()).rejects.toThrow(
				'Failed to authenticate with Documaster API',
			);
		});
	});
	
	describe('invalidateToken', () => {
		it('should clear the cached token', async () => {
			// Mock axios response
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'test-access-token',
					expires_in: 3600,
					token_type: 'bearer',
					scope: 'openid',
				},
			});
			
			// First call to get and cache a token
			await oauth2Service.getAccessToken();
			
			// Invalidate the token
			oauth2Service.invalidateToken();
			
			// Reset the mock
			mockedAxios.post.mockClear();
			
			// Mock response for second call
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'new-access-token',
					expires_in: 3600,
					token_type: 'bearer',
					scope: 'openid',
				},
			});
			
			// Next call should request a new token
			const token = await oauth2Service.getAccessToken();
			
			// Print the new token
			console.log('New token after invalidation:', token);
			
			// Verify the new token
			expect(token).toBe('new-access-token');
			
			// Verify axios was called again
			expect(mockedAxios.post).toHaveBeenCalledTimes(1);
		});
	});
	
	describe('getAuthorizationHeader', () => {
		it('should return a properly formatted Authorization header', async () => {
			// Mock axios response
			mockedAxios.post.mockResolvedValueOnce({
				data: {
					access_token: 'test-access-token',
					expires_in: 3600,
					token_type: 'bearer',
					scope: 'openid',
				},
			});
			
			// Get the header
			const header = await oauth2Service.getAuthorizationHeader();
			
			// Print the formatted header
			console.log('Authorization header:', header);
			
			// Verify the header format
			expect(header).toBe('Bearer test-access-token');
		});
	});
});
