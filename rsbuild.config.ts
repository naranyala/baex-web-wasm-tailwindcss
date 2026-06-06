import { defineConfig } from '@rsbuild/core';
import { pluginWasmPack } from 'rsbuild-plugin-wasmpack';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [
    pluginWasmPack({
      crates: [
        {
          path: './crates/web-core',
          target: 'web',
        },
        {
          path: './crates/web-utils',
          target: 'web',
        },
      ],
    }),
  ],
});
