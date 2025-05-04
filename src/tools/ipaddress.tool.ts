import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { IpAddressToolArgs } from './ipaddress.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { z } from 'zod';

import ipAddressController from '../controllers/ipaddress.controller.js';

/**
 * Zod schema for the tool arguments, combining the optional positional IP address
 * and the options object.
 */
const GetIpDetailsToolSchema = z.object({
	ipAddress: z
		.string()
		.optional()
		.describe('IP address to lookup (omit for current IP)'),
	...IpAddressToolArgs.shape, // Merge options schema
});

/**
 * TypeScript type inferred from the combined tool arguments schema.
 */
type GetIpDetailsToolArgsType = z.infer<typeof GetIpDetailsToolSchema>;

/**
 * @function handleGetIpDetails
 * @description MCP Tool handler to retrieve details for a given IP address (or the current IP).
 *              It calls the ipAddressController to fetch the data and formats the response for the MCP.
 *
 * @param {GetIpDetailsToolArgsType} args - Combined arguments (ipAddress + options) provided to the tool.
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 */
async function handleGetIpDetails(args: GetIpDetailsToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/ipaddress.tool.ts',
		'handleGetIpDetails',
	);
	methodLogger.debug(
		`Getting IP address details for ${args.ipAddress || 'current IP'}...`,
		args,
	);

	try {
		// Destructure options from the combined args
		const { ipAddress, ...controllerOptions } = args;

		// Call the controller with the ipAddress and the options object
		const message = await ipAddressController.get(
			ipAddress,
			controllerOptions,
		);
		methodLogger.debug(`Got the response from the controller`, message);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error(
			`Error getting details for IP: ${args.ipAddress || 'current IP'}`,
			error,
		);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the IP address lookup tool ('ip_get_details') with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/ipaddress.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering IP address tools...`);

	server.tool(
		'ip_get_details',
		`Retrieves geolocation and network details for a public IP address (\`ipAddress\`). Falls back to the server's current public IP if omitted. Fetches country, city, coordinates, ISP, etc. Optionally includes extended data (\`includeExtendedData\`) like ASN, mobile/proxy/hosting detection. **Note:** Does not work for private IPs. Relies on ip-api.com. Use \`useHttps\` for paid tier.`,
		GetIpDetailsToolSchema.shape, // Use the combined schema for validation
		handleGetIpDetails, // Use the updated handler
	);

	methodLogger.debug('Successfully registered ip_get_details tool.');
}

export default { registerTools };
