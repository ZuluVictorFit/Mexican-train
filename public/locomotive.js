// Project a tiny three-dimensional locomotive onto the existing SVG table.
// Geometry is kept separate from the game state and from theme colors.
export function locomotiveModel(svgElement, color) {
  const group = svgElement("g", {
    class: "locomotive-model",
    transform: "scale(1.08)",
    style: "filter: drop-shadow(0.5px 0.8px 0.7px #25191077)",
  });
  const project = ([x, y, z]) => [x + z * 0.24, y - z * 0.52];
  const shade = (amount) => {
    const rgb = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!rgb) return color;
    const channels = rgb.slice(1).map((v) => {
      const n = parseInt(v, 16);
      return Math.round(
        amount >= 0 ? n + (255 - n) * amount : n * (1 + amount),
      );
    });
    return `rgb(${channels.join(" ")})`;
  };
  function polygon(vertices, fill, stroke = shade(-0.3), width = 0.3) {
    group.append(
      svgElement("polygon", {
        points: vertices.map((v) => project(v).join(",")).join(" "),
        fill,
        stroke,
        "stroke-width": width,
        "stroke-linejoin": "round",
      }),
    );
  }
  function box(x1, x2, y1, y2, z1, z2, surface) {
    polygon(
      [
        [x1, y2, z1],
        [x2, y2, z1],
        [x2, y2, z2],
        [x1, y2, z2],
      ],
      surface.side,
    );
    polygon(
      [
        [x2, y1, z1],
        [x2, y2, z1],
        [x2, y2, z2],
        [x2, y1, z2],
      ],
      surface.front,
    );
    polygon(
      [
        [x1, y1, z2],
        [x2, y1, z2],
        [x2, y2, z2],
        [x1, y2, z2],
      ],
      surface.top,
    );
  }
  const paint = { side: color, front: shade(-0.22), top: shade(0.2) };
  const trim = { side: shade(-0.17), front: shade(-0.28), top: shade(0.3) };
  // The wheels, cab, boiler, and chimney are molded from the same plastic.
  for (const y of [-4.1, 4.1])
    for (const x of [-6, 5]) {
      const [cx, cy] = project([x, y, 0.7]);
      group.append(
        svgElement("ellipse", {
          cx,
          cy,
          rx: 2.5,
          ry: 1.6,
          fill: shade(-0.18),
          stroke: shade(0.22),
          "stroke-width": 0.4,
        }),
      );
    }
  box(-10, 10, -3.5, 3.5, 0.8, 2.2, trim);
  polygon(
    [
      [8, -3.5, 2.2],
      [12, -4, 0.8],
      [12, 4, 0.8],
      [8, 3.5, 2.2],
    ],
    paint.top,
  );
  // The boiler is an eight-sided cylinder along the locomotive's axis.
  const ring = (x, i) => {
    const angle = (i * Math.PI) / 4;
    return [x, Math.cos(angle) * 2.8, 5 + Math.sin(angle) * 2.8];
  };
  for (let i = 4; i >= 0; i--)
    polygon(
      [ring(-3, i), ring(8, i), ring(8, i + 1), ring(-3, i + 1)],
      i === 1 || i === 2 ? paint.top : i === 0 ? paint.side : paint.front,
    );
  polygon(
    Array.from({ length: 8 }, (_, i) => ring(8, i)),
    shade(-0.1),
  );
  box(-9, -3, -3.4, 3.4, 2.2, 8.5, paint);
  box(-9.8, -2.4, -4, 4, 8.5, 9.5, trim);
  box(3.5, 5.5, -1.3, 1.3, 7, 9, paint);
  const [smokeX, smokeY] = project([4.5, 0, 10]);
  group.append(
    svgElement("ellipse", {
      cx: smokeX,
      cy: smokeY,
      rx: 1.7,
      ry: 1.5,
      fill: shade(0.16),
      stroke: shade(-0.22),
      "stroke-width": 0.3,
    }),
  );
  // Small glossy highlights suggest molded, reflective plastic.
  const [x1, y1] = project([-8.8, -2.7, 9.55]);
  const [x2, y2] = project([-3.1, -2.7, 9.55]);
  group.append(
    svgElement("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: shade(0.65),
      "stroke-width": 0.55,
      "stroke-linecap": "round",
      opacity: 0.9,
    }),
  );
  const [b1x, b1y] = project([-2.4, -1.2, 7.7]);
  const [b2x, b2y] = project([6.5, -1.2, 7.7]);
  group.append(
    svgElement("line", {
      x1: b1x,
      y1: b1y,
      x2: b2x,
      y2: b2y,
      stroke: shade(0.55),
      "stroke-width": 0.4,
      "stroke-linecap": "round",
      opacity: 0.8,
    }),
  );
  return group;
}
