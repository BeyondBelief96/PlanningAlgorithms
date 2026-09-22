#include "planning/planning_graph.hpp"

#include <algorithm>
#include <sstream>

namespace planning {
namespace {

int indexOf(const std::vector<SignedLit>& layer, SignedLit l) {
  const auto it = std::find(layer.begin(), layer.end(), l);
  return it == layer.end() ? -1 : static_cast<int>(it - layer.begin());
}

}  // namespace

bool PlanningGraph::literalsMutex(int layer, SignedLit a, SignedLit b) const {
  if (layer < 0 || layer >= static_cast<int>(literalMutex.size())) return false;
  const int i = indexOf(L[layer], a);
  const int j = indexOf(L[layer], b);
  if (i < 0 || j < 0 || i == j) return false;
  return literalMutex[layer].count({std::min(i, j), std::max(i, j)}) > 0;
}

bool PlanningGraph::operatorsMutex(int layer, int i, int j) const {
  if (layer < 0 || layer >= static_cast<int>(operatorMutex.size())) return false;
  if (i == j) return false;
  return operatorMutex[layer].count({std::min(i, j), std::max(i, j)}) > 0;
}

std::string toString(const StripsProblem& problem, const PlanningGraph& graph) {
  std::ostringstream out;
  for (int i = 0; i < graph.numLayers(); ++i) {
    out << "L" << (i + 1) << ":";
    for (SignedLit l : graph.L[i]) {
      Literal lit = problem.atoms[litAtom(l)];
      lit.positive = litPositive(l);
      out << " " << problem.toString(lit);
    }
    out << "\n";
    if (i < static_cast<int>(graph.literalMutex.size()) && !graph.literalMutex[i].empty()) {
      out << "     mutex:";
      for (const auto& [a, b] : graph.literalMutex[i]) {
        Literal la = problem.atoms[litAtom(graph.L[i][a])];
        la.positive = litPositive(graph.L[i][a]);
        Literal lb = problem.atoms[litAtom(graph.L[i][b])];
        lb.positive = litPositive(graph.L[i][b]);
        out << " (" << problem.toString(la) << ", " << problem.toString(lb) << ")";
      }
      out << "\n";
    }
    if (i < static_cast<int>(graph.O.size())) {
      out << "O" << (i + 1) << ":";
      for (const GraphOp& op : graph.O[i]) {
        if (op.trivial()) {
          Literal lit = problem.atoms[litAtom(op.maintain)];
          lit.positive = litPositive(op.maintain);
          out << " keep[" << problem.toString(lit) << "]";
        } else {
          out << " " << problem.operators[op.op].name;
        }
      }
      out << "\n";
      if (i < static_cast<int>(graph.operatorMutex.size()) && !graph.operatorMutex[i].empty())
        out << "     " << graph.operatorMutex[i].size() << " mutex operator pair(s)\n";
    }
  }
  if (graph.levelledOffAt >= 0) out << "levelled off at layer " << (graph.levelledOffAt + 1) << "\n";
  return out.str();
}

}  // namespace planning
