import {
    Waves, ShoppingBag, ParkingCircle, Theater, Film,
    Palette, Building2, Users, Camera, Trophy,
    Dumbbell, Landmark, Image, UtensilsCrossed,
    Coffee, Wine, Trees, Calendar, MapPin
} from 'lucide-react';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import React from 'react';

export const categoryIcons = {
    beach: Waves,
    shopping: ShoppingBag,
    parking: ParkingCircle,
    theatre: Theater,
    cinema: Film,
    arts_centre: Palette,
    community_centre: Building2,
    conference_centre: Users,
    attraction: Camera,
    stadium: Trophy,
    sports_centre: Dumbbell,
    museum: Landmark,
    gallery: Image,
    restaurant: UtensilsCrossed,
    cafe: Coffee,
    bar: Wine,
    park: Trees,
    event: Calendar,
    default: MapPin
};

export const categoryColors: Record<string, string> = {
    beach: '#06B6D4',
    park: '#10B981',
    parking: '#3B82F6',
    shopping: '#F59E42',
    bar: '#dc98e3ff',
    cafe: '#ad8459ff',
    restaurant: '#F59E42',
    event: '#F43F5E',
    // ...add more as needed
    default: '#64748B'
};

export const createCustomIcon = (
    IconComponent: any,
    color: string = '#3B82F6',
    options?: {
        isEvent?: boolean;
    }
) => {
    let style: React.CSSProperties;
    let iconProps: any = { size: 14, color: 'white', strokeWidth: 2 };
    if (options?.isEvent) {
        // Special style for event
        style = {
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid black',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        };
        iconProps = { size: 20, color: 'black', strokeWidth: 2.5 };
    } else {
        style = {
            backgroundColor: color,
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        };
    }
    const iconHtml = renderToString(
        React.createElement(
            'div',
            { style },
            React.createElement(IconComponent, iconProps)
        )
    );
    return L.divIcon({
        html: iconHtml,
        className: options?.isEvent ? 'custom-marker-icon event-marker' : 'custom-marker-icon',
        iconSize: options?.isEvent ? [48, 48] : [40, 40],
        iconAnchor: options?.isEvent ? [6, 65] : [20, 40],
        popupAnchor: [0, -40]
    });
};