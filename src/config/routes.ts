export const ROUTES = {
    HOME: '/',
    PROJECTS: '/projects',
    URBAN_TRAFFIC: '/projects/urban-traffic-dynamics',
    GUARDIAN_VISION: '/projects/guardian-vision',
    ABOUT: '/about',
    CONTACT: '/contact',
} as const;

export const CHATBOT_ROUTE_ALIASES: Record<string, string> = {
    // Home variations
    'home': ROUTES.HOME,
    'homepage': ROUTES.HOME,
    'main': ROUTES.HOME,

    // Projects
    'project': ROUTES.PROJECTS,
    'projects': ROUTES.PROJECTS,

    // Urban Traffic Dynamics
    'project1': ROUTES.URBAN_TRAFFIC,
    'project-1': ROUTES.URBAN_TRAFFIC,
    'project_1': ROUTES.URBAN_TRAFFIC,
    'urban': ROUTES.URBAN_TRAFFIC,
    'urbantraffic': ROUTES.URBAN_TRAFFIC,
    'traffic': ROUTES.URBAN_TRAFFIC,
    'urbantrafic': ROUTES.URBAN_TRAFFIC,
    'urbantraficdinamics': ROUTES.URBAN_TRAFFIC,
    'urbantrafficdynamics': ROUTES.URBAN_TRAFFIC,

    // Guardian Vision
    'project2': ROUTES.GUARDIAN_VISION,
    'project-2': ROUTES.GUARDIAN_VISION,
    'project_2': ROUTES.GUARDIAN_VISION,
    'guardian': ROUTES.GUARDIAN_VISION,
    'guardianvision': ROUTES.GUARDIAN_VISION,
    'vision': ROUTES.GUARDIAN_VISION,
    'guard': ROUTES.GUARDIAN_VISION,

    // About
    'about': ROUTES.ABOUT,

    // Contact
    'contact': ROUTES.CONTACT,
    'contacts': ROUTES.CONTACT,
};
