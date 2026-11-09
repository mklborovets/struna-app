import fs from 'node:fs';
import path from 'node:path';

const cmakePath = path.resolve(
  process.cwd(),
  'node_modules/react-native-quick-sqlite/android/CMakeLists.txt'
);

if (fs.existsSync(cmakePath)) {
  const original = fs.readFileSync(cmakePath, 'utf8');
  const updated = original
    .replace('ReactAndroid::turbomodulejsijni', 'ReactAndroid::reactnative')
    .replace(/\s*ReactAndroid::react_nativemodule_core/g, '');

  if (updated !== original) {
    fs.writeFileSync(cmakePath, updated, 'utf8');
    console.log('[patchNativeLibs] Patched react-native-quick-sqlite CMakeLists.txt for RN 0.76');
  }
}

