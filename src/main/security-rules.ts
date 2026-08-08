import rulesData from './data/security-rules.json';

export interface RuleResult {
  title: string;
  severity: 'high' | 'medium' | 'low' | 'critical';
  description: string;
  snippet: string;
  recommendation: string;
  cwe: string;
}

interface CompiledRule {
  id: string;
  cwe: string;
  owasp: string;
  languages: string[];
  severity: string;
  regex: RegExp;
  name: string;
  message: string;
}

// Compile regex rules on startup
const compiledRules: CompiledRule[] = rulesData.rules.map((r: any) => ({
  ...r,
  regex: new RegExp(r.pattern, r.flags || '')
}));

const EXTENSION_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.html': 'html',
  '.vue': 'vue',
  '.sql': 'sql',
  '.sh': 'shell',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.env': 'env'
};

export class SecurityRuleEngine {
  public static analyzeSnippet(code: string, extension: string): RuleResult[] {
    const results: RuleResult[] = [];
    const lines = code.split('\n');
    const language = EXTENSION_MAP[extension.toLowerCase()];

    if (!language) return results;

    const applicableRules = compiledRules.filter(r => r.languages.includes(language));
    if (applicableRules.length === 0) return results;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }

      for (const rule of applicableRules) {
        if (rule.regex.test(line)) {
          // Context around the line
          const start = Math.max(0, index - 1);
          const end = Math.min(lines.length, index + 2);
          const snippet = lines.slice(start, end).join('\n');

          results.push({
            title: rule.name,
            severity: rule.severity as any,
            description: rule.message,
            snippet: snippet || line,
            recommendation: `Follow secure coding practices for ${rule.cwe} (${rule.owasp}).`,
            cwe: rule.cwe
          });
          break; // Matched one rule for this line
        }
      }
    });

    return results;
  }
}
