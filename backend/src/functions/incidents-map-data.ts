import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { IncidentService } from '../services/incident.service';
import { Parish } from '@prisma/client';
import { getCache, setCache } from '../lib/caching';

const incidentService = new IncidentService();
const CACHE_TTL_SECONDS = 60; // Cache for 60 seconds

export async function incidentsMapData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Processing incident map data request');

  try {
    if (request.method !== 'GET') {
      return { status: 405, jsonBody: { success: false, error: 'Method not allowed' } };
    }

    const url = new URL(request.url);
    const parishParam = url.searchParams.get('parish');
    let parish: Parish | undefined;

    if (parishParam) {
      const parishUpper = parishParam.toUpperCase();
      if (Object.values(Parish).includes(parishUpper as Parish)) {
        parish = parishUpper as Parish;
      } else {
        return { status: 400, jsonBody: { success: false, error: 'Invalid parish parameter' } };
      }
    }

    const cacheKey = `map-data:${parish || 'all'}`;
    const cachedData = await getCache<any>(cacheKey);

    if (cachedData) {
      context.log('Returning cached map data');
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        jsonBody: cachedData,
      };
    }

    const result = await incidentService.getMapData(parish);

    if (!result.success) {
      context.log.error('Failed to fetch map data:', result.error);
      return { status: 500, jsonBody: result };
    }

    const responseBody = {
      success: true,
      data: {
        incidents: result.data,
      },
      message: result.message,
    };

    await setCache(cacheKey, responseBody, CACHE_TTL_SECONDS);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      jsonBody: responseBody,
    };

  } catch (error) {
    context.log.error('Error processing map data request:', error);
    return { status: 500, jsonBody: { success: false, error: 'Internal server error' } };
  }
}

app.http('incidents-map-data', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'incidents/map-data',
  handler: incidentsMapData,
});