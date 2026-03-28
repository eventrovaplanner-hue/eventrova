
export enum EventType {
  WEDDING = 'Wedding',
  BIRTHDAY = 'Birthday',
  CORPORATE = 'Corporate',
  PARTY = 'Party',
  WORKSHOP = 'Workshop',
  OTHER = 'Other'
}

export interface Service {
  id: string;
  name: string;
  basePrice: number;
  description: string;
  category: string;
  searchQuery?: string;
}

export interface PlannerState {
  step: number;
  eventType: EventType;
  guestCount: number;
  budget: number;
  selectedServices: string[];
  vibe: string;
  postalCode?: string;
  location?: {
    lat: number;
    lng: number;
  };
  aiChecklist?: string[];
  aiSuggestions?: string;
  vendors?: Vendor[];
  vendorError?: string;
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  address?: string;
  url?: string;
  description?: string;
  source_url?: string;
  selected?: boolean;
  lat?: number;
  lng?: number;
}

export interface WaitlistUser {
  email: string;
  role: 'host' | 'vendor';
}

export interface HostedEvent {
  id: string;
  date: string;
  eventType: EventType;
  guestCount: number;
  budget: number;
  vibe: string;
  selectedVendors: Vendor[];
}
