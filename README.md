# VisionAid - AI-Powered Computer Vision Platform

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.174.0-green.svg)](https://threejs.org/)
[![face-api](https://img.shields.io/badge/%40vladmandic%2Fface--api-1.7.13-orange.svg)](https://github.com/vladmandic/face-api)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Overview

VisionAid is an intelligent computer vision platform that combines AI-powered face recognition with traffic simulation systems. Built with React, TypeScript, and modern web technologies, it demonstrates real-world applications of computer vision and machine learning.

## ✨ Features

- **3D Interactive Visualization**: Immersive Three.js-powered animations
- **Real-time Face Recognition**: Advanced facial detection and matching
- **AI Chatbot**: Intelligent assistant powered by OpenRouter API
- **Traffic Simulation**: Density-based adaptive signal timing
- **Responsive Design**: Seamless experience across all devices
- **Offline Support**: IndexedDB caching for models and data
- **Multiple Video Sources**: Webcam, CCTV, drone, and local media support

## 🚀 Featured Projects

### Urban Traffic Dynamics

Real-time traffic simulation implementing density-based round-robin scheduling for intelligent traffic signal management.

**Key Features:**
- **Dynamic Signal Timing**: Adjusts green light duration based on real-time vehicle density
- **Round-Robin Scheduling**: Alternates between North-South and East-West axes
- **Priority System**: Congested axes get +30% green time when density ratio > 2:1
- **Collision Avoidance**: Safe distance maintenance and lane discipline
- **Traffic Rules**: 70% straight traffic, 30% right turns (no left turns)

**Density Calculation:**
```javascript
NS Density = North vehicles + South vehicles
EW Density = East vehicles + West vehicles
Green Duration = min(60s, max(10s, 20s + (Density × 3s)))
```

### Guardian Vision

Advanced facial recognition system for detecting and locating missing persons through multiple video sources.

**Key Features:**
- Multi-source video processing (CCTV, drones, webcams, local files)
- Real-time facial recognition with adjustable threshold
- Multiple reference image support with data augmentation
- Privacy mode for non-matching faces
- Geolocation tracking and mapping
- Comprehensive analytics dashboard
- Offline model caching

## 🛠️ Tech Stack

### Core Technologies
- **React** 19.0.0 - UI framework
- **TypeScript** 5.7.2 - Type-safe JavaScript
- **Vite** 6.2.0 - Build tool and dev server

### Computer Vision & AI
- **@vladmandic/face-api** 1.7.13 - Facial recognition (TensorFlow.js-based)
- **Three.js** 0.174.0 - 3D graphics and animations
- **OpenRouter API** - AI chatbot integration

### UI & Styling
- **Custom CSS** - No framework dependencies
- **Framer Motion** 12.4.10 - Smooth animations
- **Lucide React** 0.477.0 - Modern icons
- **React Icons** 5.5.0 - Icon library

### State & Routing
- **React Router DOM** 7.2.0 - Client-side routing

### Utilities
- **idb** 8.0.2 - IndexedDB wrapper for offline storage
- **@emailjs/browser** 4.4.1 - Contact form integration
- **react-masonry-css** 1.0.16 - Responsive grid layouts

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

3. **Create `.env` file** (optional - for chatbot):
```env
VITE_OPENROUTER_API_KEY=your_api_key_here
```

4. **Start development server:**
```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:check` | Build with TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run preview` | Preview production build |
| `npm run audit` | Security vulnerability check |
| `npm run clean` | Clean build artifacts |

## 📁 Project Structure

```
vision-aid/
├── public/
│   └── weights/              # Face detection model weights
├── src/
│   ├── components/
│   │   ├── projects/
│   │   │   ├── GuardianVision.tsx         # Face recognition system
│   │   │   ├── UrbanTrafficDynamics.tsx   # Traffic simulation
│   │   │   ├── TrafficSimulatorV2.tsx     # Traffic simulator engine
│   │   │   ├── Dashboard.tsx              # Analytics dashboard
│   │   │   ├── LocalMedia.tsx             # Media file processor
│   │   │   └── Settings.tsx               # User settings
│   │   ├── About.tsx                      # About page
│   │   ├── Chatbot.tsx                    # AI assistant
│   │   ├── Contact.tsx                    # Contact form (EmailJS)
│   │   ├── Projects.tsx                   # Project showcase
│   │   └── VisionAidHomepage.tsx          # Landing page
│   ├── hooks/
│   │   └── useFaceApiModels.ts            # Face-api model loader
│   ├── services/
│   │   ├── openRouterService.ts           # AI chatbot service
│   │   └── projectSuggestionService.ts    # Project suggestions
│   ├── utils/
│   │   ├── indexedDBHelper.ts             # IndexedDB utilities
│   │   ├── dataAugmentation.ts            # Image augmentation
│   │   ├── faceClusteringUtils.ts         # Face clustering
│   │   └── geocodingUtils.ts              # Geolocation utilities
│   ├── App.tsx                            # Main app component
│   └── main.tsx                           # Entry point
└── package.json
```

## 🔍 Guardian Vision Usage

### 1. Upload Reference Images
- Upload 3-5 clear photos of the person
- Multiple angles improve accuracy
- Click "Process" to extract facial features

### 2. Select Video Source
- **Drone**: Aerial drone cameras
- **Webcam**: Live camera testing
- **Local Media**: Upload videos/images

### 3. Configure Settings
- **Match Threshold**: Adjust recognition sensitivity (0.4-0.6 recommended)
- **Privacy Mode**: Blur non-matching faces
- **Show Confidence**: Display match percentages
- **Model Caching**: Enable offline mode
- **Frame Skip**: Optimize performance

### 4. View Analytics
- Total searches and matches
- Success rate and accuracy
- Search history with locations
- Processing time metrics

## 🚀 Deployment

### Hosting Options

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## 👥 Contributors

Want to contribute? Check out our [Contributing Guidelines](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact Me

- **Email**: 177sakshamjain@gmail.com
- **GitHub**: [@saksham-jain177](https://github.com/saksham-jain177)
- **Project**: [https://github.com/saksham-jain177/Vision-Aid](https://github.com/saksham-jain177/Vision-Aid)

## 🗺️ Roadmap

- [x] Multi-reference image support
- [x] Privacy mode and blurring
- [x] Analytics dashboard
- [x] Offline model caching
- [x] Traffic density simulation
- [ ] Enhanced side-profile detection
- [ ] Real-time alert system
- [ ] Multi-city traffic integration
- [ ] Cloud deployment optimization

---

<p align="center">Made with ⚡ & ☕</p>
