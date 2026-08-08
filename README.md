# ODAVA Core - On-Device AI Vulnerability Analyzer

![ODAVA Badge](https://img.shields.io/badge/Security-Local%20AI-6366f1?style=for-the-badge&logo=shield&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

ODAVA (On-Device AI Vulnerability Analyzer) is a cutting-edge desktop application built with Electron, React, and TypeScript. It is designed to perform incredibly fast, highly accurate, and completely offline **Static Application Security Testing (SAST)** on local codebases.

With ODAVA, sensitive source code never leaves the developer's machine. It leverages local Small Language Models (SLMs) in GGUF format running on the CPU/GPU via `node-llama-cpp` to deliver contextual vulnerability analysis.

## ✨ Key Features

- 🔒 **Absolute Privacy:** 100% local analysis. Zero data exfiltration. No API keys or internet connection required for inference.
- ⚡ **Hybrid Scanning Engine:** Combines high-speed static heuristic rules with deep AI enrichment to prevent LLM context explosion.
- 🎯 **AI-Enriched Findings:** Uses local AI (e.g., Qwen2.5-0.5B-Instruct) to eliminate false positives and provide specific, actionable remediation steps.
- 📊 **PDF Reporting:** Instantly generate and export professional vulnerability reports as PDF documents.
- 🖥️ **Premium Dashboard:** A stunning, glassmorphism-inspired React interface for real-time progress and vulnerability management.

## 🏗️ System Architecture & Working Process

To maximize performance and prevent the AI context window from being overwhelmed, ODAVA uses a sophisticated two-phase hybrid scanning approach.

### Phase 1: High-Speed Static Rule Engine (Pre-Scan)
The scanner traverses the selected directory (skipping ignored folders like `node_modules` and `.git`). It passes file contents to the `SecurityRuleEngine`, which utilizes pre-defined heuristic patterns (Regex/AST-based) mapped to OWASP Top 10 and common CWE vulnerabilities.

**Detected Categories Include:**
- `CWE-89`: SQL Injection
- `CWE-78` / `CWE-95`: Command Injection / RCE
- `CWE-798`: Hardcoded Secrets / Keys
- `CWE-79`: Cross-Site Scripting (XSS)
- `CWE-22`: Path Traversal
- `CWE-327`: Weak Cryptography
- `CWE-1321`: Prototype Pollution
- `CWE-918`: Server-Side Request Forgery (SSRF)

### Phase 2: Deep AI Enrichment
Once the static engine flags a vulnerable code snippet, ODAVA isolates the snippet and passes it to the local AI model.
- The AI Service intelligently resets its session context before each prompt to ensure lightning-fast inference (typically < 1-2 seconds per finding).
- The LLM acts as a senior security reviewer, verifying the snippet and outputting a structured JSON response containing a context-aware description and concrete remediation guidance.
- The system parses the AI output according to strict grammar schemas to ensure robust stability.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- Local AI Model (e.g., `qwen2.5-0.5b-instruct-q4_k_m.gguf`) placed in the `models/` directory.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/dead-sirius/ODAVA.git
cd ODAVA
npm install
```

### Development

Run the application in development mode:

```bash
npm run dev
```

### Build

Compile the application for your respective operating system:

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## 🧠 The AI Model

ODAVA uses `node-llama-cpp` to interact with Small Language Models locally.
- **Recommended Model:** `Qwen2.5-0.5B-Instruct`
- **Quantization:** `Q4_K_M` (Optimal balance of speed and memory)
- **Format:** `GGUF`

By relying on carefully crafted prompts and JSON grammar constraints, the small local model outperforms traditional tools at understanding local context while remaining lightweight enough to run on standard developer laptops without specialized GPUs.

## 📄 License

This project is licensed under the MIT License.