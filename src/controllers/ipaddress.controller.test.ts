import ipAddressController from './ipaddress.controller.js';
import { ErrorType, McpError } from '../utils/error.util.js';

describe('IP Address Controller', () => {
	describe('get: current IP address', () => {
		it('should return a valid IP address', async () => {
			// Call the function with the real API
			const result = await ipAddressController.get();

			// Verify the result is a valid IP address format with our new structure
			expect(result.content).toContain('# IP Address Details:');
			expect(result.content).toContain('## Location Information');
			expect(result.content).toContain('## Network Information');
			expect(result.content).toContain('- **IP Address**:');
		}, 10000); // Increase timeout for API call
	});

	describe('get: specific IP address', () => {
		it('should return details for a valid IP address', async () => {
			// Use a known public IP address for testing
			const ipAddress = '8.8.8.8'; // Google's public DNS

			// Call the function with the real API
			const result = await ipAddressController.get(ipAddress);

			// Verify the response contains expected fields in our new structure
			expect(result.content).toContain('# IP Address Details: 8.8.8.8');
			expect(result.content).toContain('## Location Information');
			expect(result.content).toContain('## Network Information');
			expect(result.content).toContain(`- **IP Address**: ${ipAddress}`);
			expect(result.content).toContain('Google'); // Google DNS should have this in org or ISP
		}, 10000); // Increase timeout for API call

		it('should handle invalid IP addresses', async () => {
			// Increased timeout for potentially slow API responses
			jest.setTimeout(20000); // e.g., 20 seconds

			try {
				// Pass the invalid IP string directly
				await ipAddressController.get('invalid-ip-format');
				fail('Expected get to throw an error for invalid IP');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				const mcpError = error as McpError;

				// Check if it's the rate limit error (common in CI)
				if (
					mcpError.message.includes('429') &&
					mcpError.message.includes('Too Many Requests') &&
					process.env.CI // Check if running in CI environment
				) {
					console.warn(
						'Skipping assertion due to potential rate limit error in CI environment.',
					);
					test.skip(
						'Skipping assertion due to potential rate limit error in CI',
					); // Skip the test formally
				} else {
					// Otherwise, expect the specific invalid query error from the API
					expect(mcpError.type).toBe(ErrorType.API_ERROR);
					// The API actually returns "invalid query" for malformed IPs
					expect(mcpError.message).toContain(
						'IP API error: invalid query',
					);
				}
			}
		}, 20000); // Explicit timeout for the test itself
	});
});
