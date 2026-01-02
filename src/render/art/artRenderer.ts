// Art renderer: converts pixel art patterns to ContributionDay arrays for heatmap rendering.

import type { ContributionDay } from "../../domain/contributions";
import type { PixelArtPattern } from "./artDefinitions";

/**
 * Converts a pixel art pattern to ContributionDay array.
 * The pattern is positioned in a standard heatmap grid (53 weeks × 7 days = 371 days).
 * Pattern is centered horizontally and vertically.
 */
export function patternToContributionDays(
  pattern: PixelArtPattern,
  fromDate: string,
  toDate: string
): ContributionDay[] {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  // Calculate total days in range
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Standard heatmap: 53 weeks × 7 days = 371 days
  // We'll use a grid that fits the pattern
  const patternHeight = pattern.pattern.length;
  const patternWidth = pattern.pattern[0]?.length || 0;
  
  // Calculate grid dimensions (weeks × days per week)
  const weeks = Math.ceil(totalDays / 7);
  const daysPerWeek = 7;
  
  // Center the pattern in the grid
  const startWeek = Math.max(0, Math.floor((weeks - Math.ceil(patternWidth / daysPerWeek)) / 2));
  const startDayOfWeek = Math.max(0, Math.floor((daysPerWeek - (patternWidth % daysPerWeek || daysPerWeek)) / 2));
  
  const days: ContributionDay[] = [];
  let currentDate = new Date(startDate);
  
  for (let week = 0; week < weeks; week++) {
    for (let dayOfWeek = 0; dayOfWeek < daysPerWeek; dayOfWeek++) {
      if (currentDate > endDate) break;
      
      const dateIso = currentDate.toISOString().split("T")[0];
      
      // Calculate pattern coordinates
      const patternWeek = week - startWeek;
      const patternDay = dayOfWeek - startDayOfWeek + (patternWeek * daysPerWeek);
      
      let count = 0;
      
      // Check if this position is within the pattern bounds
      if (
        patternWeek >= 0 &&
        patternDay >= 0 &&
        patternDay < patternWidth &&
        week < startWeek + Math.ceil(patternWidth / daysPerWeek) + 1
      ) {
        // Map to pattern row (day of week) and column (week)
        const patternRow = dayOfWeek;
        const patternCol = patternDay;
        
        if (
          patternRow >= 0 &&
          patternRow < patternHeight &&
          patternCol >= 0 &&
          patternCol < patternWidth
        ) {
          const patternValue = pattern.pattern[patternRow]?.[patternCol] || 0;
          // Map pattern values 1-4 to contribution counts:
          // 1 → 1 (lightest), 2 → 4, 3 → 8, 4 → 12 (darkest)
          if (patternValue >= 1 && patternValue <= 4) {
            count = patternValue === 1 ? 1 : patternValue === 2 ? 4 : patternValue === 3 ? 8 : 12;
          }
        }
      }
      
      days.push({
        dateIso,
        count,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return days;
}

/**
 * Alternative approach: map pattern directly to a date range
 * This creates a more compact representation
 */
export function patternToContributionDaysCompact(
  pattern: PixelArtPattern,
  fromDate: string,
  toDate: string
): ContributionDay[] {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  const patternHeight = pattern.pattern.length;
  const patternWidth = pattern.pattern[0]?.length || 0;
  
  // Calculate total days needed: pattern width in days
  const totalDays = patternWidth;
  
  const days: ContributionDay[] = [];
  let currentDate = new Date(startDate);
  
  // Center the pattern in the date range
  const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const offset = Math.max(0, Math.floor((rangeDays - totalDays) / 2));
  currentDate.setDate(currentDate.getDate() + offset);
  
  for (let col = 0; col < patternWidth; col++) {
    for (let row = 0; row < patternHeight; row++) {
      if (currentDate > endDate) break;
      
      const dateIso = currentDate.toISOString().split("T")[0];
      const patternValue = pattern.pattern[row]?.[col] || 0;
      
      // Map pattern values 1-4 to contribution counts:
      // 1 → 1 (lightest), 2 → 4, 3 → 8, 4 → 12 (darkest)
      let count = 0;
      if (patternValue >= 1 && patternValue <= 4) {
        count = patternValue === 1 ? 1 : patternValue === 2 ? 4 : patternValue === 3 ? 8 : 12;
      }
      
      days.push({
        dateIso,
        count,
      });
      
      // Move to next day (we go column by column, so each column is a day)
      if (row === patternHeight - 1) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }
  
  // Fill remaining days with zeros
  while (currentDate <= endDate) {
    const dateIso = currentDate.toISOString().split("T")[0];
    days.push({
      dateIso,
      count: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}

/**
 * Maps pattern to heatmap grid (weeks × days)
 * Each pattern row becomes a day of week, each pattern column becomes a week
 * 
 * Pattern structure:
 * - Rows: days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * - Columns: week numbers
 */
export function patternToContributionDaysGrid(
  pattern: PixelArtPattern,
  fromDate: string,
  toDate: string
): ContributionDay[] {
  const startDate = new Date(fromDate + "T00:00:00Z");
  const endDate = new Date(toDate + "T23:59:59Z");
  
  const patternHeight = pattern.pattern.length; // Days of week (0-6, should be 7)
  const patternWidth = pattern.pattern[0]?.length || 0; // Weeks
  
  // Generate all days in the date range
  const allDays: ContributionDay[] = [];
  const dateMap = new Map<string, ContributionDay>();
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateIso = currentDate.toISOString().split("T")[0];
    const day: ContributionDay = {
      dateIso,
      count: 0,
    };
    allDays.push(day);
    dateMap.set(dateIso, day);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  // Group days by week (weeks start on Sunday, like GitHub)
  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];
  
  for (const day of allDays) {
    const date = new Date(day.dateIso + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday
    
    // Start new week on Sunday
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentWeek.push(day);
  }
  
  // Push the last week if not empty
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  // Center pattern horizontally
  const totalWeeks = weeks.length;
  const startWeek = Math.max(0, Math.floor((totalWeeks - patternWidth) / 2));
  
  // Apply pattern to days
  weeks.forEach((week, weekIndex) => {
    const patternWeek = weekIndex - startWeek;
    
    // Only apply pattern if this week is within pattern bounds
    if (patternWeek >= 0 && patternWeek < patternWidth) {
      week.forEach((day) => {
        const date = new Date(day.dateIso + "T00:00:00Z");
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // Check if this day matches the pattern
        if (dayOfWeek < patternHeight) {
          const patternValue = pattern.pattern[dayOfWeek]?.[patternWeek] || 0;
          // Map pattern values 1-4 to contribution counts:
          // 1 → 1 (lightest), 2 → 4, 3 → 8, 4 → 12 (darkest)
          if (patternValue >= 1 && patternValue <= 4) {
            day.count = patternValue === 1 ? 1 : patternValue === 2 ? 4 : patternValue === 3 ? 8 : 12;
          }
        }
      });
    }
  });
  
  return allDays;
}

