// Testskript for Documaster query API
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
 * Test query mot Documaster
 */
async function testQuery(token) {
  console.log('\n=== TEST DOCUMASTER QUERY API ===');
  
  // Stegvis bygging av URL for debugging
  console.log('URL-konstruksjon:');
  const baseUrlRaw = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  console.log('1. baseUrlRaw:', baseUrlRaw);
  
  // Konstruere URL med riktig endepunkt
  let queryEndpoint;
  if (baseUrlRaw.includes(':8083')) {
    // Allerede har port spesifisert i baseUrl
    queryEndpoint = `${baseUrlRaw}/rms/api/public/noark5/v1/query`;
  } else {
    // Legg til port
    const baseUrlWithPort = baseUrlRaw.replace(/(https?:\/\/[^\/]+)(.*)/, '$1:8083$2');
    queryEndpoint = `${baseUrlWithPort}/rms/api/public/noark5/v1/query`;
  }
  
  console.log('Tester endepunkt:', queryEndpoint);
  
  // Liste med spørrings-eksempler å teste
  const queryExamples = [
    // Enkelt oppslag på journalposter
    {
      description: "Hent journalposter",
      body: {
        type: "Journalpost",
        limit: 5
      }
    },
    // Spørring med filter på tittel
    {
      description: "Journalposter med søk i tittel",
      body: {
        type: "Journalpost",
        query: "tittel like @title",
        parameters: {
          "@title": "%notat%"
        },
        limit: 5
      }
    },
    // Mer kompleks spørring med joins
    {
      description: "Saksmapper med joins",
      body: {
        type: "Saksmappe",
        joins: {
          "klasser": "klasse"
        },
        limit: 5
      }
    }
  ];
  
  // Test hver query
  for (const example of queryExamples) {
    console.log(`\n>>> Tester: ${example.description} <<<`);
    console.log(`Spørringsparametre: ${JSON.stringify(example.body, null, 2)}`);
    
    try {
      const response = await axios.post(queryEndpoint, example.body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Documaster-Error-Response-Type': 'application/json'
        }
      });
      
      console.log(`Suksess! Status:`, response.status);
      console.log('Antall resultater:', response.data.results?.length || 0);
      console.log('Har flere resultater:', response.data.hasMore ? 'Ja' : 'Nei');
      
      if (response.data.results?.length > 0) {
        console.log('\nEksempel på første resultat:');
        console.log(JSON.stringify(response.data.results[0], null, 2));
        
        // Lagre resultatet for denne spørringen
        const filename = `documaster-query-result-${example.description.replace(/\s+/g, '-').toLowerCase()}.json`;
        fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
        console.log(`Resultat lagret til ${filename}`);
      }
    } catch (error) {
      console.error(`Feil med spørring ${example.description}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Ingen respons mottatt');
      }
      
      console.log('Prøver neste spørring...');
    }
  }
  
  // Testen er vellykket hvis vi fikk kjørt minst én spørring uten feil
  return true;
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
    console.log(`Documaster Query API: ${querySuccess ? 'OK' : 'FEILET'}`);
    
    // Gi mer veiledning hvis testen feilet
    if (!querySuccess) {
      console.log(`
Feilsøkingstips:
1. Sjekk at brukerrettigheter er satt opp riktig for API-et
2. Verifiser at endepunktet er korrekt
3. Sjekk query-syntaksen mot Documaster dokumentasjon
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