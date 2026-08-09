const fs = require('fs');

const batches = [
  {
    name: 'batch1.json',
    files: [
      'package.json', 'README.md', '.gitignore', 'ODAVA_System_Documentation.txt', 
      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json', 
      'electron-builder.yml', 'electron.vite.config.ts', 'eslint.config.mjs'
    ]
  },
  {
    name: 'batch2.json',
    files: [
      'src/main/index.ts', 'src/main/scanner.ts', 'src/main/ai-service.ts', 
      'src/main/security-rules.ts', 'src/preload/index.ts', 'src/preload/index.d.ts'
    ]
  },
  {
    name: 'batch3.json',
    files: [
      'src/main/data/security-rules.json', 'src/main/data/enrichment-prompts.json', 
      'src/main/data/finding-schema.json'
    ]
  },
  {
    name: 'batch4.json',
    files: [
      'src/renderer/index.html', 'src/renderer/src/main.tsx', 'src/renderer/src/App.tsx', 
      'src/renderer/src/env.d.ts', 'src/renderer/src/components/Versions.tsx', 
      'src/renderer/src/components/VulnerabilityReport.tsx', 
      'src/renderer/src/assets/main.css', 'src/renderer/src/assets/base.css'
    ]
  }
];

for (const batch of batches) {
  const result = batch.files.map(file => {
    try {
      return { path: file, content: fs.readFileSync(file, 'utf8') };
    } catch(e) {
      return null;
    }
  }).filter(Boolean);
  fs.writeFileSync(batch.name, JSON.stringify(result, null, 2));
  console.log(`Created ${batch.name} - ${result.length} files`);
}
