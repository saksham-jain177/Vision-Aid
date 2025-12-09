# VisionAid - Urban Infrastructure Intelligence

AI-powered monitoring for safer, smarter cities.

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/saksham-jain177/Vision-Aid/actions/workflows/ci.yml/badge.svg)](https://github.com/saksham-jain177/Vision-Aid/actions)
[![Tests](https://img.shields.io/badge/tests-34%20passing-brightgreen.svg)](.)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Research%20Prototype-yellow)](.)

> **Maturity Level**: Research Prototype
> **Intended Use**: Demonstration, academic research, proof-of-concept
> **Privacy**: Edge-first processing, no persistent personal data storage

## 🚀 Overview

VisionAid is a comprehensive platform for urban intelligence, combining traffic management with infrastructure health monitoring. It leverages computer vision and AI to provide actionable insights for city maintenance and safety.

## ✨ Modules

### 🚦 Traffic Intelligence

Real-time traffic analysis and signal optimization.

- **Key Features**:
  - Vehicle detection & counting (YOLOv8)
  - Traffic density estimation
  - Adaptive signal timing simulation
  - Congestion analytics

### 🛣️ Infrastructure Health (NEW)

Automated detection of road and infrastructure defects using computer vision.

- **Key Features**:
  - Pothole detection
  - Road crack identification
  - Surface damage assessment
  - Severity classification (Low/Medium/High)
  - Automated reporting dashboard

## 🛠️ Tech Stack

### Core Technologies

- **React** 19.0.0 - UI framework
- **TypeScript** 5.7.2 - Type-safe JavaScript
- **Vite** 6.2.0 - Build tool

### AI & Computer Vision

- **YOLOv8** - Object and defect detection
- **TensorFlow.js** - In-browser model execution
- **Three.js** - 3D visualizations
- **OpenRouter API** - AI assistant integration

### Security & Reliability

- **Vitest** - Unit testing (34+ tests)
- **GitHub Actions** - CI/CD pipeline
- **Rate Limiting** - API abuse prevention
- **Input Sanitization** - XSS protection

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm or yarn

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/saksham-jain177/Vision-Aid.git
cd Vision-Aid
```

2. **Install dependencies:**

```bash
npm install
```

3. **Start development server:**

```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 📁 Project Structure

```
vision-aid/
├── src/
│   ├── components/
│   │   ├── projects/
│   │   │   ├── InfrastructureHealth.tsx   # Defect detection module
│   │   │   ├── UrbanTrafficDynamics.tsx   # Traffic simulation
│   │   │   └── ...
│   ├── services/
│   │   ├── defectDetectionService.ts      # YOLOv8 inference
│   │   └── ...
│   ├── utils/
│   │   ├── sanitize.ts                    # Security utils
│   │   └── rateLimit.ts                   # Rate limiting
│   └── ...
```

## 👥 Contributors

Want to contribute? Check out our [Contributing Guidelines](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **GitHub**: [@saksham-jain177](https://github.com/saksham-jain177)
