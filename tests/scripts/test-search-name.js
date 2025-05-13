// Testskript for Documaster søk-API med bestemt navn
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
    return response.data.access_token;
  } catch (error) {
    console.error('Feil ved henting av token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Test fulltekstsøk etter bestemt navn
 */
async function testSearch(token) {
  console.log('\n=== TEST DOCUMASTER SØKEORD: "Alexander Fosse" ===');
  
  // Stegvis bygging av URL
  const baseUrlRaw = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  
  // Konstruere URL med riktig endepunkt
  let searchEndpoint;
  if (baseUrlRaw.includes(':8083')) {
    // Allerede har port spesifisert i baseUrl
    searchEndpoint = `${baseUrlRaw}/rms/api/public/noark5/v1/full-text/search`;
  } else {
    // Legg til port
    const baseUrlWithPort = baseUrlRaw.replace(/(https?:\/\/[^\/]+)(.*)/, '$1:8083$2');
    searchEndpoint = `${baseUrlWithPort}/rms/api/public/noark5/v1/full-text/search`;
  }
  
  console.log('Søkeendepunkt:', searchEndpoint);
  
  // Riktig body format med eksakt søkeord
  const searchData = {
    doctype: "Tekst",
    query: "Alexander Fosse"
  };
  
  console.log(`Søkeparametre: ${JSON.stringify(searchData, null, 2)}`);
  
  try {
    const response = await axios.post(searchEndpoint, searchData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Documaster-Error-Response-Type': 'application/json'
      }
    });
    
    console.log('Suksess! Status:', response.status);
    console.log('Antall resultater:', response.data.results?.length || 0);
    
    if (response.data.results?.length > 0) {
      console.log('Første resultat:', JSON.stringify(response.data.results[0], null, 2));
      
      // Lagre resultatet
      fs.writeFileSync('documaster-search-result-alexander-fosse.json', 
                       JSON.stringify(response.data, null, 2));
      console.log('Resultat lagret til documaster-search-result-alexander-fosse.json');
      
      return true;
    } else {
      console.log('Ingen resultater funnet for søkeordet "Alexander Fosse"');
      return false;
    }
  } catch (error) {
    console.error(`Feil ved søk:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Ingen respons mottatt');
    }
    return false;
  }
}

/**
 * Utfør test
 */
async function runTests() {
  try {
    const token = await getToken();
    console.log(`\nToken hentet (lengde: ${token.length}), første 10 tegn: ${token.substring(0, 10)}...`);
    
    const searchSuccess = await testSearch(token);
    console.log('\n=== TESTRESULTAT ===');
    console.log(`Documaster Søk etter "Alexander Fosse": ${searchSuccess ? 'OK - fant resultat' : 'OK - ingen resultater funnet'}`);
  } catch (error) {
    console.error('Kritisk feil under testene:', error.message);
    process.exit(1);
  }
}

// Kjør testen
runTests(); 