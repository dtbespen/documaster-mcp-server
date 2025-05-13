// Test av Documaster controller - searchDocuments-metoden med ny formatering
require('dotenv').config();

// Bruk esbuild-register for å håndtere TypeScript imports
require('esbuild-register');

// Importer direkte fra src
const { default: documasterController } = require('../../src/controllers/documaster.controller');
const fs = require('fs');

async function testSearchFormatting() {
  console.log('\n=== TEST AV DOCUMASTER CONTROLLER - SEARCH DOCUMENTS ===');
  
  try {
    // Test søk med Alexander Fosse
    console.log('\nSøker etter "Alexander Fosse"...');
    const results = await documasterController.searchDocuments('Alexander Fosse', 3);
    
    console.log(`Fikk ${results.length} resultater`);
    
    // Skriv ut formateringen av søkeresultatene
    console.log('\nFormatert resultat:');
    results.forEach((result, i) => {
      console.log(`\n--- Resultat ${i+1} ---`);
      console.log('ID:', result.id);
      console.log('Tittel:', result.title);
      console.log('JournalpostID:', result.journalpostId);
      console.log('SaksmappeID:', result.saksmappeId);
      console.log('DokumentID:', result.dokumentId);
      console.log('Funnet i:', result.foundIn);
      
      if (result.highlights && result.highlights.length > 0) {
        console.log('Søketreff:');
        result.highlights.forEach(hl => console.log(`  - ${hl}`));
      }
      
      console.log('URL:', result.url);
    });
    
    // Lagre hele responsen til fil for inspeksjon
    fs.writeFileSync('documaster-controller-test-results.json', JSON.stringify(results, null, 2));
    console.log('\nLagret fullstendig resultat til documaster-controller-test-results.json');
    
    return true;
  } catch (error) {
    console.error('Feil ved testing av controller:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Kjør testen
async function runTest() {
  try {
    const success = await testSearchFormatting();
    console.log(`\n=== TEST RESULTAT: ${success ? 'VELLYKKET' : 'FEILET'} ===`);
    
    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Uventet feil under testing:', error);
    process.exit(1);
  }
}

runTest(); 