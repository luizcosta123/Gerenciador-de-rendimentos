import { formatCurrency } from "../lib/formatters.js";

const SVG_WIDTH = 720;
const SVG_HEIGHT = 240;
const PADDING_X = 24;
const PADDING_Y = 20;

function buildPath(points) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function normalizePoints(schedule) {
  const values = schedule.map((row) => row.closingBalance);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const chartWidth = SVG_WIDTH - PADDING_X * 2;
  const chartHeight = SVG_HEIGHT - PADDING_Y * 2;

  return schedule.map((row, index) => {
    const progressX = schedule.length === 1 ? 0 : index / (schedule.length - 1);
    const progressY = (row.closingBalance - minValue) / valueRange;

    return {
      ...row,
      x: PADDING_X + chartWidth * progressX,
      y: SVG_HEIGHT - PADDING_Y - chartHeight * progressY,
    };
  });
}

function renderGridLines() {
  const rows = 4;
  const gridLines = [];

  for (let index = 0; index < rows; index += 1) {
    const y = PADDING_Y + ((SVG_HEIGHT - PADDING_Y * 2) / (rows - 1)) * index;
    gridLines.push(
      `<line x1="${PADDING_X}" y1="${y}" x2="${SVG_WIDTH - PADDING_X}" y2="${y}" class="chart-grid-line" />`,
    );
  }

  return gridLines.join("");
}

export function renderProjectionChart({ svgElement, currentValueElement, rangeLabelElement, result }) {
  if (!result || result.schedule.length === 0) {
    svgElement.innerHTML = "";
    currentValueElement.textContent = formatCurrency(0);
    rangeLabelElement.textContent = "Sem dados";
    return;
  }

  const points = normalizePoints(result.schedule);
  const path = buildPath(points);
  const areaPath = `${path} L ${points.at(-1).x.toFixed(2)} ${SVG_HEIGHT - PADDING_Y} L ${points[0].x.toFixed(2)} ${SVG_HEIGHT - PADDING_Y} Z`;
  const currentValue = result.schedule.at(-1).closingBalance;
  const rangeLabel =
    result.schedule.length === 1
      ? result.schedule[0].label
      : `${result.schedule[0].label} - ${result.schedule.at(-1).label}`;

  svgElement.innerHTML = `
    <g class="chart-grid">
      ${renderGridLines()}
    </g>
    <path d="${areaPath}" class="chart-area"></path>
    <path d="${path}" class="chart-line"></path>
    ${points
      .map(
        (point, index) => `
          <circle
            cx="${point.x.toFixed(2)}"
            cy="${point.y.toFixed(2)}"
            r="${index === points.length - 1 ? 4.5 : 3}"
            class="${index === points.length - 1 ? "chart-point chart-point-current" : "chart-point"}"
          >
            <title>${point.label}: ${formatCurrency(point.closingBalance)}</title>
          </circle>
        `,
      )
      .join("")}
  `;

  currentValueElement.textContent = formatCurrency(currentValue);
  rangeLabelElement.textContent = rangeLabel;
}
