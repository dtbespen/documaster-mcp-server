// Debugging-versjon med mer detaljert logging
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Konfigurasjonsinfo
const config = {
  clientId: process.env.DOCUMASTER_CLIENT_ID,
  clientSecret: process.env.DOCUMASTER_CLIENT_SECRET,
  tokenUrl: process.env.DOCUMASTER_TOKEN_URL,
  baseUrl: process.env.DOCUMASTER_API_BASE_URL,
  scope: process.env.DOCUMASTER_SCOPE || 'openid'
};

// Logg miljøvariabler (sensitivt innhold maskert)
console.log('=== MILJØVARIABLER ===');
console.log('DOCUMASTER_CLIENT_ID:', config.clientId ? `${config.clientId.substring(0, 4)}...` : 'ikke satt');
console.log('DOCUMASTER_CLIENT_SECRET:', config.clientSecret ? 'Satt (maskert)' : 'ikke satt');
console.log('DOCUMASTER_TOKEN_URL:', config.tokenUrl);
console.log('DOCUMASTER_API_BASE_URL:', config.baseUrl);
console.log('DOCUMASTER_SCOPE:', config.scope);

/**
 * Hjelper for å hente OAuth2 token
 */
async function getToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  
  if (config.scope) {
    params.append('scope', config.scope);
  }
  
  console.log(`\nHenter token fra: ${config.tokenUrl}`);
  
  try {
    const response = await axios.post(config.tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Token-respons status:', response.status);
    console.log('Token-respons headers:', JSON.stringify(response.headers, null, 2));
    return response.data.access_token;
  } catch (error) {
    console.error('Feil ved henting av token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}

/**
 * Test generell query mot arkiv
 */
async function testQuery(token) {
  console.log('\n=== TEST NOARK5 QUERY ===');
  
  // Stegvis bygging av URL for debugging
  console.log('URL-konstruksjon:');
  const baseUrlRaw = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  console.log('1. baseUrlRaw:', baseUrlRaw);
  
  // Test forskjellige varianter av API-roten
  const testEndpoints = [
    // Variant 1: Direkte fra eksempelet
    'https://integrationtest.dev.documaster.tech:8083/rms/api/public/noark5/v1/query',
    
    // Variant 2: Bygg fra baseUrl med logikk
    `${baseUrlRaw}/rms/api/public/noark5/v1/query`,
    
    // Variant 3: Bygg med portsjekk
    baseUrlRaw.includes(':8083') 
      ? `${baseUrlRaw}/rms/api/public/noark5/v1/query`
      : `${baseUrlRaw}:8083/rms/api/public/noark5/v1/query`,
  ];
  
  // Eksempel-body gitt av brukeren
  const queryData = {
    type: 'AbstraktRegistrering',
    limit: 10,
    query: 'registreringsIdent = @registreringID',
    parameters: {
      '@registreringID': '2024/4219'
    }
  };
  
  let success = false;
  
  // Prøv alle test-endepunkter
  for (const endpointUrl of testEndpoints) {
    console.log(`\nTester endepunkt: ${endpointUrl}`);
    console.log(`Body: ${JSON.stringify(queryData, null, 2)}`);
    
    try {
      const response = await axios.post(endpointUrl, queryData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Documaster-Error-Response-Type': 'application/json'
        }
      });
      
      console.log('Suksess! Status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Lagre resultatet
      fs.writeFileSync('documaster-query-result.json', JSON.stringify(response.data, null, 2));
      console.log('Resultat lagret til documaster-query-result.json');
      
      success = true;
      break; // Stopp når vi har første suksess
    } catch (error) {
      console.error(`Feil med ${endpointUrl}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Ingen respons mottatt');
      }
    }
  }
  
  return success;
}

/**
 * Utfør test
 */
async function runTests() {
  try {
    const token = await getToken();
    console.log(`\nToken hentet (lengde: ${token.length}), første 10 tegn: ${token.substring(0, 10)}...`);
    
    const querySuccess = await testQuery(token);
    console.log('\n=== TESTRESULTAT ===');
    console.log(`Noark5 Query: ${querySuccess ? 'OK' : 'FEILET'}`);
    
    // Gi mer veiledning hvis testen feilet
    if (!querySuccess) {
      console.log(`
Feilsøkingstips:
1. Sjekk at DOCUMASTER_API_BASE_URL i .env er korrekt (bør være https://integrationtest.dev.documaster.tech:8083)
2. Verifiser at brukeren har riktige rettigheter til API-et
3. Kontroller at dokumentasjonen matcher faktisk API-struktur
4. Verifiser i Postman med samme token
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Kritisk feil under testene:', error.message);
    process.exit(1);
  }
}

// Kjør testen
runTests(); 