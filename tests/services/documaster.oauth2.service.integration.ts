/**
 * Test av reell Documaster OAuth2-autentisering
 * 
 * Denne filen inneholder en funksjon for å teste OAuth2-autentisering 
 * mot det faktiske Documaster API-et (ikke mock).
 * 
 * Kjør med: node dist/tests/services/documaster.oauth2.service.real.js
 */

import 'dotenv/config';
import { DocumentmasterOAuth2Service } from '../../src/services/documaster.oauth2.service';

/**
 * Tester OAuth2-autentisering mot det faktiske Documaster API-endepunktet
 */
async function testRealAuth(): Promise<boolean> {
  console.log('Tester Documaster OAuth2-autentisering mot faktisk endepunkt...');
  console.log('--------------------------------------------------------------');
  
  try {
    console.log('Oppretter OAuth2 service-instans');
    const oauthService = new DocumentmasterOAuth2Service();
    
    console.log('Forsøker å hente tilgangstoken...');
    const token = await oauthService.getAccessToken();
    
    // Maskerer deler av tokenet av sikkerhetshensyn
    const maskedToken = token.length > 20 
      ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      : '[Token for kort til å maskere]';
    
    console.log('✅ Tilgangstoken hentet:', maskedToken);
    console.log(`   Token-lengde: ${token.length} tegn`);
    
    console.log('Henter autorisasjonsheader...');
    const authHeader = await oauthService.getAuthorizationHeader();
    console.log('✅ Autorisasjonsheader-format:', authHeader.substring(0, 10) + '...');
    
    console.log('--------------------------------------------------------------');
    console.log('Alle tester bestått! OAuth2-autentisering fungerer korrekt.');
    return true;
  } catch (error) {
    console.error('❌ FEIL ved testing av OAuth2-autentisering:');
    console.error(error);
    return false;
  }
}

// Kjør testen hvis filen kjøres direkte
if (require.main === module) {
  testRealAuth()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Uhåndtert feil under test:', err);
      process.exit(1);
    });
}

// Eksporter testfunksjonen for bruk i andre script
export { testRealAuth }; 