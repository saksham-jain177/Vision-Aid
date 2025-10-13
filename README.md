# VisionAid - Intelligent Urban Infrastructure Platform 🌆

[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.174.0-green.svg)](https://threejs.org/)
[![face-api.js](https://img.shields.io/badge/face--api.js-0.22.2-orange.svg)](https://github.com/justadudewhohacks/face-api.js/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Overview

VisionAid is a cutting-edge urban infrastructure management platform that leverages AI and computer vision to revolutionize city operations and public safety. Our platform provides intelligent solutions for traffic management and missing person detection, creating smarter, safer urban environments.

[Live Demo](https://vision-aid.vercel.app) | [Documentation](https://github.com/shichancoder/Vision-Aid/wiki)

![VisionAid Platform Screenshot](public/screenshot.png)

## ✨ Features

- **3D Interactive Visualization**: Immersive urban infrastructure visualization using Three.js
- **Real-time Face Recognition**: Advanced facial recognition for missing person detection
- **AI-Powered Assistant**: Intelligent chatbot for platform navigation and assistance
- **Day/Night Mode**: Adaptive interface with dynamic theme switching
- **Responsive Design**: Seamless experience across all devices
- **Interactive Dashboard**: Real-time analytics and performance metrics
- **Multiple Video Sources**: Support for webcam, CCTV, drone feeds, and local media files

## 🚀 Featured Projects

### Urban Traffic Dynamics

A real-time traffic simulation and optimization system that implements round-robin scheduling algorithms to manage traffic signals at intersections. The system calculates traffic density dynamically and allocates green light duration proportionally to waiting vehicle counts, ensuring efficient traffic flow across all directions.

**Core Algorithm:**

The simulator employs a round-robin phase scheduler that alternates between North-South (NS) and East-West (EW) traffic axes. Signal timing is computed using density-based formulas:

```
Base Time = 20 seconds
Time Per Vehicle = 3 seconds
Green Duration = min(60s, max(10s, Base Time + (Density × Time Per Vehicle)))
```

Additional optimizations include priority adjustments for high-density ratios (>2:1) where the congested axis receives +30% green time while the less congested axis receives -30% time. This ensures adaptive resource allocation based on real-time traffic conditions.

The system also implements first-come-first-serve vehicle priority resolution during intersection conflicts, preventing deadlocks while maintaining realistic traffic behavior.

### Guardian Vision

An advanced facial recognition system for detecting, locating, and finding missing people through a network of drones, CCTVs, webcams, and local media files. Guardian Vision leverages face-api.js to match reference images of missing persons against real-time video feeds with high recognition accuracy.

**Key Features:**

- Multi-source video processing (CCTV, drones, webcams, local files)
- Real-time facial recognition with adjustable matching threshold
- Geolocation tracking and mapping
- Facial landmark detection and visualization
- Privacy mode for non-matching faces
- Comprehensive analytics dashboard
- Model caching for offline operation
- Multiple reference image support for improved accuracy

## 🛠️ Tech Stack

- **Frontend**: React 19.0.0 with TypeScript 5.7.2
- **Styling**: Custom CSS (No Tailwind)
- **3D Graphics**: Three.js 0.174.0
- **Face Recognition**: face-api.js 0.20.0
- **Icons**: Lucide React 0.477.0 + React Icons 5.5.0
- **Animations**: Framer Motion 12.4.10
- **Routing**: React Router DOM 7.2.0
- **AI Integration**: OpenRouter API
- **Build Tool**: Vite 6.2.0
- **Offline Storage**: IndexedDB (via idb 8.0.2)
- **Email**: @emailjs/browser 4.4.1
- **Layout**: react-masonry-css 1.0.16

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:

  ```bash
  git clone https://github.com/shichancoder/Vision-Aid.git
  cd Vision-Aid
  ```

2. Install dependencies:

  ```bash
  npm install
  # or
  yarn install
  ```

3. Create a `.env` file in the root directory (optional for chatbot functionality):

  ```env
  VITE_OPENROUTER_API_KEY=your_api_key_here
  ```

4. Start the development server:

  ```bash
  npm run dev
  # or
  yarn dev
  ```

Visit `http://localhost:3000` to view the application.

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (Vite only)
- `npm run build:check` - Build with TypeScript checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run preview` - Preview production build
- `npm run audit` - Check for security vulnerabilities
- `npm run clean` - Clean build artifacts

## 📁 Project Structure

```text
vision-aid/
├── public/
│   ├── weights/                # Face detection model weights
│   └── assets/                 # Static assets
├── src/
│   ├── assets/
│   │   └── icons/             # Custom SVG icons
│   ├── components/
│   │   ├── projects/          # Project-specific components
│   │   │   ├── GuardianVision.tsx    # Missing person detection system
│   │   │   ├── UrbanTrafficDynamics.tsx  # Traffic management system
│   │   │   ├── Dashboard.tsx  # Analytics dashboard
│   │   │   ├── LocalMedia.tsx # Local media file processor
│   │   │   ├── Settings.tsx   # User settings component
│   │   │   └── LocationIndicator.tsx  # Geolocation display
│   │   ├── About.tsx          # About page
│   │   ├── Chatbot.tsx        # AI assistant
│   │   ├── Contact.tsx        # Contact form
│   │   ├── Projects.tsx       # Project showcase
│   │   ├── Toast.tsx          # Notification component
│   │   └── VisionAidHomepage.tsx  # Landing page
│   ├── hooks/
│   │   └── useFaceApiModels.ts  # Custom hook for face-api.js models
│   ├── services/
│   │   └── openRouterService.ts  # AI chatbot service
│   ├── utils/
│   │   └── indexedDBHelper.ts  # IndexedDB utilities for model caching
│   ├── App.tsx                # Main application component
│   └── main.tsx               # Application entry point
└── package.json               # Project dependencies and scripts
```

## 🔍 Guardian Vision Usage Guide

### Reference Image Upload

1. Upload 3-5 clear images of the person you're looking for
2. The system works best with multiple reference images showing different angles
3. Click "Process" to extract facial features

### Search Sources

Choose from multiple video sources to search for the missing person:

- **CCTV**: Connect to surveillance camera feeds
- **Drone**: Link to aerial drone cameras
- **Local Media**: Upload videos or images for offline processing

### Testing

- **Live Webcam**: Test the system using your device's camera

### Settings

- **Show Confidence Scores**: Display match percentage on detected faces
- **Privacy Mode**: Blur non-matching faces for privacy protection
- **Location Tracking**: Record location data with matches
- **Model Caching**: Store face detection models locally for faster loading
- **Match Threshold**: Adjust recognition sensitivity
- **Frame Skip**: Process every Nth frame for performance optimization

### Dashboard

Access comprehensive analytics including:

- Total searches and matches found
- Success rate and reference image count
- Recent search history with timestamps and locations
- Recognition accuracy metrics
- Processing time statistics

## 👥 Contributors

- [Saksham Jain](https://github.com/saksham-jain177) - Lead Developer & CV Engineer

Want to contribute? Check out our [Contributing Guidelines](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [face-api.js](https://github.com/justadudewhohacks/face-api.js/) for facial recognition capabilities
- [Three.js](https://threejs.org/) for 3D visualization
- [OpenRouter](https://openrouter.ai/) for AI integration
- [Lucide](https://lucide.dev/) for beautiful icons
- All our contributors and supporters

## 📞 Contact

- **Developer**: Saksham Jain
- **Email**: 177sakshamjain@gmail.com
- **GitHub**: [@saksham-jain177](https://github.com/saksham-jain177)
- **Project Link**: [https://github.com/saksham-jain177/Vision-Aid](https://github.com/saksham-jain177/Vision-Aid)

## 🚀 Roadmap

- [x] Enhanced facial recognition with multiple reference images
- [x] Privacy mode for non-matching faces
- [x] Comprehensive analytics dashboard
- [x] Local media file processing
- [ ] Improved side-profile face detection
- [ ] Real-time alert system
- [ ] Integration with public safety databases
- [ ] Multi-city support

---

<p align="center">Made with ❤️ by the VisionAid Team</p>
