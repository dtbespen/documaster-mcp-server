// Testskript for Documaster søk-API
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
 * Test fulltekstsøk etter dokumenter med riktig body format
 */
async function testSearch(token) {
  console.log('\n=== TEST DOCUMASTER FULL-TEXT SEARCH ===');
  
  // Stegvis bygging av URL for debugging
  console.log('URL-konstruksjon:');
  const baseUrlRaw = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  console.log('1. baseUrlRaw:', baseUrlRaw);
  
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
  
  console.log('Tester endepunkt:', searchEndpoint);
  
  // Liste med søkeord å prøve
  const searchTerms = ['notat', 'Alexander Fosse'];
  
  let allResults = [];
  
  // Prøv hvert søkeord
  for (const term of searchTerms) {
    console.log(`\n>>> Tester søkeord: "${term}" <<<`);
    
    // Riktig body format: { "doctype": "Tekst", "query": "søkeord" }
    const searchData = {
      doctype: "Tekst", // Mest vanlig indekssamling ifølge Documaster dokumentasjon
      query: term
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
      
      console.log(`Suksess med søkeord "${term}"! Status:`, response.status);
      console.log('Antall resultater:', response.data.results?.length || 0);
      console.log('Totalt antall treff:', response.data.total || 0);
      
      if (response.data.results?.length > 0) {
        // Lagre rå respons for dette søkeordet
        fs.writeFileSync(`documaster-raw-search-result-${term.replace(/\s+/g, '-')}.json`, 
                         JSON.stringify(response.data, null, 2));
        
        // Prosesser resultatene til vårt interne format
        const processedResults = processSearchResults(response.data, baseUrlRaw);
        allResults = [...allResults, ...processedResults];
        
        // Vis detaljer om første treff
        console.log('\nEksempel på prosessert treff:');
        console.log(JSON.stringify(processedResults[0], null, 2));
        
        // Lagre formatterte resultater
        fs.writeFileSync(`documaster-processed-search-result-${term.replace(/\s+/g, '-')}.json`, 
                         JSON.stringify(processedResults, null, 2));
        console.log(`Prosesserte resultater for "${term}" lagret til documaster-processed-search-result-${term.replace(/\s+/g, '-')}.json`);
      }
    } catch (error) {
      console.error(`Feil med søk på "${term}":`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        if (error.response.status === 500) {
          console.error('Feilkode:', error.response.data?.errorCode);
          console.error('Feilbeskrivelse:', error.response.data?.description);
        } else {
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
      } else {
        console.error('Ingen respons mottatt');
      }
      
      // Prøv neste søkeord
      console.log('Prøver neste søkeord...');
    }
  }
  
  // Returnerer true hvis vi fikk minst ett resultat
  return allResults.length > 0;
}

/**
 * Prosesserer søkeresultater til vårt interne format
 */
function processSearchResults(data, baseUrlRaw) {
  // Ekstraher bare domenet uten porter
  const domainMatch = baseUrlRaw.match(/(https?:\/\/[^:\/]+)/);
  const domain = domainMatch ? domainMatch[1] : baseUrlRaw.replace(/:\d+/, '').replace(/\/rms.*$/, '');
  
  return (data.results || []).map((item, index) => {
    // Ekstraher IDs fra hierarkiet
    const dokumentId = item.ids['Dokument.id']?.[0] || '';
    const journalpostId = item.ids['AbstraktRegistrering.id']?.[0] || '';
    const basisregistreringId = item.ids['Basisregistrering.id']?.[0] || '';
    const saksmappeId = item.ids['AbstraktMappe.id']?.[0] || '';
    const mappeId = item.ids['Mappe.id']?.[0] || '';
    const korrespondansepartId = item.ids['Korrespondansepart.id']?.[0] || '';
    
    // Finn ut hvor treffet ble funnet ved å se på highlights
    const highlightKeys = Object.keys(item.highlights || {});
    const foundIn = highlightKeys.length > 0 ? highlightKeys[0] : 'Ukjent';
    
    // Samle alle highlight-verdier
    const allHighlights = [];
    highlightKeys.forEach(key => {
      const highlights = item.highlights[key] || [];
      highlights.forEach(hl => {
        // Konverter highlight-markeringer til noe mer lesbart
        const readableHighlight = hl
          .replace(/\|=hlstart=\|/g, '**')
          .replace(/\|=hlstop=\|/g, '**');
        allHighlights.push(`${key}: ${readableHighlight}`);
      });
    });
    
    // Bestem URL basert på tilgjengelige ID-er, i prioritert rekkefølge
    let url = '';
    if (journalpostId) {
      url = `${domain}/v2/entity/registry-entry/${journalpostId}`;
    } else if (basisregistreringId) {
      url = `${domain}/v2/entity/record/${basisregistreringId}`;
    } else if (saksmappeId) {
      url = `${domain}/v2/entity/case-file/${saksmappeId}`;
    } else if (mappeId) {
      url = `${domain}/v2/entity/folder/${mappeId}`;
    } else if (dokumentId) {
      url = `${domain}/v2/entity/document/${dokumentId}`;
    }
    
    return {
      id: journalpostId || basisregistreringId || saksmappeId || mappeId || dokumentId || `result-${index}`,
      dokumentId,
      journalpostId,
      basisregistreringId,
      saksmappeId,
      mappeId,
      korrespondansepartId,
      title: `Treff i ${foundIn.split('.').pop() || 'dokument'}`, // Forenklet tittel basert på hvor treffet er funnet
      documentType: 'Arkivdokument',
      foundIn,
      highlights: allHighlights,
      url
    };
  });
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
    console.log(`Documaster Fulltekstsøk: ${searchSuccess ? 'OK' : 'FEILET'}`);
    
    // Gi mer veiledning hvis testen feilet
    if (!searchSuccess) {
      console.log(`
Feilsøkingstips:
1. Sjekk at doctype "Tekst" er tilgjengelig i systemet
2. Verifiser at brukeren har riktige rettigheter til søke-API-et
3. Prøv med andre søkeord som kan finnes i arkivet
4. Verifiser at endepunktet er korrekt
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