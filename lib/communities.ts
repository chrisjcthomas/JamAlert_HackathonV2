/**
 * Known flood-prone communities in Jamaica by parish
 * This list helps users select their specific community for more targeted alerts
 */

import { Parish } from './types';

export interface Community {
  name: string;
  parish: Parish;
  floodProne: boolean;
  description?: string;
}

// Flood-prone communities by parish
export const COMMUNITIES_BY_PARISH: Record<Parish, string[]> = {
  [Parish.KINGSTON]: [
    'Downtown Kingston',
    'Harbour View',
    'Rae Town',
    'Rockfort',
    'Rollington Town',
    'Trench Town',
    'Tivoli Gardens',
    'Denham Town',
    'Jones Town',
    'Greenwich Town'
  ],
  [Parish.ST_ANDREW]: [
    'Half Way Tree',
    'New Kingston',
    'Liguanea',
    'Papine',
    'Mona',
    'August Town',
    'Hermitage',
    'Barbican',
    'Constant Spring',
    'Stony Hill',
    'Red Hills',
    'Riverton Meadows',
    'Waterhouse',
    'Grants Pen',
    'Duhaney Park',
    'Portmore (St. Andrew side)'
  ],
  [Parish.ST_THOMAS]: [
    'Morant Bay',
    'Port Morant',
    'Yallahs',
    'Bath',
    'Golden Grove',
    'Seaforth',
    'Lyssons',
    'Trinityville',
    'Duckenfield',
    'Prospect'
  ],
  [Parish.PORTLAND]: [
    'Port Antonio',
    'Buff Bay',
    'Hope Bay',
    'Long Bay',
    'Boston',
    'Manchioneal',
    'Rio Grande Valley',
    'Fellowship',
    'Orange Bay',
    'Fairy Hill'
  ],
  [Parish.ST_MARY]: [
    'Port Maria',
    'Ocho Rios',
    'Annotto Bay',
    'Highgate',
    'Gayle',
    'Richmond',
    'Retreat',
    'Castleton',
    'Islington',
    'Boscobel'
  ],
  [Parish.ST_ANN]: [
    'St. Ann\'s Bay',
    'Ocho Rios',
    'Runaway Bay',
    'Brown\'s Town',
    'Moneague',
    'Discovery Bay',
    'Claremont',
    'Alexandria',
    'Priory',
    'Bamboo'
  ],
  [Parish.TRELAWNY]: [
    'Falmouth',
    'Duncans',
    'Rio Bueno',
    'Clark\'s Town',
    'Albert Town',
    'Wait-a-Bit',
    'Stewart Town',
    'Wakefield',
    'Sherwood Content',
    'Troy'
  ],
  [Parish.ST_JAMES]: [
    'Montego Bay',
    'Reading',
    'Cambridge',
    'Anchovy',
    'Ironshore',
    'Rose Hall',
    'Granville',
    'Catadupa',
    'Retirement',
    'Maroon Town'
  ],
  [Parish.HANOVER]: [
    'Lucea',
    'Green Island',
    'Sandy Bay',
    'Hopewell',
    'Dias',
    'Cascade',
    'Askenish',
    'Chester',
    'Jericho',
    'Riverside'
  ],
  [Parish.WESTMORELAND]: [
    'Savanna-la-Mar',
    'Negril',
    'Little London',
    'Bluefields',
    'Whitehouse',
    'Petersfield',
    'Grange Hill',
    'Darliston',
    'Frome',
    'Sheffield'
  ],
  [Parish.ST_ELIZABETH]: [
    'Black River',
    'Santa Cruz',
    'Junction',
    'Lacovia',
    'Treasure Beach',
    'Malvern',
    'Balaclava',
    'Mountainside',
    'Braes River',
    'Siloah'
  ],
  [Parish.MANCHESTER]: [
    'Mandeville',
    'Christiana',
    'Porus',
    'Spaldings',
    'Mile Gully',
    'Knockpatrick',
    'Newport',
    'Williamsfield',
    'Coleyville',
    'Comfort Hall'
  ],
  [Parish.CLARENDON]: [
    'May Pen',
    'Chapelton',
    'Frankfield',
    'Hayes',
    'Lionel Town',
    'Milk River',
    'Kellits',
    'Four Paths',
    'Palmers Cross',
    'Rocky Point'
  ],
  [Parish.ST_CATHERINE]: [
    'Spanish Town',
    'Portmore',
    'Old Harbour',
    'Linstead',
    'Bog Walk',
    'Ewarton',
    'Gregory Park',
    'Greater Portmore',
    'Independence City',
    'Waterford',
    'Passage Fort',
    'Angels',
    'Bushy Park',
    'Caymanas',
    'Cumberland'
  ]
};

// Get all communities for a specific parish
export function getCommunitiesByParish(parish: Parish): string[] {
  return COMMUNITIES_BY_PARISH[parish] || [];
}

// Get all communities (flattened list)
export function getAllCommunities(): Community[] {
  const communities: Community[] = [];
  
  Object.entries(COMMUNITIES_BY_PARISH).forEach(([parish, communityNames]) => {
    communityNames.forEach(name => {
      communities.push({
        name,
        parish: parish as Parish,
        floodProne: true // All listed communities are known flood-prone areas
      });
    });
  });
  
  return communities;
}

// Search communities by name
export function searchCommunities(query: string): Community[] {
  const allCommunities = getAllCommunities();
  const lowerQuery = query.toLowerCase();
  
  return allCommunities.filter(community =>
    community.name.toLowerCase().includes(lowerQuery)
  );
}

// Get community suggestions for autocomplete
export function getCommunitySuggestions(parish: Parish, query: string): string[] {
  const communities = getCommunitiesByParish(parish);
  
  if (!query) {
    return communities.slice(0, 10); // Return first 10 if no query
  }
  
  const lowerQuery = query.toLowerCase();
  return communities.filter(name =>
    name.toLowerCase().includes(lowerQuery)
  );
}

