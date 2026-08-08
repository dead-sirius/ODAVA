import * as fs from 'fs';
import { RuleResult } from './security-rules';
import findingSchema from './data/finding-schema.json';
import enrichmentPrompts from './data/enrichment-prompts.json';

export interface EnrichedFinding {
  description: string;
  remediation: string;
  isFalsePositive: boolean;
  confidence: "low" | "medium" | "high";
}

export class AiService {
  private llama: any | null = null;
  private model: any | null = null;
  private context: any | null = null;
  private session: any | null = null;
  private grammar: any | null = null;

  public isReady = false;

  async init(modelPath?: string) {
    try {
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
      
      this.llama = await getLlama();
      
      if (modelPath && fs.existsSync(modelPath)) {
        this.model = await this.llama.loadModel({
          modelPath: modelPath
        });
        this.context = await this.model.createContext();
        this.session = new LlamaChatSession({
          contextSequence: this.context.getSequence()
        });
        this.grammar = await this.llama.createGrammarForJsonSchema(findingSchema as any);
        this.isReady = true;
      }
    } catch (e) {
      console.error('Failed to initialize AI Service', e);
      this.isReady = false;
    }
  }

  async enrichRuleResult(filename: string, ruleResult: RuleResult): Promise<RuleResult & EnrichedFinding> {
    const fallback: RuleResult & EnrichedFinding = {
      ...ruleResult,
      isFalsePositive: false,
      confidence: "low",
      remediation: ""
    };

    if (!this.session || !this.isReady || !this.grammar) {
      return fallback;
    }

    try {
      const cweEntry = (enrichmentPrompts.perCwe as Record<string, any>)[ruleResult.cwe];
      
      const system = enrichmentPrompts.basePromptTemplate
        .replace("{{CWE_ID}}", ruleResult.cwe)
        .replace("{{CWE_NAME}}", cweEntry?.name ?? "Security Weakness")
        .replace("{{RULE_MESSAGE}}", ruleResult.description)
        + (cweEntry?.guidance ? `\n\nSpecific guidance: ${cweEntry.guidance}` : "");

      const example = cweEntry?.example;
      const exampleBlock = example
        ? `\n\nExample:\nSnippet:\n${example.snippet}\n\nExpected JSON:\n${JSON.stringify({
            description: example.description,
            remediation: example.remediation,
            isFalsePositive: example.isFalsePositive,
            confidence: example.confidence
          })}`
        : "";

      const user = `${exampleBlock}\n\nNow analyze this snippet from ${filename}:\n${ruleResult.snippet}`;

      if (typeof this.session.setChatHistory === 'function') {
        this.session.setChatHistory([{ type: "system", text: system }]);
      }

      const responseText = await this.session.prompt(user, {
        grammar: this.grammar,
        maxTokens: 250
      });

      const parsed = this.grammar.parse(responseText) as EnrichedFinding;
      
      return {
        ...ruleResult,
        description: parsed.description,
        remediation: parsed.remediation,
        isFalsePositive: parsed.isFalsePositive,
        confidence: parsed.confidence
      };
    } catch (e) {
      console.warn('AI enrichment failed or timed out:', e);
      return fallback;
    }
  }
}
