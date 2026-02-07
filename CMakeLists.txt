cmake_minimum_required(VERSION 3.11)
project(SyncOrSink VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# output to bin/
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# --- Dependencies ---
include(FetchContent)

# 1. raylib
FetchContent_Declare(
    raylib
    GIT_REPOSITORY https://github.com/raysan5/raylib.git
    GIT_TAG        4.5.0
)
set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_GAMES    OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(raylib)

# 2. libdatachannel
# Note: libdatachannel requires OpenSSL. On Windows, it might be tricky without pre-installed libs.
# We will try to let it build its dependencies if possible or rely on system.
# For a simple MVP, we might need to enable NO_WEBSOCKETS NO_MEDIA NO_TIER if not needed, 
# but we need DataChannels.
# Let's try standard fetch.
FetchContent_Declare(
    libdatachannel
    GIT_REPOSITORY https://github.com/paullouisageneau/libdatachannel.git
    GIT_TAG        v0.18.4
)
# Disable unnecessary parts to speed up build and reduce deps
set(NO_WEBSOCKET OFF CACHE BOOL "" FORCE) # Needed for ntfy.sh signaling
set(NO_MEDIA     ON CACHE BOOL "" FORCE) # We only need data channels for now
set(NO_EXAMPLES  ON CACHE BOOL "" FORCE)
set(NO_TESTS     ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(libdatachannel)

# 3. nlohmann_json
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG        v3.11.2
)
FetchContent_MakeAvailable(json)


# --- Sources ---
file(GLOB_RECURSE SOURCES "src/*.cpp" "src/*.c")

add_executable(SyncOrSink ${SOURCES})

# --- Linking ---
target_link_libraries(SyncOrSink PRIVATE raylib datachannel nlohmann_json::nlohmann_json winhttp)

# Copy assets to build directory (optional but good for debugging)
add_custom_command(TARGET SyncOrSink POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/assets
    $<TARGET_FILE_DIR:SyncOrSink>/assets
)
