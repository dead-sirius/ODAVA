import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { AiService } from './ai-service';
import { SecurityRuleEngine, RuleResult } from './security-rules';

export class Scanner {
  private aiService: AiService;
  
  private supportedExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.php',
    '.c', '.cpp', '.cs', '.html', '.vue', '.sql', '.sh', '.json',
    '.yml', '.yaml', '.env'
  ];

  private ignoreDirs = [
    'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
    'coverage', 'vendor', '__pycache__', '.idea', '.vscode'
  ];

  constructor() {
    this.aiService = new AiService();
    // Default model
    this.setupModel('phi-4-mini-instruct-q4.gguf').catch(console.error);
  }

  public async setupModel(modelName: string): Promise<void> {
    const modelPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'models', modelName)
      : path.join(process.cwd(), 'models', modelName);
    
    await this.aiService.init(modelPath);
  }

  public isModelReady(): boolean {
    return this.aiService.isReady;
  }

  async scanDirectory(dirPath: string, onProgress: (progress: number, newVuln: any | null) => void): Promise<any[]> {
    const filesToScan: string[] = [];
    this.walkDir(dirPath, filesToScan);
    
    const vulnerabilities: any[] = [];
    const totalFiles = filesToScan.length;

    if (totalFiles === 0) {
      onProgress(100, null);
      return vulnerabilities;
    }

    for (let i = 0; i < totalFiles; i++) {
      const file = filesToScan[i];
      const relativePath = path.relative(dirPath, file);
      const ext = path.extname(file).toLowerCase();
      
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const ruleResults: RuleResult[] = SecurityRuleEngine.analyzeSnippet(content, file.endsWith('.env') ? '.env' : ext);
        
        if (ruleResults.length > 0) {
          for (let res of ruleResults) {
            let enriched: any = { ...res };
            let isFalsePositive = false;
            let confidence = "low";

            if (this.aiService.isReady) {
              const aiEnriched = await this.aiService.enrichRuleResult(relativePath, res);
              enriched = aiEnriched;
              isFalsePositive = aiEnriched.isFalsePositive;
              confidence = aiEnriched.confidence;
            }

            const vulnObj = {
              id: Math.random().toString(36).substring(2, 11),
              file: relativePath,
              title: enriched.title,
              severity: enriched.severity,
              description: enriched.description,
              snippet: enriched.snippet,
              recommendation: enriched.recommendation,
              cwe: enriched.cwe,
              confidence: confidence,
              isFalsePositive: isFalsePositive
            };

            vulnerabilities.push(vulnObj);
            onProgress(Math.floor(((i + 1) / totalFiles) * 100), vulnObj);
          }
        }
        
        // Report progress step
        onProgress(Math.floor(((i + 1) / totalFiles) * 100), null);
      } catch (err) {
        console.error(`Error reading file ${file}`, err);
        onProgress(Math.floor(((i + 1) / totalFiles) * 100), null);
      }
    }

    onProgress(100, null);
    return vulnerabilities;
  }

  private walkDir(dir: string, fileList: string[]) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (this.ignoreDirs.includes(file) || file.startsWith('.') && !file.endsWith('.env')) continue;
        
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          this.walkDir(filePath, fileList);
        } else {
          const ext = path.extname(file).toLowerCase();
          if ((this.supportedExtensions.includes(ext) || file.endsWith('.env')) && stat.size < 500000) {
            fileList.push(filePath);
          }
        }
      }
    } catch (err) {
      console.error(`Error walking directory ${dir}`, err);
    }
  }
}
