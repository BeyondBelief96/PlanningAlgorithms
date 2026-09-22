#include "planning/sat.hpp"

#include <sstream>

namespace planning {

std::string CnfFormula::toDimacs() const {
  std::ostringstream out;
  out << "p cnf " << numVars << " " << clauses.size() << "\n";
  for (const auto& clause : clauses) {
    for (int l : clause) out << l << " ";
    out << "0\n";
  }
  return out.str();
}

bool CnfFormula::satisfiedBy(const std::vector<bool>& assignment) const {
  for (const auto& clause : clauses) {
    bool ok = false;
    for (int l : clause) {
      const int v = l > 0 ? l : -l;
      if (v < 1 || v > static_cast<int>(assignment.size())) continue;
      if (assignment[v - 1] == (l > 0)) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}

}  // namespace planning
