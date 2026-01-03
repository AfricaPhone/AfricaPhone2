/**
 * Script de build pour le panneau admin
 * Obscurcit le fichier main.js et crée une version de production
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'assets', 'js', 'main.js');
const outputPath = path.join(__dirname, 'assets', 'js', 'main.obfuscated.js');
const backupPath = path.join(__dirname, 'assets', 'js', 'main.original.js');

console.log('📦 Build du panneau admin - Obscurcissement\n');

// Lire le fichier source
console.log('📂 Lecture de main.js...');
const sourceCode = fs.readFileSync(inputPath, 'utf8');
console.log(`   Taille originale: ${(sourceCode.length / 1024).toFixed(2)} KB`);

// Sauvegarder l'original si pas déjà fait
if (!fs.existsSync(backupPath)) {
    console.log('💾 Sauvegarde de l\'original...');
    fs.copyFileSync(inputPath, backupPath);
}

// Obscurcir
console.log('🔒 Obscurcissement en cours...');
const startTime = Date.now();

const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
    // Niveau modéré d'obscurcissement
    compact: true,
    simplify: true,
    stringArray: true,
    rotateStringArray: true,
    stringArrayThreshold: 0.75,
    identifierNamesGenerator: 'hexadecimal',

    // Désactiver les console.log en production
    disableConsoleOutput: true,

    // Options de performance (désactivées)
    deadCodeInjection: false,
    debugProtection: false,
    selfDefending: false,

    // Compatibilité navigateur
    target: 'browser',
});

const obfuscatedCode = obfuscationResult.getObfuscatedCode();
const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`   Durée: ${duration}s`);
console.log(`   Taille finale: ${(obfuscatedCode.length / 1024).toFixed(2)} KB`);
console.log(`   Ratio: ${((obfuscatedCode.length / sourceCode.length) * 100).toFixed(1)}%`);

// Écrire le fichier obscurci
fs.writeFileSync(outputPath, obfuscatedCode, 'utf8');
console.log(`\n✅ Fichier créé: ${outputPath}`);

// Remplacer main.js par la version obscurcie pour la production
fs.copyFileSync(outputPath, inputPath);
console.log('✅ main.js remplacé par la version obscurcie');

console.log('\n🎉 Build terminé avec succès!');
console.log('   Pour restaurer l\'original: copier main.original.js vers main.js');
