cmake_minimum_required(VERSION 3.21)
project(PlanningAlgorithms LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Debug CACHE STRING "" FORCE)
endif()

enable_testing()

# ---------------------------------------------------------------------------
# Warning flags, shared by every target in the project.
# ---------------------------------------------------------------------------
add_library(planning_warnings INTERFACE)
if(MSVC)
  target_compile_options(planning_warnings INTERFACE /W4 /permissive- /utf-8)
else()
  target_compile_options(planning_warnings INTERFACE -Wall -Wextra -Wpedantic)
endif()

# ---------------------------------------------------------------------------
# planning_core -- the given library: problem models, printing, test fixtures.
# You do not edit these while working the exercises.
# ---------------------------------------------------------------------------
add_library(planning_core STATIC
  src/core.cpp
  src/graphs.cpp
  src/grid.cpp
  src/strips.cpp
  src/planning_graph.cpp
  src/sat.cpp
  src/airport/geometry.cpp
  src/airport/zones.cpp
  src/airport/aircraft.cpp
  src/airport/graph.cpp
  src/airport/clearance.cpp
  src/airport/route.cpp
  src/airport/airport_map.cpp
)
target_include_directories(planning_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(planning_core PUBLIC planning_warnings)

# ---------------------------------------------------------------------------
# The chapter 2 units -- the algorithms, on a hand-sized airport.  Each name
# below has three files:
#
#   exercises/ch02/<unit>/<unit>.cpp   the stub you fill in
#   solutions/ch02/<unit>/<unit>.cpp   the reference implementation
#   tests/ch02/test_<unit>.cpp         the tests, compiled once against each
# ---------------------------------------------------------------------------
set(PLANNING_CH02_UNITS
  ex01_forward_search
  ex02_dijkstra
  ex03_astar
  ex04_iterative_deepening
  ex05_backward_bidirectional
  ex06_backward_value_iteration
  ex07_forward_value_iteration
  ex08_stationary_value_iteration
  ex09_strips_state_space
  ex10_planning_graph
  ex11_planning_as_sat
)

set(planning_exercise_sources "")
set(planning_solution_sources "")
foreach(unit IN LISTS PLANNING_CH02_UNITS)
  list(APPEND planning_exercise_sources "exercises/ch02/${unit}/${unit}.cpp")
  list(APPEND planning_solution_sources "solutions/ch02/${unit}/${unit}.cpp")
endforeach()

add_library(planning_ch02_yours STATIC ${planning_exercise_sources})
target_link_libraries(planning_ch02_yours PUBLIC planning_core)

add_library(planning_ch02_reference STATIC ${planning_solution_sources})
target_link_libraries(planning_ch02_reference PUBLIC planning_core)

# ---------------------------------------------------------------------------
# Tests.  Every unit gets two executables and two ctest entries:
#
#   ctest -L yours        runs your implementations   (this is the one you watch)
#   ctest -L reference    runs the reference solutions (should always be green)
# ---------------------------------------------------------------------------
foreach(unit IN LISTS PLANNING_CH02_UNITS)
  set(test_source "${CMAKE_CURRENT_SOURCE_DIR}/tests/ch02/test_${unit}.cpp")

  add_executable(test_${unit} ${test_source})
  target_include_directories(test_${unit} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests)
  target_link_libraries(test_${unit} PRIVATE planning_ch02_yours)
  add_test(NAME ch02.${unit} COMMAND test_${unit})
  set_tests_properties(ch02.${unit} PROPERTIES LABELS "yours" TIMEOUT 120)

  add_executable(test_${unit}_reference ${test_source})
  target_include_directories(test_${unit}_reference PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests)
  target_link_libraries(test_${unit}_reference PRIVATE planning_ch02_reference)
  add_test(NAME ch02.${unit}.reference COMMAND test_${unit}_reference)
  set_tests_properties(ch02.${unit}.reference PROPERTIES LABELS "reference" TIMEOUT 120)
endforeach()


# ---------------------------------------------------------------------------
# The capstone: airport surface movement planning.  Same three-file layout as
# chapter 2, twelve units this time, one per step of the design.
#
# src/airport/pipeline.cpp and src/airport/render.cpp are *given* and are
# compiled into both variants, so that the end-to-end planner and the demo
# always call whichever implementations are under test.
# ---------------------------------------------------------------------------
set(PLANNING_CAPSTONE_UNITS
  ex01_zone_layer
  ex02_gated_graph
  ex03_start_mode
  ex04_permissions
  ex05_graph_filter
  ex06_cost_to_go
  ex07_merge_candidates
  ex08_merge_ladder
  ex09_hybrid_astar
  ex10_swept_footprint
  ex11_route_assembly
  ex12_monitor_and_replan
)

set(planning_capstone_given_sources src/airport/pipeline.cpp src/airport/render.cpp)
set(planning_capstone_exercise_sources ${planning_capstone_given_sources})
set(planning_capstone_solution_sources ${planning_capstone_given_sources})
foreach(unit IN LISTS PLANNING_CAPSTONE_UNITS)
  list(APPEND planning_capstone_exercise_sources "exercises/capstone/${unit}/${unit}.cpp")
  list(APPEND planning_capstone_solution_sources "solutions/capstone/${unit}/${unit}.cpp")
endforeach()

add_library(planning_capstone_yours STATIC ${planning_capstone_exercise_sources})
target_link_libraries(planning_capstone_yours PUBLIC planning_core)

add_library(planning_capstone_reference STATIC ${planning_capstone_solution_sources})
target_link_libraries(planning_capstone_reference PUBLIC planning_core)

foreach(unit IN LISTS PLANNING_CAPSTONE_UNITS)
  set(test_source "${CMAKE_CURRENT_SOURCE_DIR}/tests/capstone/test_${unit}.cpp")

  add_executable(test_${unit} ${test_source})
  target_include_directories(test_${unit} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests)
  target_link_libraries(test_${unit} PRIVATE planning_capstone_yours)
  add_test(NAME capstone.${unit} COMMAND test_${unit})
  set_tests_properties(capstone.${unit} PROPERTIES LABELS "yours" TIMEOUT 300)

  add_executable(test_${unit}_reference ${test_source})
  target_include_directories(test_${unit}_reference PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/tests)
  target_link_libraries(test_${unit}_reference PRIVATE planning_capstone_reference)
  add_test(NAME capstone.${unit}.reference COMMAND test_${unit}_reference)
  set_tests_properties(capstone.${unit}.reference PROPERTIES LABELS "reference" TIMEOUT 300)
endforeach()

add_executable(taxi_demo tools/taxi_demo.cpp)
target_link_libraries(taxi_demo PRIVATE planning_capstone_yours)

add_executable(taxi_demo_reference tools/taxi_demo.cpp)
target_link_libraries(taxi_demo_reference PRIVATE planning_capstone_reference)

# ---------------------------------------------------------------------------
# Demos.  Same program, built against each variant:
#
#   surface_demo     every search method, on the same piece of airport
#   turnaround_demo  one ground task, described four ways
# ---------------------------------------------------------------------------
add_executable(surface_demo tools/surface_demo.cpp)
target_link_libraries(surface_demo PRIVATE planning_ch02_yours)

add_executable(surface_demo_reference tools/surface_demo.cpp)
target_link_libraries(surface_demo_reference PRIVATE planning_ch02_reference)

add_executable(turnaround_demo tools/turnaround_demo.cpp)
target_link_libraries(turnaround_demo PRIVATE planning_ch02_yours)

add_executable(turnaround_demo_reference tools/turnaround_demo.cpp)
target_link_libraries(turnaround_demo_reference PRIVATE planning_ch02_reference)

# `cmake --build . --target check` == run only your implementations.
add_custom_target(check
  COMMAND ${CMAKE_CTEST_COMMAND} -L yours --output-on-failure -C $<CONFIG>
  WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
  USES_TERMINAL
)
