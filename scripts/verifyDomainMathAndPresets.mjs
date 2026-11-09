import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTsModule(tsFilePath, injectedImports = {}) {
  const source = fs.readFileSync(tsFilePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
  }).outputText;

  const moduleObj = { exports: {} };
  const customRequire = (specifier) => {
    if (specifier in injectedImports) {
      return injectedImports[specifier];
    }
    throw new Error(`Unexpected import in test: ${specifier}`);
  };

  const wrapper = new vm.Script(
    `(function(exports, require, module) { ${transpiled} })`
  );
  const fn = wrapper.runInThisContext();
  fn(moduleObj.exports, customRequire, moduleObj);
  return moduleObj.exports;
}

const constants = loadTsModule('./src/shared/config/constants.ts');
const noteMath = loadTsModule('./src/entities/pitch/lib/noteFrequencyMath.ts', {
  '@/shared/config/constants': constants,
  '../model/types': {},
});
const presets = loadTsModule('./src/entities/tuning-preset/model/presets.ts', {
  '@/shared/config/constants': constants,
  './types': {},
});

const readingLowE = noteMath.convertFrequencyToPitchReading(82.41, 440);
assert.equal(readingLowE.noteName, 'E');
assert.equal(readingLowE.octave, 2);
assert.equal(readingLowE.cents, 0);
assert.equal(readingLowE.midiNote, 40);

const readingA4 = noteMath.convertFrequencyToPitchReading(440, 440);
assert.equal(readingA4.noteName, 'A');
assert.equal(readingA4.octave, 4);
assert.equal(readingA4.cents, 0);
assert.equal(readingA4.midiNote, 69);

const readingSharpA4 = noteMath.convertFrequencyToPitchReading(442.55, 440);
assert.equal(readingSharpA4.noteName, 'A');
assert.equal(readingSharpA4.octave, 4);
assert.equal(readingSharpA4.cents, 10.0);

const allPresets440 = presets.getAllCalibratedPresets(440);
assert.equal(allPresets440.length, 6);

const standard440 = presets.buildCalibratedPreset('standard', 440);
assert.equal(standard440.strings.length, 6);
assert.equal(standard440.strings[0].frequencyHz, 82.41);
assert.equal(standard440.strings[5].frequencyHz, 329.63);

const dropD440 = presets.buildCalibratedPreset('drop_d', 440);
assert.equal(dropD440.strings[0].noteName, 'D');
assert.equal(dropD440.strings[0].frequencyHz, 73.42);

const openG440 = presets.buildCalibratedPreset('open_g', 440);
assert.equal(openG440.strings[0].noteName, 'D');
assert.equal(openG440.strings[1].noteName, 'G');
assert.equal(openG440.strings[5].noteName, 'D');

const dadgad440 = presets.buildCalibratedPreset('dadgad', 440);
assert.equal(dadgad440.strings[4].noteName, 'A');

const halfStep440 = presets.buildCalibratedPreset('half_step_down', 440);
assert.equal(halfStep440.strings[0].noteName, 'D#');

const standard432 = presets.buildCalibratedPreset('standard', 432);
assert.equal(standard432.strings[0].frequencyHz, 80.91);
assert.equal(standard432.strings[1].frequencyHz, 108.0);

const standard466 = presets.buildCalibratedPreset('standard', 466);
assert.equal(standard466.strings[1].frequencyHz, 116.5);

const chromaticPreset = presets.buildCalibratedPreset('chromatic', 440);
assert.equal(chromaticPreset.isChromatic, true);
assert.equal(chromaticPreset.strings.length, 0);

console.log('[PASS] All TypeScript domain math and tuning preset tests passed.');
