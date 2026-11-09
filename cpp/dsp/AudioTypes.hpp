#pragma once
#include <array>
#include <cstddef>
#include <cstdint>

namespace struna {

constexpr std::size_t kDefaultRingBufferCapacity = 8192;
constexpr std::size_t kDefaultAnalysisWindowSize = 2048;
constexpr std::size_t kDefaultSpectrumBinCount = 64;
constexpr std::size_t kDefaultWaveformSnapshotSize = 128;

struct PitchFrame {
    float frequencyHz;
    float confidence;
    float rmsDb;
    bool isLocked;
};

struct SpectrumFrame {
    std::array<float, kDefaultSpectrumBinCount> magnitudes;
    std::array<float, kDefaultWaveformSnapshotSize> waveform;
};

}
