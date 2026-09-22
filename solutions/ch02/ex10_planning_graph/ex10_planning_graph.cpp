// Reference solution -- Exercise 10: the planning graph (Section 2.5.2).
//
// The planning graph over-approximates reachability.  A literal appears in
// layer i if *some* i-step plan could make it true, ignoring the interactions
// between the operators that would have to run.  Mutex pairs claw back some of
// that optimism cheaply, and the result is polynomial in size where the state
// transition graph is exponential.
#include <algorithm>
#include <vector>

#include "planning/planning_graph.hpp"

namespace planning {
namespace {

// Preconditions and effects of a layer entry, real or trivial.  A trivial
// operator has its maintained literal as both, which is what makes it the
// planning-graph analogue of the termination action u_T.
std::vector<SignedLit> preconditionsOf(const StripsProblem& problem, const GraphOp& op) {
  if (op.trivial()) return {op.maintain};
  std::vector<SignedLit> result;
  for (const Literal& l : problem.operators[op.op].preconditions)
    result.push_back(makeLit(problem.atomIndex(l), l.positive));
  return result;
}

std::vector<SignedLit> effectsOf(const StripsProblem& problem, const GraphOp& op) {
  if (op.trivial()) return {op.maintain};
  std::vector<SignedLit> result;
  for (const Literal& l : problem.operators[op.op].effects)
    result.push_back(makeLit(problem.atomIndex(l), l.positive));
  return result;
}

bool contains(const std::vector<SignedLit>& layer, SignedLit l) {
  return std::find(layer.begin(), layer.end(), l) != layer.end();
}

int indexOf(const std::vector<SignedLit>& layer, SignedLit l) {
  const auto it = std::find(layer.begin(), layer.end(), l);
  return it == layer.end() ? -1 : static_cast<int>(it - layer.begin());
}

bool pairMutex(const MutexSet& mutex, int i, int j) {
  if (i < 0 || j < 0 || i == j) return false;
  return mutex.count({std::min(i, j), std::max(i, j)}) > 0;
}

// The three operator mutex conditions of Section 2.5.2.
bool operatorsAreMutex(const StripsProblem& problem, const GraphOp& a, const GraphOp& b,
                       const std::vector<SignedLit>& previousLayer,
                       const MutexSet& previousMutex) {
  const std::vector<SignedLit> preA = preconditionsOf(problem, a);
  const std::vector<SignedLit> preB = preconditionsOf(problem, b);
  const std::vector<SignedLit> effA = effectsOf(problem, a);
  const std::vector<SignedLit> effB = effectsOf(problem, b);

  // 1. Inconsistent effects: an effect of one negates an effect of the other.
  for (SignedLit ea : effA)
    for (SignedLit eb : effB)
      if (ea == -eb) return true;

  // 2. Interference: an effect of one negates a precondition of the other.
  for (SignedLit ea : effA)
    for (SignedLit pb : preB)
      if (ea == -pb) return true;
  for (SignedLit eb : effB)
    for (SignedLit pa : preA)
      if (eb == -pa) return true;

  // 3. Competing needs: a precondition of each pair are mutex one layer below.
  for (SignedLit pa : preA)
    for (SignedLit pb : preB)
      if (pairMutex(previousMutex, indexOf(previousLayer, pa), indexOf(previousLayer, pb)))
        return true;

  return false;
}

}  // namespace

PlanningGraph buildPlanningGraph(const StripsProblem& problem, int maxLayers) {
  PlanningGraph graph;
  const int numAtoms = static_cast<int>(problem.atoms.size());

  // L1 is the initial state: every positive literal of S, and the negation of
  // every positive literal not in S.
  const StripsState start = initialMask(problem);
  std::vector<SignedLit> first;
  for (int a = 0; a < numAtoms; ++a)
    first.push_back(makeLit(a, ((start >> a) & StripsState{1}) != 0));
  std::sort(first.begin(), first.end());
  graph.L.push_back(first);
  graph.literalMutex.emplace_back();  // one literal per pair, so nothing is mutex yet

  while (graph.numLayers() < maxLayers) {
    const int i = graph.numLayers() - 1;  // index of the current literal layer
    const std::vector<SignedLit> Li = graph.L[i];
    const MutexSet LiMutex = graph.literalMutex[i];

    // O_i: every operator whose preconditions are a subset of L_i, plus one
    // trivial operator per literal of L_i.
    std::vector<GraphOp> ops;
    for (std::size_t o = 0; o < problem.operators.size(); ++o) {
      bool ok = true;
      for (const Literal& pre : problem.operators[o].preconditions) {
        const int atom = problem.atomIndex(pre);
        if (atom < 0 || !contains(Li, makeLit(atom, pre.positive))) {
          ok = false;
          break;
        }
      }
      if (ok) ops.push_back(GraphOp{static_cast<int>(o), 0});
    }
    for (SignedLit l : Li) ops.push_back(GraphOp{-1, l});

    MutexSet opMutex;
    for (std::size_t p = 0; p < ops.size(); ++p)
      for (std::size_t q = p + 1; q < ops.size(); ++q)
        if (operatorsAreMutex(problem, ops[p], ops[q], Li, LiMutex))
          opMutex.insert({static_cast<int>(p), static_cast<int>(q)});

    // L_{i+1}: the union of the effects of everything in O_i.
    std::vector<SignedLit> nextLayer;
    for (const GraphOp& op : ops)
      for (SignedLit e : effectsOf(problem, op))
        if (!contains(nextLayer, e)) nextLayer.push_back(e);
    std::sort(nextLayer.begin(), nextLayer.end());

    // Literal mutexes in L_{i+1}.
    MutexSet nextMutex;
    for (std::size_t p = 0; p < nextLayer.size(); ++p) {
      for (std::size_t q = p + 1; q < nextLayer.size(); ++q) {
        // 1. Negated literals: a complementary pair is always mutex.
        if (nextLayer[p] == -nextLayer[q]) {
          nextMutex.insert({static_cast<int>(p), static_cast<int>(q)});
          continue;
        }
        // 2. Inconsistent support: every pair of achievers is mutex.  One
        // operator achieving both settles it immediately in the negative.
        bool allMutex = true;
        bool anyPair = false;
        for (std::size_t oa = 0; oa < ops.size() && allMutex; ++oa) {
          const std::vector<SignedLit> ea = effectsOf(problem, ops[oa]);
          if (!contains(ea, nextLayer[p])) continue;
          if (contains(ea, nextLayer[q])) {
            allMutex = false;
            break;
          }
          for (std::size_t ob = 0; ob < ops.size(); ++ob) {
            if (oa == ob) continue;
            const std::vector<SignedLit> eb = effectsOf(problem, ops[ob]);
            if (!contains(eb, nextLayer[q])) continue;
            anyPair = true;
            if (!pairMutex(opMutex, static_cast<int>(oa), static_cast<int>(ob))) {
              allMutex = false;
              break;
            }
          }
        }
        if (allMutex && anyPair) nextMutex.insert({static_cast<int>(p), static_cast<int>(q)});
      }
    }

    graph.O.push_back(std::move(ops));
    graph.operatorMutex.push_back(std::move(opMutex));
    graph.L.push_back(nextLayer);
    graph.literalMutex.push_back(nextMutex);

    // Levelled off?  Section 2.5.2 states the condition as O_{i+1} = O_i and
    // L_{i+1} = L_i, and since O_i is determined entirely by L_i, comparing the
    // literal layers is enough.  For the flashlight this stops at L4, exactly
    // where Figure 2.20 does.
    //
    // Real GraphPlan waits longer: the mutex sets keep shrinking for a while
    // after the literal sets stop growing, and a goal pair that is mutex now
    // may stop being mutex later.  See the README for when that bites.
    if (Li == graph.L.back()) {
      graph.levelledOffAt = graph.numLayers() - 1;
      break;
    }
  }
  return graph;
}

bool goalPossiblyReachable(const StripsProblem& problem, const PlanningGraph& graph, int layer) {
  if (layer < 0 || layer >= graph.numLayers()) return false;

  std::vector<SignedLit> goalLits;
  for (const Literal& l : problem.goal) {
    const int atom = problem.atomIndex(l);
    if (atom < 0) return false;
    goalLits.push_back(makeLit(atom, l.positive));
  }
  for (SignedLit g : goalLits)
    if (!contains(graph.L[layer], g)) return false;
  for (std::size_t p = 0; p < goalLits.size(); ++p)
    for (std::size_t q = p + 1; q < goalLits.size(); ++q)
      if (graph.literalsMutex(layer, goalLits[p], goalLits[q])) return false;
  return true;
}

int firstGoalLayer(const StripsProblem& problem, const PlanningGraph& graph) {
  for (int i = 0; i < graph.numLayers(); ++i)
    if (goalPossiblyReachable(problem, graph, i)) return i;
  return -1;
}

}  // namespace planning
