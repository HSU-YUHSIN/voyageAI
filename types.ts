
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Activity {
  time: string;
  place: string;
  description: string;
  coordinates: Coordinates;
  icon: string;
  tour_guide_info: {
    history: string;
    fun_facts: string[];
    best_time_to_visit: string;
    local_tip: string;
  };
}

export interface ItineraryDay {
  day: number;
  date_description: string;
  daily_summary: string;
  activities: Activity[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TripPlan {
  trip_title: string;
  destination: string;
  map_center: Coordinates;
  itinerary: ItineraryDay[];
  sources?: GroundingSource[];
}

export interface AppState {
  trip: TripPlan | null;
  isLoading: boolean;
  error: string | null;
}
