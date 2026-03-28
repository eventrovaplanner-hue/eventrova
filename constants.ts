
import { Service, EventType } from './types';

export const SERVICES: Service[] = [
  { id: 'venue', name: 'Premium Venue', basePrice: 1500, description: 'Elegant locations for your event.', category: 'Essentials', searchQuery: 'Event Venue' },
  { id: 'catering', name: 'Gourmet Catering', basePrice: 45, description: 'Per guest pricing for high-end dining.', category: 'Essentials', searchQuery: 'Catering' },
  { id: 'photography', name: 'Professional Photography', basePrice: 800, description: 'Capturing every moment.', category: 'Media', searchQuery: 'Event Photographer' },
  { id: 'music', name: 'Live DJ / Band', basePrice: 600, description: 'Curated music for the vibe.', category: 'Entertainment', searchQuery: 'DJ' },
  { id: 'decor', name: 'Custom Decoration', basePrice: 400, description: 'Flowers, lighting, and theme setup.', category: 'Essentials', searchQuery: 'Event Decor' },
  { id: 'bar', name: 'Open Bar Service', basePrice: 25, description: 'Per guest pricing for drinks.', category: 'Essentials', searchQuery: 'Mobile Bar' },
  { id: 'invitations', name: 'Digital Invitations', basePrice: 100, description: 'Custom RSVP management.', category: 'Media', searchQuery: 'Graphic Design' },
  { id: 'videography', name: 'Cinematic Video', basePrice: 1200, description: 'Highlight reels and full footage.', category: 'Media', searchQuery: 'Videographer' },
];

export const EVENT_MULTIPLIERS: Record<EventType, number> = {
  [EventType.WEDDING]: 1.5,
  [EventType.BIRTHDAY]: 1.0,
  [EventType.CORPORATE]: 1.3,
  [EventType.PARTY]: 0.8,
  [EventType.WORKSHOP]: 0.7,
  [EventType.OTHER]: 1.0,
};
