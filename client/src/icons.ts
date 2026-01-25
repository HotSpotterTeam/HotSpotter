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
    restaurant: UtensilsCrossed,
    cafe: Coffee,
    bar: Wine,
    park: Trees,
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
    event: Calendar,
    other: MapPin,
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
    other: '#64748B',
    default: '#64748B'
};

// Icon cache to avoid recreating icons on every render
const iconCache = new Map<string, L.DivIcon>();

export const createCustomIcon = (
    IconComponent: any,
    color: string = '#3B82F6',
    size: number = 20,
    options?: {
        isEvent?: boolean;
    }
) => {
    // Generate cache key from parameters
    const cacheKey = `${IconComponent.displayName || IconComponent.name || 'icon'}-${color}-${size}-${options?.isEvent ?? false}`;

    // Return cached icon if exists
    const cachedIcon = iconCache.get(cacheKey);
    if (cachedIcon) {
        return cachedIcon;
    }

    let style: React.CSSProperties;
    let iconProps: any;

    const iconSize = Math.round(size * 0.7);

    if (options?.isEvent) {
        // For events, use the color for both background and border
        const eventBgColor = color || 'white';
        style = {
            backgroundColor: eventBgColor,
            borderRadius: '8px',
            width: `${size * 1.6}px`,
            height: `${size * 1.6}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `3px solid ${eventBgColor}`,
            boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
            outline: '2px solid black'
        };
        iconProps = { size: iconSize * 1.4, color: 'black', strokeWidth: 2.5 };
    } else {
        style = {
            backgroundColor: color,
            borderRadius: '50%',
            width: `${size}px`,
            height: `${size}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        };
        iconProps = { size: iconSize, color: 'white', strokeWidth: 2 };
    }

    const iconHtml = renderToString(
        React.createElement(
            'div',
            { style },
            React.createElement(IconComponent, iconProps)
        )
    );

    const totalSize = options?.isEvent ? size * 1.6 : size;

    const icon = L.divIcon({
        html: iconHtml,
        className: options?.isEvent ? 'custom-marker-icon event-marker' : 'custom-marker-icon',
        iconSize: [totalSize * 2, totalSize * 2],
        iconAnchor: [totalSize, totalSize * 2],
        popupAnchor: [0, -totalSize * 2]
    });

    // Cache the icon for future use
    iconCache.set(cacheKey, icon);

    return icon;
};