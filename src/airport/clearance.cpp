// clearance.cpp -- the given clearance parser.
//
// Turning words into a struct is not planning, so this is scaffolding.  Turning
// the struct into a permission set over the gated graph is Exercise 04.
#include "planning/airport/clearance.hpp"

#include <cctype>
#include <sstream>

namespace planning::airport {
namespace {

std::string upper(std::string s) {
  for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
  return s;
}

std::vector<std::string> tokenize(const std::string& text) {
  std::vector<std::string> out;
  std::istringstream in(upper(text));
  std::string word;
  while (in >> word) {
    // Strip punctuation that ATC transcripts pick up.
    std::string clean;
    for (char c : word)
      if (std::isalnum(static_cast<unsigned char>(c)) || c == '/') clean.push_back(c);
    if (!clean.empty()) out.push_back(clean);
  }
  return out;
}

bool isKeyword(const std::string& w) {
  return w == "TAXI" || w == "TO" || w == "VIA" || w == "CROSS" || w == "HOLD" || w == "SHORT" ||
         w == "OF" || w == "RUNWAY" || w == "STAND" || w == "LINE" || w == "UP" || w == "AND" ||
         w == "WAIT" || w == "CLEARED" || w == "FOR" || w == "TAKEOFF" || w == "THEN";
}

}  // namespace

Clearance parseClearance(const std::string& text) {
  Clearance c;
  c.raw = text;
  const std::vector<std::string> t = tokenize(text);

  for (std::size_t i = 0; i < t.size(); ++i) {
    const std::string& w = t[i];
    if (w == "TAXI" && i + 2 < t.size() && t[i + 1] == "TO") {
      if (t[i + 2] == "RUNWAY" && i + 3 < t.size()) {
        c.destination = t[i + 3];
        c.destinationIsRunway = true;
        i += 3;
      } else if (t[i + 2] == "STAND" && i + 3 < t.size()) {
        c.destination = t[i + 3];
        c.destinationIsRunway = false;
        i += 3;
      }
    } else if (w == "VIA") {
      for (std::size_t j = i + 1; j < t.size() && !isKeyword(t[j]); ++j) {
        if (t[j] == "DEICE" || t[j] == "DEICING") c.deIcingRequested = true;
        c.route.push_back(t[j]);
        i = j;
      }
    } else if (w == "CROSS" && i + 1 < t.size()) {
      std::size_t j = i + 1;
      if (t[j] == "RUNWAY") ++j;
      if (j < t.size()) {
        c.crossings.insert(t[j]);
        i = j;
      }
    } else if (w == "HOLD" && i + 1 < t.size() && t[i + 1] == "SHORT") {
      std::size_t j = i + 2;
      if (j < t.size() && t[j] == "OF") ++j;
      if (j < t.size() && t[j] == "RUNWAY") ++j;
      if (j < t.size()) {
        c.holdShort.insert(t[j]);
        i = j;
      }
    } else if (w == "LINE" && i + 2 < t.size() && t[i + 1] == "UP") {
      c.clearedToEnterDestination = true;
      i += 2;
    } else if (w == "CLEARED" && i + 2 < t.size() && t[i + 2] == "TAKEOFF") {
      c.clearedToEnterDestination = true;
      i += 2;
    }
  }
  return c;
}

std::string toString(const Clearance& clearance) {
  std::ostringstream out;
  out << (clearance.destinationIsRunway ? "to runway " : "to stand ") << clearance.destination;
  if (!clearance.route.empty()) {
    out << " via";
    for (const std::string& label : clearance.route) out << " " << label;
  }
  for (const std::string& r : clearance.crossings) out << ", cross " << r;
  for (const std::string& r : clearance.holdShort) out << ", hold short of " << r;
  if (clearance.clearedToEnterDestination) out << ", cleared to enter";
  return out.str();
}

}  // namespace planning::airport
