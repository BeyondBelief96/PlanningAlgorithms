// test_harness.hpp -- A ~100 line test framework, so the repo has no dependencies.
//
// Each test file is its own executable and includes this header exactly once;
// main() lives here.  Write tests as:
//
//     TEST(my_test_name) {
//       CHECK(2 + 2 == 4);
//       CHECK_NEAR(cost, 10.0);
//     }
//
// A failing CHECK aborts that one test and moves on to the next, so one broken
// algorithm does not hide the state of the others.
#pragma once

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

#if defined(_WIN32)
#include <crtdbg.h>
#endif

namespace testing {

// A half-written exercise will sooner or later index past the end of a vector.
// On Windows that pops a modal dialog and the test run hangs forever instead of
// failing, so route the CRT's complaints to stderr and keep going.
inline void suppressCrashDialogs() {
#if defined(_WIN32)
  _set_abort_behavior(0, _WRITE_ABORT_MSG | _CALL_REPORTFAULT);
#if defined(_DEBUG)
  for (int report : {_CRT_WARN, _CRT_ERROR, _CRT_ASSERT}) {
    _CrtSetReportMode(report, _CRTDBG_MODE_FILE);
    _CrtSetReportFile(report, _CRTDBG_FILE_STDERR);
  }
#endif
#endif
}

inline constexpr double INF = std::numeric_limits<double>::infinity();

struct TestCase {
  std::string name;
  void (*fn)();
};

inline std::vector<TestCase>& registry() {
  static std::vector<TestCase> r;
  return r;
}

inline bool add(const char* name, void (*fn)()) {
  registry().push_back({name, fn});
  return true;
}

struct Failure {
  std::string message;
};

[[noreturn]] inline void fail(const char* file, int line, const std::string& what) {
  std::ostringstream out;
  out << file << ":" << line << "\n      " << what;
  throw Failure{out.str()};
}

template <typename T>
std::string describe(const T& value) {
  std::ostringstream out;
  out << value;
  return out.str();
}

inline std::string describe(double value) {
  if (value == INF) return "inf";
  if (value == -INF) return "-inf";
  std::ostringstream out;
  out << value;
  return out.str();
}

inline std::string describe(const std::vector<double>& row) {
  std::ostringstream out;
  out << "[";
  for (std::size_t i = 0; i < row.size(); ++i) {
    if (i) out << ", ";
    out << describe(row[i]);
  }
  out << "]";
  return out.str();
}

// Bounds-checked element access.  A stub returns an empty vector, and reading
// past the end of it would kill the whole executable and take the other tests'
// output with it.  Use AT(...) instead of [...] anywhere the size is something
// the exercise is responsible for.
template <typename Container>
const typename Container::value_type& elementAt(const char* file, int line,
                                                const Container& container, std::size_t index,
                                                const char* name) {
  if (index >= container.size())
    fail(file, line, std::string(name) + " has only " + std::to_string(container.size()) +
                         " element(s); wanted index " + std::to_string(index));
  return container[index];
}

inline bool nearlyEqual(double a, double b, double tol = 1e-9) {
  if (std::isinf(a) || std::isinf(b)) return a == b;
  return std::fabs(a - b) <= tol;
}

inline bool rowsEqual(const std::vector<double>& a, const std::vector<double>& b) {
  if (a.size() != b.size()) return false;
  for (std::size_t i = 0; i < a.size(); ++i)
    if (!nearlyEqual(a[i], b[i])) return false;
  return true;
}

inline int run() {
  suppressCrashDialogs();
  // Flush after every line.  A half-written exercise can still take the process
  // down in ways no catch block sees, and when it does, the output up to that
  // point is the only clue about which test was running.
  std::cout << std::unitbuf;
  int failed = 0;
  for (const TestCase& t : registry()) {
    try {
      t.fn();
      std::cout << "  PASS  " << t.name << "\n";
    } catch (const Failure& f) {
      ++failed;
      std::cout << "  FAIL  " << t.name << "\n    at " << f.message << "\n";
    } catch (const std::exception& e) {
      ++failed;
      std::cout << "  FAIL  " << t.name << "\n    threw std::exception: " << e.what() << "\n";
    } catch (...) {
      ++failed;
      std::cout << "  FAIL  " << t.name << "\n    threw an unknown exception\n";
    }
  }
  std::cout << (failed == 0 ? "OK" : "FAILED") << ": " << (registry().size() - failed) << "/"
            << registry().size() << " tests passed\n";
  return failed == 0 ? 0 : 1;
}

}  // namespace testing

#define TEST(name)                                                       \
  static void name();                                                    \
  static const bool test_registered_##name = ::testing::add(#name, name); \
  static void name()

#define CHECK(cond)                                                  \
  do {                                                               \
    if (!(cond)) ::testing::fail(__FILE__, __LINE__, "CHECK failed: " #cond); \
  } while (0)

#define CHECK_MSG(cond, msg)                                                          \
  do {                                                                                \
    if (!(cond))                                                                      \
      ::testing::fail(__FILE__, __LINE__, std::string("CHECK failed: " #cond "\n      ") + (msg)); \
  } while (0)

#define CHECK_EQ(actual, expected)                                                     \
  do {                                                                                 \
    const auto testing_a_ = (actual);                                                  \
    const auto testing_b_ = (expected);                                                \
    if (!(testing_a_ == testing_b_))                                                   \
      ::testing::fail(__FILE__, __LINE__,                                              \
                      "expected " #actual " == " #expected "\n      actual:   " +      \
                          ::testing::describe(testing_a_) + "\n      expected: " +     \
                          ::testing::describe(testing_b_));                            \
  } while (0)

#define CHECK_NEAR(actual, expected)                                                   \
  do {                                                                                 \
    const double testing_a_ = (actual);                                                \
    const double testing_b_ = (expected);                                              \
    if (!::testing::nearlyEqual(testing_a_, testing_b_))                               \
      ::testing::fail(__FILE__, __LINE__,                                              \
                      "expected " #actual " == " #expected "\n      actual:   " +      \
                          ::testing::describe(testing_a_) + "\n      expected: " +     \
                          ::testing::describe(testing_b_));                            \
  } while (0)

// Compares a whole row of the state space, printing both rows on failure.
#define CHECK_ROW(actual, ...)                                                         \
  do {                                                                                 \
    const std::vector<double> testing_a_ = (actual);                                   \
    const std::vector<double> testing_b_ = __VA_ARGS__;                                \
    if (!::testing::rowsEqual(testing_a_, testing_b_))                                 \
      ::testing::fail(__FILE__, __LINE__,                                              \
                      std::string("row mismatch for " #actual "\n      actual:   ") +  \
                          ::testing::describe(testing_a_) + "\n      expected: " +     \
                          ::testing::describe(testing_b_));                            \
  } while (0)

// Bounds-checked container access; fails the test rather than the process.
#define AT(container, index)   ::testing::elementAt(__FILE__, __LINE__, (container), static_cast<std::size_t>(index), #container)

// Asserts the plan is structurally valid against the problem (see validate()).
#define CHECK_VALID_PLAN(problem, plan)                                                \
  do {                                                                                 \
    const std::string testing_why_ = ::planning::validate((problem), (plan));          \
    if (!testing_why_.empty())                                                         \
      ::testing::fail(__FILE__, __LINE__, "invalid plan: " + testing_why_);            \
  } while (0)

// The same, for the taxi problems of Part 1.
#define CHECK_VALID_ROUTE(theChart, theRoute)                                               do {                                                                                        const std::string testing_why_ = ::planning::chart::validate((theChart), (theRoute));     if (!testing_why_.empty())                                                                  ::testing::fail(__FILE__, __LINE__, "invalid route: " + testing_why_);                } while (0)

#define CHECK_VALID_JOBS(theTurnaround, thePlan, theCrew)                                   do {                                                                                        const std::string testing_why_ =                                                              ::planning::chart::validate((theTurnaround), (thePlan), (theCrew));                   if (!testing_why_.empty())                                                                  ::testing::fail(__FILE__, __LINE__, "invalid job plan: " + testing_why_);             } while (0)

int main() { return ::testing::run(); }
