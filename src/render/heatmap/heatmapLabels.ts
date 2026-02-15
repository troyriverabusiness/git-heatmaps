// Label and legend rendering for heatmaps.

import type { ContributionDay } from "../../domain/contributions";
import type { Dimensions } from "../shared/svgTypes";
import { getColorPalette, getDefaultThemePalettes } from "../shared/colorScale";
import type { HeatmapConfig } from "./heatmapConfig";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Renders month labels at the top of the heatmap.
 */
export function renderMonthLabels(
  weeks: ContributionDay[][],
  config: HeatmapConfig
): string {
  if (!config.showMonthLabels || weeks.length === 0) return "";

  const labels: string[] = [];
  let lastYearMonth = "";

  // Iterate through weeks and detect month transitions
  weeks.forEach((week, weekIndex) => {
    if (week.length === 0) return;

    // Check all days in the week for a new month
    for (const day of week) {
      const date = new Date(day.dateIso);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const yearMonth = `${year}-${month}`;

      // Render label when we encounter a new year-month combination
      if (yearMonth !== lastYearMonth) {
        const x = config.margin.left + weekIndex * (config.cellSize + config.cellGap);
        const y = config.margin.top - 6;

        labels.push(
          `    <text x="${x}" y="${y}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}">${MONTH_LABELS[month]}</text>`
        );
        lastYearMonth = yearMonth;
        break; // Only render one label per week
      }
    }
  });

  return `  <g class="month-labels">\n${labels.join("\n")}\n  </g>`;
}

/**
 * Renders day-of-week labels on the left side (Mon, Wed, Fri).
 */
export function renderDayLabels(config: HeatmapConfig): string {
  if (!config.showDayLabels) return "";

  // Only show Mon, Wed, Fri to avoid crowding
  const daysToShow = [1, 3, 5]; // Mon, Wed, Fri
  const labels: string[] = [];

  for (const dayIndex of daysToShow) {
    const y = config.margin.top + dayIndex * (config.cellSize + config.cellGap) + config.cellSize / 2 + 3;
    const x = config.margin.left - 8;

    labels.push(
      `    <text x="${x}" y="${y}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="end">${DAY_LABELS[dayIndex]}</text>`
    );
  }

  return `  <g class="day-labels">\n${labels.join("\n")}\n  </g>`;
}

/**
 * Renders the color legend at the bottom of the heatmap.
 */
export function renderLegend(
  dimensions: Dimensions,
  config: HeatmapConfig
): string {
  if (!config.showLegend) return "";

  // "default" theme has a special multi-row legend
  if (config.theme === "default") {
    return renderDefaultThemeLegend(dimensions, config);
  }

  const colors = getColorPalette(config.theme);
  const legendCellSize = config.cellSize;
  const legendGap = 3;
  const legendWidth = colors.length * (legendCellSize + legendGap) - legendGap;

  // Position legend at bottom right
  const startX = dimensions.width - config.margin.right - legendWidth - 40;
  const y = dimensions.height - config.margin.bottom + 12;

  const cells: string[] = [];

  // "Less" label
  cells.push(
    `    <text x="${startX - 6}" y="${y + legendCellSize / 2 + 3}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}" text-anchor="end">Less</text>`
  );

  // Color cells
  colors.forEach((color, index) => {
    const x = startX + index * (legendCellSize + legendGap);
    cells.push(
      `    <rect x="${x}" y="${y}" width="${legendCellSize}" height="${legendCellSize}" rx="${config.cornerRadius}" fill="${color}" />`
    );
  });

  // "More" label
  const moreX = startX + legendWidth + 6;
  cells.push(
    `    <text x="${moreX}" y="${y + legendCellSize / 2 + 3}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}">More</text>`
  );

  return `  <g class="legend">\n${cells.join("\n")}\n  </g>`;
}

/**
 * Renders a horizontal legend for the "default" theme showing all three color scales.
 * Layout: GitHub [□□□□]  GitLab [□□□□]  Mixed [□□□□]
 */
function renderDefaultThemeLegend(
  dimensions: Dimensions,
  config: HeatmapConfig
): string {
  const palettes = getDefaultThemePalettes();
  const legendCellSize = config.cellSize;
  const legendGap = 3;
  const sectionGap = 16; // Gap between each label+colors section

  // Skip the first color (empty day) for the legend display
  const githubColors = palettes.github.slice(1);
  const gitlabColors = palettes.gitlab.slice(1);
  const mixedColors = palettes.mixed.slice(1);

  const sections = [
    { label: "GitHub", colors: githubColors },
    { label: "GitLab", colors: gitlabColors },
    { label: "Mixed", colors: mixedColors },
  ];

  // Calculate total width needed
  const labelWidths = [38, 38, 32]; // Approximate widths for "GitHub", "GitLab", "Mixed"
  const colorsWidth = githubColors.length * (legendCellSize + legendGap) - legendGap;
  const totalWidth = sections.reduce((sum, _, i) => 
    sum + labelWidths[i] + 4 + colorsWidth + (i < sections.length - 1 ? sectionGap : 0), 0
  );

  // Position legend at bottom right
  const startX = dimensions.width - config.margin.right - totalWidth;
  const y = dimensions.height - config.margin.bottom + 12;

  const cells: string[] = [];
  let currentX = startX;

  sections.forEach((section, sectionIndex) => {
    // Section label
    cells.push(
      `    <text x="${currentX}" y="${y + legendCellSize / 2 + 3}" font-size="${config.fontSize}" font-family="${config.fontFamily}" fill="${config.labelColor}">${section.label}</text>`
    );
    currentX += labelWidths[sectionIndex] + 4;

    // Color cells
    section.colors.forEach((color) => {
      cells.push(
        `    <rect x="${currentX}" y="${y}" width="${legendCellSize}" height="${legendCellSize}" rx="${config.cornerRadius}" fill="${color}" />`
      );
      currentX += legendCellSize + legendGap;
    });

    // Add gap between sections (except after last)
    if (sectionIndex < sections.length - 1) {
      currentX += sectionGap - legendGap;
    }
  });

  return `  <g class="legend">\n${cells.join("\n")}\n  </g>`;
}
