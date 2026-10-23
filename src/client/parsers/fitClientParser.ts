/**
 * Client-Side Garmin .FIT File Parser
 * Runs directly in the browser to extract telemetry from Garmin watches & cycling computers
 */

// @ts-ignore
import FitParser from 'fit-file-parser';
import type { WorkoutActivity, GeoPoint, SplitRecord, ActivityType } from '../../types.js';
import { computeHeartRateZones, computeRobustElevationGain } from '../../sources/types.js';

export function parseFitFileBuffer(
  buffer: ArrayBuffer,
  filename = 'Garmin Workout'
): Promise<WorkoutActivity> {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    });

    fitParser.parse(buffer, (err: any, data: any) => {
      if (err) {
        return reject(new Error(`FIT Parser Error: ${err}`));
      }

      const sessions = data.activity?.sessions || data.sessions || [];
      const session = sessions[0] || {};
      const records = data.records || [];
      const laps = data.laps || [];

      // Extract Points
      const points: GeoPoint[] = [];
      let maxHr = 0;
      let hrSum = 0;
      let hrCount = 0;
      let elevationGain = session.total_ascent || 0;

      for (const rec of records) {
        if (rec.position_lat !== undefined && rec.position_long !== undefined) {
          const hr = rec.heart_rate;
          if (hr) {
            hrSum += hr;
            hrCount++;
            if (hr > maxHr) maxHr = hr;
          }

          points.push({
            lat: rec.position_lat,
            lon: rec.position_long,
            ele: rec.altitude,
            time: rec.timestamp ? new Date(rec.timestamp).toISOString() : undefined,
            hr: rec.heart_rate,
            cadence: rec.cadence,
            power: rec.power,
          });
        }
      }

      // Extract Splits from Laps
      const splits: SplitRecord[] = laps.map((lap: any, idx: number) => {
        const lapDist = lap.total_distance || 1000;
        const lapSec = lap.total_timer_time || lap.total_elapsed_time || 0;
        const paceSec = lapDist > 0 ? Math.round(lapSec / (lapDist / 1000)) : 0;
        return {
          splitIndex: idx + 1,
          distanceMeters: Math.round(lapDist),
          elapsedSec: Math.round(lapSec),
          paceSecPerKm: paceSec,
          elevationDiffM: Math.round(lap.total_ascent || 0),
          avgHeartRate: lap.avg_heart_rate,
        };
      });

      let sportType: ActivityType = 'Run';
      const sportStr = (session.sport || '').toLowerCase();
      const subSportStr = (session.sub_sport || '').toLowerCase();

      if (sportStr.includes('cycl') || sportStr.includes('biking')) {
        sportType = 'Ride';
      } else if (sportStr.includes('hike')) {
        sportType = 'Hike';
      } else if (sportStr.includes('trail')) {
        sportType = 'TrailRun';
      } else if (
        sportStr.includes('weight') ||
        sportStr.includes('strength') ||
        sportStr.includes('fitness_equipment') ||
        sportStr.includes('training') ||
        subSportStr.includes('strength') ||
        subSportStr.includes('weight')
      ) {
        sportType = 'WeightTraining';
      } else if (sportStr.includes('crossfit') || subSportStr.includes('crossfit') || subSportStr.includes('hiit')) {
        sportType = 'Crossfit';
      } else if (sportStr.includes('yoga') || sportStr.includes('pilates')) {
        sportType = 'Yoga';
      } else if (sportStr.includes('cardio') || sportStr.includes('workout')) {
        sportType = 'Workout';
      }

      const isGymSport =
        sportType === 'WeightTraining' ||
        sportType === 'Crossfit' ||
        sportType === 'Workout' ||
        sportType === 'Yoga';

      const totalDistance = isGymSport
        ? Math.round(session.total_distance || 0)
        : Math.round(session.total_distance || (points.length > 0 ? 5000 : 0));
      const movingTimeSec = Math.round(session.total_timer_time || session.total_elapsed_time || 1800);
      const avgPaceSec = totalDistance > 0 ? Math.round(movingTimeSec / (totalDistance / 1000)) : 0;
      const avgHr = session.avg_heart_rate || (hrCount > 0 ? Math.round(hrSum / hrCount) : undefined);
      maxHr = session.max_heart_rate || maxHr;

      const activity: WorkoutActivity = {
        id: `fit_${Date.now()}`,
        title: filename.replace(/\.fit$/i, ''),
        sportType,
        date: session.start_time ? new Date(session.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        startTime: session.start_time ? new Date(session.start_time).toTimeString().substring(0, 5) : '',
        elapsedTimeSec: Math.round(session.total_elapsed_time || movingTimeSec),
        movingTimeSec,
        distanceMeters: totalDistance,
        elevationGainMeters: Math.round(elevationGain) > 0 ? Math.round(elevationGain) : computeRobustElevationGain(points.map((p) => p.ele)),
        avgPaceSecPerKm: avgPaceSec,
        avgHeartRate: avgHr,
        maxHeartRate: maxHr > 0 ? maxHr : undefined,
        avgCadence: session.avg_cadence,
        avgPowerWatts: session.avg_power,
        calories: session.total_calories,
        points,
        splits,
        hrZones: avgHr && maxHr ? computeHeartRateZones(avgHr, maxHr, movingTimeSec) : [],
        source: 'garmin_fit',
      };

      resolve(activity);
    });
  });
}
