// airport_map.cpp -- Kilo Field, the capstone airport, and its scenarios.
//
// Everything is axis-aligned rectangles, in metres, x east and y north.  The
// layout is drawn in docs/capstone/07-the-map.md; the numbers below are the
// authority for it.
#include "planning/airport/airport_map.hpp"

#include <algorithm>
#include <cctype>

namespace planning::airport::maps {
namespace {

struct Builder {
  Airport airport;

  int area(ZoneClass zone, std::string name, double x0, double y0, double x1, double y1,
           std::vector<std::string> idents = {}) {
    ZonePolygon p;
    p.zone = zone;
    p.name = std::move(name);
    p.outline = makeRectangle(x0, y0, x1, y1);
    p.idents = std::move(idents);
    return airport.zones.add(std::move(p));
  }

  int overlay(std::string name, double x0, double y0, double x1, double y1, bool hotspot,
              bool closed) {
    ZonePolygon p;
    p.zone = ZoneClass::Unknown;
    p.name = std::move(name);
    p.outline = makeRectangle(x0, y0, x1, y1);
    p.overlay = true;
    p.hotspot = hotspot;
    p.closed = closed;
    return airport.zones.add(std::move(p));
  }

  int holdShort(std::string name, double x0, double y0, double x1, double y1,
                std::vector<std::string> protects) {
    HoldShortLine line;
    line.name = std::move(name);
    line.segment = Segment{{x0, y0}, {x1, y1}};
    line.protects = std::move(protects);
    return airport.zones.addHoldShort(std::move(line));
  }

  VertexId node(std::string name, double x, double y) {
    return airport.graph.addVertex(Vec2{x, y}, std::move(name));
  }

  EdgeId link(VertexId a, VertexId b, std::string label, double maxWingspan, bool oneWay = false) {
    const EdgeId e = airport.graph.addEdge(a, b, std::move(label));
    airport.graph.edge(e).maxWingspan = maxWingspan;
    airport.graph.edge(e).oneWay = oneWay;
    return e;
  }
};

// Code D taxiways: wide enough for an A320, not for a 777.
constexpr double kTaxiwayWingspan = 52.0;
constexpr double kRunwayWingspan = 80.0;

Airport build() {
  Builder b;
  b.airport.name = "Kilo Field";
  b.airport.zones.setName("Kilo Field");

  // --- runways and their protected areas -----------------------------------
  b.area(ZoneClass::Runway, "RWY 09/27", 0, 475, 2400, 525, {"09", "27"});
  b.area(ZoneClass::RunwayProtected, "RWY 09/27 protected S", 0, 425, 2400, 475, {"09", "27"});
  b.area(ZoneClass::RunwayProtected, "RWY 09/27 protected N", 0, 525, 2400, 575, {"09", "27"});
  b.area(ZoneClass::Runway, "RWY 18/36", 1575, 60, 1625, 420, {"18", "36"});
  b.area(ZoneClass::RunwayProtected, "RWY 18/36 protected W", 1525, 60, 1575, 420, {"18", "36"});
  b.area(ZoneClass::RunwayProtected, "RWY 18/36 protected E", 1625, 60, 1675, 420, {"18", "36"});

  // --- taxiways ------------------------------------------------------------
  b.area(ZoneClass::Taxiway, "TWY A", 500, 185, 1415, 215);
  b.area(ZoneClass::Taxiway, "TWY F", 985, 185, 1015, 415);
  b.area(ZoneClass::Taxiway, "TWY D", 1385, 185, 1415, 415);
  b.area(ZoneClass::Taxiway, "TWY B", 985, 385, 2315, 415);
  b.area(ZoneClass::Taxiway, "TWY C", 1785, 385, 1815, 500);
  b.area(ZoneClass::Taxiway, "TWY E", 2285, 385, 2315, 500);
  b.area(ZoneClass::Taxiway, "TWY G", 665, 185, 695, 235);

  // --- apron, stands, de-icing ---------------------------------------------
  b.area(ZoneClass::Apron, "APRON NORTH", 100, 130, 500, 280);
  b.area(ZoneClass::Stand, "STAND 1", 140, 40, 200, 130);
  b.area(ZoneClass::Stand, "STAND 2", 260, 40, 320, 130);
  b.area(ZoneClass::Stand, "STAND 3", 380, 40, 440, 130);
  b.area(ZoneClass::DeIcing, "DEICE PAD", 600, 235, 760, 315);

  // --- forbidden -----------------------------------------------------------
  b.area(ZoneClass::Forbidden, "TERMINAL", 100, 0, 500, 40);
  b.area(ZoneClass::Forbidden, "SERVICE ROAD", 790, 250, 960, 270);

  // --- shoulders: wing overhang fine, gear forbidden -----------------------
  b.area(ZoneClass::Shoulder, "TWY A shoulder S", 500, 175, 1415, 185);
  b.area(ZoneClass::Shoulder, "TWY A shoulder N", 500, 215, 1415, 225);
  b.area(ZoneClass::Shoulder, "TWY B shoulder S", 985, 375, 2315, 385);
  b.area(ZoneClass::Shoulder, "TWY B shoulder N", 985, 415, 2315, 425);
  b.area(ZoneClass::Shoulder, "TWY F shoulder W", 975, 185, 985, 415);
  b.area(ZoneClass::Shoulder, "TWY F shoulder E", 1015, 185, 1025, 415);
  b.area(ZoneClass::Shoulder, "TWY D shoulder W", 1375, 185, 1385, 415);
  b.area(ZoneClass::Shoulder, "TWY D shoulder E", 1415, 185, 1425, 415);

  // --- overlays ------------------------------------------------------------
  b.overlay("HOTSPOT 1", 950, 350, 1050, 450, /*hotspot=*/true, /*closed=*/false);
  b.overlay("APRON WEST CLOSED", 100, 130, 155, 280, false, true);

  // --- holding positions ---------------------------------------------------
  b.holdShort("HS 36 W", 1525, 375, 1525, 425, {"18", "36"});
  b.holdShort("HS 36 E", 1675, 375, 1675, 425, {"18", "36"});
  b.holdShort("HS 27 C", 1775, 425, 1825, 425, {"09", "27"});
  b.holdShort("HS 27 E", 2275, 425, 2325, 425, {"09", "27"});

  b.airport.zones.build();

  // --- the raw guidance-line graph -----------------------------------------
  const VertexId s1 = b.node("S1", 170, 95);
  const VertexId s2 = b.node("S2", 290, 95);
  const VertexId s3 = b.node("S3", 410, 95);
  const VertexId p0 = b.node("P0", 110, 200);
  const VertexId p1 = b.node("P1", 170, 200);
  const VertexId p2 = b.node("P2", 290, 200);
  const VertexId p3 = b.node("P3", 410, 200);
  const VertexId ga = b.node("GA", 500, 200);
  const VertexId g0 = b.node("G0", 680, 200);
  const VertexId di = b.node("DI", 680, 280);
  const VertexId a1 = b.node("A1", 1000, 200);
  const VertexId a2 = b.node("A2", 1400, 200);
  const VertexId f1 = b.node("F1", 1000, 400);
  const VertexId d1 = b.node("D1", 1400, 400);
  const VertexId x36 = b.node("X36", 1600, 400);
  const VertexId c1 = b.node("C1", 1800, 400);
  const VertexId cr = b.node("CR", 1800, 500);
  const VertexId e1 = b.node("E1", 2300, 400);
  const VertexId er = b.node("ER", 2300, 500);
  const VertexId rw09 = b.node("RW09", 60, 500);
  const VertexId rwm = b.node("RWM", 1000, 500);
  const VertexId rw27 = b.node("RW27", 2340, 500);
  const VertexId r36 = b.node("R36", 1600, 100);
  const VertexId r18 = b.node("R18", 1600, 410);

  b.link(s1, p1, "STAND 1", kTaxiwayWingspan);
  b.link(s2, p2, "STAND 2", kTaxiwayWingspan);
  b.link(s3, p3, "STAND 3", kTaxiwayWingspan);
  b.link(p0, p1, "APRON", kTaxiwayWingspan);
  b.link(p1, p2, "APRON", kTaxiwayWingspan);
  b.link(p2, p3, "APRON", kTaxiwayWingspan);
  b.link(p3, ga, "APRON", kTaxiwayWingspan);
  b.link(ga, g0, "A", kTaxiwayWingspan);
  b.link(g0, a1, "A", kTaxiwayWingspan);
  b.link(a1, a2, "A", kTaxiwayWingspan);
  b.link(g0, di, "DEICE", kTaxiwayWingspan);
  b.link(a1, f1, "F", kTaxiwayWingspan, /*oneWay=*/true);  // northbound only
  b.link(a2, d1, "D", kTaxiwayWingspan);
  b.link(f1, d1, "B", kTaxiwayWingspan);
  b.link(d1, x36, "B", kTaxiwayWingspan);
  b.link(x36, c1, "B", kTaxiwayWingspan);
  b.link(c1, e1, "B", kTaxiwayWingspan);
  b.link(c1, cr, "C", kTaxiwayWingspan);
  b.link(e1, er, "E", kTaxiwayWingspan);
  b.link(rw09, rwm, "RWY 09/27", kRunwayWingspan);
  b.link(rwm, cr, "RWY 09/27", kRunwayWingspan);
  b.link(cr, er, "RWY 09/27", kRunwayWingspan);
  b.link(er, rw27, "RWY 09/27", kRunwayWingspan);
  b.link(r36, x36, "RWY 18/36", kRunwayWingspan);
  b.link(x36, r18, "RWY 18/36", kRunwayWingspan);

  b.airport.graph.build();
  return b.airport;
}

}  // namespace

Airport buildKilo() { return build(); }

const Airport& kilo() {
  static const Airport cached = build();
  return cached;
}

}  // namespace planning::airport::maps

namespace planning::airport::scenarios {

namespace {
constexpr double kDeg = kPi / 180.0;
}

Scenario standDeparture() {
  Scenario s;
  s.name = "stand-departure";
  s.description = "Pushed back at stand 2, lined up on the lead-out line, facing north.";
  s.start = Pose{{290.0, 95.0}, 90.0 * kDeg};
  s.aircraft = a320();
  s.clearance = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
  s.expectation = "success: capture the stand line, out via A D B, cross 36, stop at HS 27 E";
  return s;
}

Scenario noseInStand() {
  Scenario s;
  s.name = "nose-in-stand";
  s.description = "Still nose-in at stand 3, facing the terminal.  Nothing ahead but building.";
  s.start = Pose{{410.0, 95.0}, -90.0 * kDeg};
  s.aircraft = a320();
  s.clearance = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
  s.expectation = "pushback or tow required";
  return s;
}

Scenario apronOffLine() {
  Scenario s;
  s.name = "apron-off-line";
  s.description = "Parked on the apron well off any guidance line, facing north-east.";
  s.start = Pose{{350.0, 240.0}, 45.0 * kDeg};
  s.aircraft = a320();
  s.clearance = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
  s.expectation = "success: free-space merge onto the apron lane, then the graph route";
  return s;
}

Scenario taxiwayCapture() {
  Scenario s;
  s.name = "taxiway-capture";
  s.description = "On taxiway A, six metres left of the centreline and eight degrees off.";
  s.start = Pose{{800.0, 206.0}, 8.0 * kDeg};
  s.aircraft = a320();
  s.clearance = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
  s.expectation = "success: an S-curve back onto A, no free-space search";
  return s;
}

Scenario landingRollout() {
  Scenario s;
  s.name = "landing-rollout";
  s.description = "Rolling out on runway 09 at midfield.  Both exits are ahead.";
  s.start = Pose{{1150.0, 500.0}, 0.0};
  s.aircraft = a320();
  s.clearance = "TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36";
  s.expectation = "success: exit ahead at C, cross 36 westbound, in via D and A";
  return s;
}

Scenario landingNoExit() {
  Scenario s;
  s.name = "landing-no-exit";
  s.description = "Rolling out on runway 27 near the west end.  Every exit is behind.";
  s.start = Pose{{400.0, 500.0}, 180.0 * kDeg};
  s.aircraft = a320();
  s.clearance = "TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36";
  s.expectation = "no forward exit from runway ahead";
  return s;
}

Scenario insideRunwayProtected() {
  Scenario s;
  s.name = "inside-protected";
  s.description = "Stopped inside the runway 36 protected area with no crossing clearance.";
  s.start = Pose{{1550.0, 400.0}, 0.0};
  s.aircraft = a320();
  s.clearance = "TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27";
  s.expectation = "no forward exit: nothing ahead is reachable without a crossing clearance";
  return s;
}

Scenario oversizeAircraft() {
  Scenario s;
  s.name = "oversize";
  s.description = "A Boeing 777 at stand 2.  The capstone taxiways are code D.";
  s.start = Pose{{290.0, 95.0}, 90.0 * kDeg};
  s.aircraft = b777();
  s.clearance = "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27";
  s.expectation = "no route: the wingspan exceeds every taxiway on the cleared route";
  return s;
}

std::vector<Scenario> all() {
  return {standDeparture(), noseInStand(),   apronOffLine(),          taxiwayCapture(),
          landingRollout(), landingNoExit(), insideRunwayProtected(), oversizeAircraft()};
}

Scenario byName(const std::string& name) {
  std::string key;
  for (char c : name) {
    if (c == '_' || c == ' ') c = '-';
    key.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
  }
  for (const Scenario& s : all())
    if (s.name == key) return s;
  return standDeparture();
}

}  // namespace planning::airport::scenarios
